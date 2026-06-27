import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getOrCreateWallet } from "@/lib/circle";
import { sendUsdcWithMemo } from "@/lib/arc";
import { getQuote, type Corridor } from "@/lib/fx";
import { saveTransaction, type RemittanceRecord } from "@/lib/store";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { senderRef, recipientRef, corridor, sendAed } = body as {
    senderRef: string;
    recipientRef: string;
    corridor: Corridor;
    sendAed: number;
  };

  if (!senderRef || !recipientRef || !corridor || !sendAed) {
    return NextResponse.json(
      { error: "senderRef, recipientRef, corridor, and sendAed are required" },
      { status: 400 }
    );
  }

  const quote = getQuote(corridor, sendAed);
  const reference = `RA-${new Date().getFullYear()}-${randomUUID().slice(0, 6).toUpperCase()}`;

  // 1. Resolve embedded wallets for sender + recipient via Circle Wallets.
  const senderWallet = await getOrCreateWallet(senderRef);
  const recipientWallet = await getOrCreateWallet(recipientRef);

  // 2. Settle USDC on Arc, attaching the reference as a structured memo so
  //    the transfer is independently reconcilable onchain later.
  const memoNote = `corridor:${corridor};cashout:${quote.corridor.cashOutMethod};ref:${reference}`;
  const settlement = await sendUsdcWithMemo({
    recipient: recipientWallet.address as `0x${string}`,
    amountUsdc: quote.usdcAmount.toFixed(6),
    reference,
    note: memoNote,
  });

  const record: RemittanceRecord = {
    reference,
    createdAt: new Date().toISOString(),
    senderRef,
    recipientRef,
    corridor,
    sendAed: quote.sendAed,
    usdcAmount: quote.usdcAmount,
    recipientLocalAmount: quote.recipientLocalAmount,
    recipientCurrency: quote.corridor.currency,
    cashOutMethod: quote.corridor.cashOutMethod,
    status: "settled",
    txHash: settlement.txHash,
    explorerUrl: settlement.explorerUrl,
    memoId: settlement.memoId,
  };

  await saveTransaction(record);

  return NextResponse.json({ record, quote, senderWallet, recipientWallet });
}
