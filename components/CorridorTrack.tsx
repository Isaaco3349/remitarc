"use client";

interface CorridorTrackProps {
  steps: { label: string; active: boolean }[];
}

export default function CorridorTrack({ steps }: CorridorTrackProps) {
  return (
    <div className="corridor-track flex items-center justify-between py-6">
      {steps.map((step, i) => (
        <div key={i} className="checkpoint flex flex-col items-center gap-2 w-1/4">
          <div className={`checkpoint-dot ${step.active ? "active" : ""}`} />
          <span
            className={`text-xs text-center ${
              step.active ? "text-gold" : "text-sandlight/40"
            }`}
          >
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}
