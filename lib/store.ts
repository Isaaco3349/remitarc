import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

export interface RemittanceRecord {
  reference: string;
  createdAt: string;
  senderRef: string;
  recipientRef: string;
  corridor: string;
  sendAed: number;
  usdcAmount: number;
  recipientLocalAmount: number;
  recipientCurrency: string;
  cashOutMethod: string;
  status: "settled" | "pending" | "failed";
  txHash: string;
  explorerUrl: string;
  memoId: string;
}

const DATA_DIR = join(process.cwd(), ".data");
const DB_FILE = join(DATA_DIR, "transactions.json");

async function readAll(): Promise<RemittanceRecord[]> {
  try {
    const raw = await readFile(DB_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveTransaction(record: RemittanceRecord): Promise<void> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const existing = await readAll();
    existing.unshift(record);
    await writeFile(DB_FILE, JSON.stringify(existing, null, 2));
  } catch {
    // Vercel read-only filesystem — skip persistence, settlement already happened onchain.
    console.warn("Could not persist transaction record to disk (expected on Vercel).");
  }
}

export async function getTransactions(): Promise<RemittanceRecord[]> {
  try {
    return await readAll();
  } catch {
    return [];
  }
}

export async function getByReference(reference: string): Promise<RemittanceRecord | null> {
  try {
    const all = await readAll();
    return all.find((r) => r.reference === reference) ?? null;
  } catch {
    return null;
  }
}