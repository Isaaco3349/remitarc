import { promises as fs } from "fs";
import path from "path";

/**
 * Minimal JSON-file-backed store so the hackathon demo has persistent
 * transaction history without standing up a database. Swap for Postgres /
 * Supabase / etc. post-hackathon — the interface below is the seam.
 */

export interface RemittanceRecord {
  reference: string; // e.g. "RA-2026-000123" — also the Arc memo source
  createdAt: string;
  senderRef: string; // email/phone used to derive sender's Circle wallet
  recipientRef: string;
  corridor: string;
  sendAed: number;
  usdcAmount: number;
  recipientLocalAmount: number;
  recipientCurrency: string;
  cashOutMethod: string;
  status: "pending" | "settled" | "cashed_out" | "failed";
  txHash?: string;
  explorerUrl?: string;
  memoId?: string;
}

const DATA_FILE = path.join(process.cwd(), ".data", "transactions.json");

async function ensureFile() {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf-8");
  }
}

export async function listTransactions(): Promise<RemittanceRecord[]> {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  return JSON.parse(raw) as RemittanceRecord[];
}

export async function saveTransaction(record: RemittanceRecord): Promise<void> {
  await ensureFile();
  const all = await listTransactions();
  all.unshift(record);
  await fs.writeFile(DATA_FILE, JSON.stringify(all, null, 2), "utf-8");
}

export async function getTransactionByReference(
  reference: string
): Promise<RemittanceRecord | undefined> {
  const all = await listTransactions();
  return all.find((t) => t.reference === reference);
}

export async function updateTransactionStatus(
  reference: string,
  status: RemittanceRecord["status"]
): Promise<void> {
  const all = await listTransactions();
  const idx = all.findIndex((t) => t.reference === reference);
  if (idx >= 0) {
    all[idx].status = status;
    await fs.writeFile(DATA_FILE, JSON.stringify(all, null, 2), "utf-8");
  }
}
