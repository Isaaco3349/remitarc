"use client";

import { useState } from "react";
import Link from "next/link";
import CorridorTrack from "@/components/CorridorTrack";

const CORRIDOR_OPTIONS = [
  { code: "KE", label: "🇰🇪 Kenya — M-Pesa" },
  { code: "NG", label: "🇳🇬 Nigeria — MTN MoMo / Bank" },
  { code: "GH", label: "🇬🇭 Ghana — MTN MoMo" },
  { code: "CM", label: "🇨🇲 Cameroon — Orange Money / MTN MoMo" },
  { code: "EG", label: "🇪🇬 Egypt — Fawry / Bank" },
];

type Quote = {
  corridor: { country: string; currency: string; flag: string; cashOutMethod: string };
  sendAed: number;
  usdcAmount: number;
  recipientLocalAmount: number;
  traditionalFeeAed: number;
  savingsUsdEquivalent: number;
  remitArcSpeedSeconds: number;
  traditionalSpeedHours: number;
};

export default function Home() {
  const [corridor, setCorridor] = useState("KE");
  const [sendAed, setSendAed] = useState(10);
  const [senderRef, setSenderRef] = useState("amara@example.com");
  const [recipientRef, setRecipientRef] = useState("mother.amara@example.com");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [step, setStep] = useState(0); // 0=form,1=quoted,2=settling,3=done

  async function fetchQuote() {
    setLoadingQuote(true);
    const res = await fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ corridor, sendAed }),
    });
    const data = await res.json();
    setQuote(data.quote);
    setStep(1);
    setLoadingQuote(false);
  }

  async function confirmSend() {
    setSending(true);
    setStep(2);
    const res = await fetch("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senderRef, recipientRef, corridor, sendAed }),
    });
    const data = await res.json();
    setResult(data);
    setStep(3);
    setSending(false);
  }

  const steps = [
    { label: "AED debited", active: step >= 1 },
    { label: "USDC settled on Arc", active: step >= 2 },
    { label: "Memo recorded", active: step >= 2 },
    { label: quote ? quote.corridor.cashOutMethod : "Cash-out", active: step >= 3 },
  ];

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-6 py-12">
      <header className="flex items-center justify-between mb-10">
        <div>
          <p className="text-xs tracking-[0.2em] text-gold uppercase mb-1">
            UAE → Africa Corridor
          </p>
          <h1 className="font-display italic text-4xl text-sandlight">RemitArc</h1>
        </div>
        <nav className="flex gap-4 text-sm text-sandlight/60">
          <Link href="/dashboard" className="hover:text-gold focus-ring">
            History
          </Link>
        </nav>
      </header>

      <p className="text-sandlight/70 mb-8 leading-relaxed">
        Send money home — settled onchain in seconds, not days. Every transfer
        carries a structured Arc memo, so it can be reconciled with a
        reference number alone, no statements required.
      </p>

      <CorridorTrack steps={steps} />

      {step <= 1 && (
        <section className="bg-inkdeep/60 border border-sandlight/10 rounded-2xl p-6 space-y-5">
          <div>
            <label className="text-xs uppercase tracking-wide text-sandlight/50">
              Send to
            </label>
            <select
              value={corridor}
              onChange={(e) => setCorridor(e.target.value)}
              className="w-full mt-1 bg-ink border border-sandlight/15 rounded-lg px-3 py-2 focus-ring"
            >
              {CORRIDOR_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-sandlight/50">
              Amount (AED)
            </label>
            <input
              type="number"
              value={sendAed}
              onChange={(e) => setSendAed(Number(e.target.value))}
              className="w-full mt-1 bg-ink border border-sandlight/15 rounded-lg px-3 py-2 focus-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-sandlight/50">
                Your email
              </label>
              <input
                value={senderRef}
                onChange={(e) => setSenderRef(e.target.value)}
                className="w-full mt-1 bg-ink border border-sandlight/15 rounded-lg px-3 py-2 focus-ring text-sm"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-sandlight/50">
                Recipient email
              </label>
              <input
                value={recipientRef}
                onChange={(e) => setRecipientRef(e.target.value)}
                className="w-full mt-1 bg-ink border border-sandlight/15 rounded-lg px-3 py-2 focus-ring text-sm"
              />
            </div>
          </div>

          <button
            onClick={fetchQuote}
            disabled={loadingQuote}
            className="w-full bg-gold text-ink font-medium rounded-lg py-3 hover:bg-gold/90 transition focus-ring disabled:opacity-60"
          >
            {loadingQuote ? "Getting quote…" : "Get quote"}
          </button>

          {quote && (
            <div className="mt-2 border-t border-sandlight/10 pt-4 space-y-2 text-sm">
              <Row label="They receive" value={`${quote.recipientLocalAmount.toFixed(0)} ${quote.corridor.currency}`} highlight />
              <Row label="Settlement time" value="~6 seconds on Arc" />
              <Row label="RemitArc fee" value="0.50 USDC flat" />
              <Row
                label={`Typical ${quote.corridor.cashOutMethod} transfer fee`}
                value={`${quote.traditionalFeeAed.toFixed(0)} AED · ${quote.traditionalSpeedHours}h`}
                muted
              />
              <Row
                label="You save"
                value={`≈ $${quote.savingsUsdEquivalent.toFixed(2)} & ${quote.traditionalSpeedHours}h`}
                highlight
              />

              <button
                onClick={confirmSend}
                disabled={sending}
                className="w-full mt-4 bg-terracotta text-sandlight font-medium rounded-lg py-3 hover:bg-terracotta/90 transition focus-ring disabled:opacity-60"
              >
                {sending ? "Settling on Arc…" : "Confirm & send"}
              </button>
            </div>
          )}
        </section>
      )}

      {step === 3 && result && (
        <section className="bg-inkdeep/60 border border-gold/30 rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-2xl text-gold">Transfer settled</h2>
          <p className="text-sandlight/70 text-sm">
            Reference <span className="memo-stamp text-gold">{result.record.reference}</span> is
            now recorded onchain with a structured memo — anyone can look it
            up later without needing RemitArc's database.
          </p>
          <div className="space-y-2 text-sm">
            <Row label="Reference" value={result.record.reference} mono />
            <Row label="Tx hash" value={result.record.txHash} mono />
            <Row label="Memo ID" value={result.record.memoId} mono />
          </div>
          <a
            href={`/receive/${result.record.reference}`}
            className="inline-block mt-3 text-gold underline text-sm focus-ring"
          >
            View recipient receipt →
          </a>
        </section>
      )}
    </main>
  );
}

function Row({
  label,
  value,
  highlight,
  muted,
  mono,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-baseline">
      <span className={`text-sandlight/60 ${muted ? "text-xs" : ""}`}>{label}</span>
      <span
        className={`${highlight ? "text-gold font-medium" : "text-sandlight"} ${
          mono ? "font-mono text-xs break-all max-w-[60%] text-right" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
