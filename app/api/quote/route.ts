import { NextRequest, NextResponse } from "next/server";
import { getQuote, type Corridor } from "@/lib/fx";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { corridor, sendAed } = body as { corridor: Corridor; sendAed: number };

  if (!corridor || !sendAed || sendAed <= 0) {
    return NextResponse.json(
      { error: "corridor and a positive sendAed amount are required" },
      { status: 400 }
    );
  }

  const quote = getQuote(corridor, sendAed);
  return NextResponse.json({ quote });
}
