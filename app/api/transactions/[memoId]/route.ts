import { NextRequest, NextResponse } from "next/server";
import { getTransactionByReference } from "@/lib/store";

export async function GET(
  req: NextRequest,
  { params }: { params: { memoId: string } }
) {
  const reference = params.memoId; // route param doubles as the human reference

  const record = await getTransactionByReference(reference);
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Onchain memo-event lookup removed — we no longer route transfers through
  // Arc's Memo contract (see lib/arc.ts for why). Reconciliation now relies
  // solely on our own database record, keyed by reference.
  return NextResponse.json({ record, onchainLogs: [] });
}