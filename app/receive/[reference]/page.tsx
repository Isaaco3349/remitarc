"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function ReceivePage() {
  const params = useParams();
  const reference = params?.reference as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reference) return;
    fetch(`/api/transactions/${reference}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [reference]);

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center text-sandlight/60">Loading receipt…</main>;
  }

  if (!data?.record) {
    return (
      <main className="min-h-screen flex items-center justify-center text-sandlight/60">
        No transfer found for reference {reference}.
      </main>
    );
  }

  const { record } = data;

  return (
    <main className="min-h-screen max-w-md mx-auto px-6 py-16">
      <div className="text-center mb-8">
        <p className="text-xs tracking-[0.2em] text-gold uppercase mb-2">Money received</p>
        <h1 className="font-display italic text-5xl text-sandlight mb-1">
          {record.recipientLocalAmount.toFixed(0)}
        </h1>
        <p className="text-sandlight/60">{record.recipientCurrency} via {record.cashOutMethod}</p>
      </div>

      <div className="bg-inkdeep/60 border border-sandlight/10 rounded-2xl p-6 space-y-3 text-sm">
        <Row label="From" value={record.senderRef} />
        <Row label="Reference" value={record.reference} mono />
        <Row label="Status" value={record.status} highlight />
        <Row label="Settled" value={new Date(record.createdAt).toLocaleString()} />
        <Row label="Memo ID" value={record.memoId} mono />
        {record.txHash && <Row label="Tx hash" value={record.txHash} mono />}
      </div>

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
