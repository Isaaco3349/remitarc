import { NextRequest, NextResponse } from "next/server";
import { getByReference } from "@/lib/store";

export async function GET(
  req: NextRequest,
  { params }: { params: { memoId: string } }
) {
  const record = await getByReference(params.memoId);
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ record });
}