"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Dashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/transactions")
      .then((r) => r.json())
      .then((d) => setTransactions(d.transactions ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display italic text-3xl text-sandlight">Transfer history</h1>
        <Link href="/" className="text-gold text-sm underline focus-ring">
          New transfer
        </Link>
      </div>

      {loading && <p className="text-sandlight/50">Loading…</p>}

      {!loading && transactions.length === 0 && (
        <p className="text-sandlight/50">No transfers yet. Send your first one.</p>
      )}

      <div className="space-y-3">
        {transactions.map((t) => (
          <Link
            key={t.reference}
            href={`/receive/${t.reference}`}
            className="block bg-inkdeep/60 border border-sandlight/10 rounded-xl px-5 py-4 hover:border-gold/40 transition focus-ring"
          >
            <div className="flex justify-between items-baseline mb-1">
              <span className="font-mono text-xs text-gold">{t.reference}</span>
              <span className="text-xs uppercase text-sandlight/40">{t.status}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sandlight/70 text-sm">
                {t.sendAed.toFixed(0)} AED → {t.recipientLocalAmount.toFixed(0)} {t.recipientCurrency}
              </span>
              <span className="text-sandlight/40 text-xs">
                {new Date(t.createdAt).toLocaleDateString()}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
