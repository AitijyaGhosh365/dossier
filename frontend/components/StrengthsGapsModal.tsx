"use client";

import { useEffect } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  strengths: string[];
  gaps: string[];
};

export function StrengthsGapsModal({ open, onClose, strengths, gaps }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sg-modal-title"
      className="fixed inset-0 z-50 grid place-items-center px-4 py-8 bg-slate-900/30 backdrop-blur-sm fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card border border-slate-200 w-full max-w-[920px] max-h-[88dvh] overflow-hidden flex flex-col"
        style={{ animation: "fadeUp 0.32s cubic-bezier(0.2,0.7,0.2,1) both" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div>
            <div className="smallcaps text-[10px] text-blue-600 mb-0.5">
              Tool · Strengths & Gaps
            </div>
            <h2
              id="sg-modal-title"
              className="text-[1.15rem] font-bold text-blue-900 tracking-tight"
            >
              Reviewer&apos;s shortlist
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="size-8 grid place-items-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="size-4" strokeWidth={2.25} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 overflow-y-auto">
          <Pane
            tone="strength"
            title="Strengths"
            count={strengths.length}
            items={strengths}
            emptyLabel="No strengths surfaced for this candidate."
          />
          <Pane
            tone="gap"
            title="Gaps"
            count={gaps.length}
            items={gaps}
            emptyLabel="No notable gaps surfaced."
          />
        </div>
      </div>
    </div>
  );
}

function Pane({
  tone,
  title,
  count,
  items,
  emptyLabel,
}: {
  tone: "strength" | "gap";
  title: string;
  count: number;
  items: string[];
  emptyLabel: string;
}) {
  const isStrength = tone === "strength";
  return (
    <div
      className={cn(
        "p-6 sm:p-7 fade-up",
        isStrength
          ? "bg-emerald-50 md:border-r border-emerald-200"
          : "bg-rose-50",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 mb-5",
          isStrength ? "text-emerald-700" : "text-rose-700",
        )}
      >
        <span
          className={cn(
            "grid place-items-center size-6 rounded-full text-white",
            isStrength ? "bg-emerald-600" : "bg-rose-600",
          )}
        >
          {isStrength ? (
            <Check className="size-3.5" strokeWidth={3} />
          ) : (
            <X className="size-3.5" strokeWidth={3} />
          )}
        </span>
        <h3 className="smallcaps text-[11px] font-semibold">{title}</h3>
        <span className="font-mono text-[10px] text-slate-400 tabular-nums">
          {String(count).padStart(2, "0")}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-[12.5px] italic text-slate-500">{emptyLabel}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((s, i) => (
            <li
              key={i}
              className="grid grid-cols-[14px_1fr] gap-2.5 items-start text-[13px] leading-[1.55] text-slate-700"
            >
              <span
                className={cn(
                  "size-2 rounded-full mt-1.5",
                  isStrength ? "bg-emerald-600" : "bg-rose-600",
                )}
              />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
