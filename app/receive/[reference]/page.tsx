"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

export default function ReceivePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const reference = params?.reference as string;

  // Read data from URL params first (passed from send result — no DB needed)
  const txHash = searchParams.get("txHash");
  const memoId = searchParams.get("memoId");
  const amount = searchParams.get("amount");
  const currency = searchParams.get("currency");
  const cashOut = searchParams.get("cashOut");
  const from = searchParams.get("from");
  const status = searchParams.get("status");
  const createdAt = searchParams.get("createdAt");

  const hasUrlData = txHash && memoId && amount && currency;

  const [dbRecord, setDbRecord] = useState<any>(null);
  const [loading, setLoading] = useState(!hasUrlData);

  useEffect(() => {
    // Only hit the API if we don't have URL data (e.g. direct link share)
    if (hasUrlData || !reference) return;
    fetch(`/api/transactions/${reference}`)
      .then((r) => r.json())
      .then((d) => setDbRecord(d?.record ?? null))
      .finally(() => setLoading(false));
  }, [reference, hasUrlData]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-sandlight/60">
        Loading receipt…
      </main>
    );
  }

  // Build record from URL params or DB fallback
  const record = hasUrlData
    ? {
        reference,
        txHash,
        memoId,
        recipientLocalAmount: Number(amount),
        recipientCurrency: currency,
        cashOutMethod: cashOut ?? "Mobile money",
        senderRef: from ?? "Sender",
        status: status ?? "settled",
        createdAt: createdAt ?? new Date().toISOString(),
      }
    : dbRecord;

  if (!record) {
    return (
      <main className="min-h-screen flex items-center justify-center text-sandlight/60">
        No transfer found for reference {reference}.
      </main>
    );
  }

  const explorerUrl = `https://testnet.arcscan.app/tx/${record.txHash}`;

  return (
    <main className="min-h-screen max-w-md mx-auto px-6 py-16">
      <div className="text-center mb-8">
        <p className="text-xs tracking-[0.2em] text-gold uppercase mb-2">
          Money received
        </p>
        <h1 className="font-display italic text-5xl text-sandlight mb-1">
          {Number(record.recipientLocalAmount).toFixed(0)}
        </h1>
        <p className="text-sandlight/60">
          {record.recipientCurrency} via {record.cashOutMethod}
        </p>
      </div>

      <div className="bg-inkdeep/60 border border-sandlight/10 rounded-2xl p-6 space-y-3 text-sm">
        <Row label="From" value={record.senderRef} />
        <Row label="Reference" value={record.reference} mono />
        <Row label="Status" value={record.status} highlight />
        <Row
          label="Settled"
          value={new Date(record.createdAt).toLocaleString()}
        />
        <Row label="Memo ID" value={record.memoId} mono />
        {record.txHash && <Row label="Tx hash" value={record.txHash} mono />}
      </div>

      
      href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center mt-4 text-gold text-sm underline"
      >
        {"Verify on Arc explorer →"}
      </a>

      <p className="text-xs text-sandlight/40 mt-6 text-center leading-relaxed">
        This receipt is independently verifiable: the reference number above
        resolves to a structured memo recorded directly on Arc, so it can be
        reconciled without trusting RemitArc's records.
      </p>
    </main>
  );
}

function Row({
  label,
  value,
  highlight,
  mono,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-baseline gap-3">
      <span className="text-sandlight/50">{label}</span>
      <span
        className={`${highlight ? "text-gold" : "text-sandlight"} ${
          mono ? "font-mono text-xs break-all text-right" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}