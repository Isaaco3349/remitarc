import { NextRequest, NextResponse } from "next/server";
import { getOrCreateWallet, isCircleLive } from "@/lib/circle";

export async function POST(req: NextRequest) {
  const { userRef } = await req.json();

  if (!userRef) {
    return NextResponse.json({ error: "userRef is required" }, { status: 400 });
  }

  const wallet = await getOrCreateWallet(userRef);
  return NextResponse.json({ wallet, live: isCircleLive() });
}
