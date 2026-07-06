import { NextResponse } from "next/server";
import { getTransactions } from "@/lib/store";

export async function GET() {
  const records = await getTransactions();
  return NextResponse.json({ records });
}