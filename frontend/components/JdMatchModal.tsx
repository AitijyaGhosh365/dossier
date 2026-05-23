"use client";

import { useEffect, useState } from "react";
import { Briefcase, Check, Loader2, Minus, Sparkles, X } from "lucide-react";
import { matchAgainstJd } from "@/lib/api";
import { cn, confidenceColor } from "@/lib/utils";
import type { JdMatchResult } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  sessionId: string | null;
};

export function JdMatchModal({ open, onClose, sessionId }: Props) {
  const [jd, setJd] = useState("");
  const [result, setResult] = useState<JdMatchResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function analyze() {
    if (!sessionId || busy) return;
    if (jd.trim().length < 30) {
      setError("Paste the full job description (at least 30 characters).");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await matchAgainstJd(sessionId, jd.trim());
      setResult(res.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Match failed.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setResult(null);
    setJd("");
    setError(null);
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="jd-modal-title"
      className="fixed inset-0 z-50 grid place-items-center px-4 py-8 bg-slate-900/30 backdrop-blur-sm fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card border border-slate-200 w-full max-w-[840px] max-h-[88dvh] overflow-hidden flex flex-col"
        style={{ animation: "fadeUp 0.32s cubic-bezier(0.2,0.7,0.2,1) both" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-blue-50 text-blue-600 grid place-items-center">
              <Briefcase className="size-4" strokeWidth={2.25} />
            </div>
            <div>
              <div className="smallcaps text-[10px] text-blue-600 mb-0.5">
                Tool · JD Match
              </div>
              <h2
                id="jd-modal-title"
                className="text-[1.05rem] font-bold text-blue-900 tracking-tight"
              >
                Match against a role
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {result && (
              <button
                type="button"
                onClick={reset}
                className="text-[11px] px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors smallcaps"
              >
                New JD
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="size-8 grid place-items-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <X className="size-4" strokeWidth={2.25} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {!result ? (
            <div className="px-5 py-5 space-y-3">
              <label className="smallcaps text-[10px] text-slate-500">
                Paste the job description
              </label>
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the full JD here — title, responsibilities, required and nice-to-have skills, seniority, anything provided…"
                rows={12}
                disabled={busy}
                className={cn(
                  "w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5",
                  "text-[13.5px] text-slate-900 placeholder:text-slate-400",
                  "focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.12)]",
                  "transition-all min-h-[200px] disabled:opacity-60",
                )}
              />
              {error && (
                <div className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-1.5">
                  {error}
                </div>
              )}
              <button
                type="button"
                onClick={() => void analyze()}
                disabled={busy || !sessionId || jd.trim().length < 30}
                className={cn(
                  "w-full inline-flex items-center justify-center gap-2 px-4 py-2.5",
                  "rounded-lg text-[13.5px] font-semibold transition-all",
                  "bg-blue-500 text-white hover:bg-blue-600",
                  "shadow-[0_8px_22px_-10px_rgba(59,130,246,0.45)]",
                  "hover:shadow-[0_10px_28px_-10px_rgba(59,130,246,0.55)]",
                  "disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none",
                )}
              >
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Analyzing fit…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" strokeWidth={2.25} />
                    Analyze fit
                  </>
                )}
              </button>
            </div>
          ) : (
            <Result result={result} />
          )}
        </div>
      </div>
    </div>
  );
}

function Result({ result }: { result: JdMatchResult }) {
  const c = confidenceColor(result.overall_fit / 100);
  return (
    <div className="p-5 sm:p-6 space-y-6">
      {/* Score banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 flex items-center gap-5">
        <div
          className="shrink-0 size-20 rounded-2xl grid place-items-center font-mono font-bold tabular-nums text-[1.8rem]"
          style={{ backgroundColor: c.track, color: c.text }}
        >
          {result.overall_fit}
        </div>
        <div className="flex-1 min-w-0">
          <div className="smallcaps text-[10px] text-slate-500 mb-1">
            Overall fit
          </div>
          <p className="text-[14px] leading-[1.6] text-slate-700">
            {result.fit_summary}
          </p>
          <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: c.track }}>
            <div
              className="h-full transition-[width] duration-700"
              style={{ width: `${result.overall_fit}%`, backgroundColor: c.fill }}
            />
          </div>
        </div>
      </div>

      {/* Skill grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkillList
          tone="match"
          icon={<Check className="size-3" strokeWidth={3} />}
          title="Matched"
          items={result.matched_skills}
          emptyLabel="No required skills matched."
        />
        <SkillList
          tone="miss"
          icon={<Minus className="size-3" strokeWidth={3} />}
          title="Missing"
          items={result.missing_skills}
          emptyLabel="No required skills missing."
        />
      </div>

      {/* Experience */}
      <Block label="Experience assessment">
        <p className="text-[13.5px] leading-[1.65] text-slate-700">
          {result.experience_assessment}
        </p>
      </Block>

      {/* Strengths + concerns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BulletBlock
          tone="strength"
          label="Strengths for this role"
          items={result.key_strengths}
        />
        <BulletBlock
          tone="concern"
          label="Concerns for this role"
          items={result.key_concerns}
        />
      </div>
    </div>
  );
}

function Block({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="smallcaps text-[10.5px] text-blue-600 mb-2">{label}</div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {children}
      </div>
    </div>
  );
}

function SkillList({
  tone,
  icon,
  title,
  items,
  emptyLabel,
}: {
  tone: "match" | "miss";
  icon: React.ReactNode;
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  const isMatch = tone === "match";
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        isMatch
          ? "bg-emerald-50 border-emerald-200"
          : "bg-rose-50 border-rose-200",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 mb-3",
          isMatch ? "text-emerald-700" : "text-rose-700",
        )}
      >
        <span
          className={cn(
            "grid place-items-center size-5 rounded-full text-white",
            isMatch ? "bg-emerald-600" : "bg-rose-600",
          )}
        >
          {icon}
        </span>
        <span className="smallcaps text-[10.5px] font-semibold">
          {title} <span className="text-slate-400 font-mono">· {items.length}</span>
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-[12.5px] italic text-slate-500">{emptyLabel}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((s, i) => (
            <span
              key={`${s}-${i}`}
              className={cn(
                "text-[12.5px] px-2 py-0.5 rounded-md border bg-white",
                isMatch
                  ? "border-emerald-200 text-emerald-800"
                  : "border-rose-200 text-rose-800",
              )}
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function BulletBlock({
  tone,
  label,
  items,
}: {
  tone: "strength" | "concern";
  label: string;
  items: string[];
}) {
  const isStrength = tone === "strength";
  return (
    <div>
      <div className="smallcaps text-[10.5px] text-blue-600 mb-2">{label}</div>
      <div
        className={cn(
          "rounded-xl border p-4",
          isStrength
            ? "bg-emerald-50 border-emerald-200"
            : "bg-rose-50 border-rose-200",
        )}
      >
        {items.length === 0 ? (
          <p className="text-[12.5px] italic text-slate-500">None noted.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((s, i) => (
              <li
                key={i}
                className="grid grid-cols-[10px_1fr] gap-2 items-start text-[12.5px] leading-[1.55] text-slate-700"
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full mt-[7px]",
                    isStrength ? "bg-emerald-600" : "bg-rose-600",
                  )}
                />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
