import { NextRequest, NextResponse } from "next/server";
import { getTransactionByReference, listTransactions } from "@/lib/store";
import { lookupByReference } from "@/lib/arc";

export async function GET(
  req: NextRequest,
  { params }: { params: { memoId: string } }
) {
  const reference = params.memoId; // route param doubles as the human reference

  const record = await getTransactionByReference(reference);
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let onchainLogs: unknown[] = [];
  try {
    onchainLogs = await lookupByReference(reference);
  } catch {
    // Onchain lookup is best-effort in simulation mode (no RPC configured).
    onchainLogs = [];
  }

  return NextResponse.json({ record, onchainLogs });
}
