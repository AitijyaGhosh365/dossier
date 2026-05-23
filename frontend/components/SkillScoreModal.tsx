"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Sparkles, Target, Trash2, X } from "lucide-react";
import { scoreSkills as scoreSkillsApi } from "@/lib/api";
import { cn, confidenceColor } from "@/lib/utils";
import type { SkillScore } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  sessionId: string | null;
  scores: SkillScore[];
  onUpsert: (items: SkillScore[]) => void;
  onRemove: (skill: string) => void;
  onClear: () => void;
};

export function SkillScoreModal({
  open,
  onClose,
  sessionId,
  scores,
  onUpsert,
  onRemove,
  onClear,
}: Props) {
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<string[]>([]);
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

  const average = useMemo(() => {
    if (scores.length === 0) return 0;
    return scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
  }, [scores]);

  const averagePct = Math.round(average * 10);
  const c = confidenceColor(average / 10);

  function addPending() {
    const skill = input.trim();
    if (!skill) return;
    const lower = skill.toLowerCase();
    if (pending.some((p) => p.toLowerCase() === lower)) {
      setError(`"${skill}" is already in the pending list.`);
      return;
    }
    setError(null);
    setPending((prev) => [...prev, skill]);
    setInput("");
  }

  function removePending(skill: string) {
    const lower = skill.toLowerCase();
    setPending((prev) => prev.filter((p) => p.toLowerCase() !== lower));
  }

  async function scoreAll() {
    if (pending.length === 0 || busy || !sessionId) return;
    setError(null);
    setBusy(true);
    try {
      const res = await scoreSkillsApi(sessionId, pending);
      onUpsert(res.scores);
      setPending([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scoring failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ss-modal-title"
      className="fixed inset-0 z-50 grid place-items-center px-4 py-8 bg-slate-900/30 backdrop-blur-sm fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card border border-slate-200 w-full max-w-[680px] max-h-[88dvh] overflow-hidden flex flex-col"
        style={{ animation: "fadeUp 0.32s cubic-bezier(0.2,0.7,0.2,1) both" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-blue-50 text-blue-600 grid place-items-center">
              <Target className="size-4" strokeWidth={2.25} />
            </div>
            <div>
              <div className="smallcaps text-[10px] text-blue-600 mb-0.5">
                Tool · Skill Score
              </div>
              <h2
                id="ss-modal-title"
                className="text-[1.05rem] font-bold text-blue-900 tracking-tight"
              >
                Score the candidate{" "}
                <span className="font-mono text-slate-400 text-[0.9rem]">
                  · {scores.length}
                </span>
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {scores.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                title="Remove all skills"
                className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="size-3" />
                <span className="smallcaps text-[10px]">Clear</span>
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

        {/* Add skill input + pending chips */}
        <div className="px-5 py-4 border-b border-slate-100 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addPending();
            }}
            className="flex items-center gap-2"
          >
            <div className="flex-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 focus-within:border-blue-500 focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.12)] transition-all">
              <Plus className="size-3.5 text-slate-400" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Add a skill (e.g. React, Kubernetes, Rust)"
                disabled={busy || !sessionId}
                className="flex-1 bg-transparent text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className={cn(
                "px-3 py-2 rounded-lg text-[12.5px] font-semibold transition-all",
                "bg-white text-slate-700 border border-slate-200 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              Add
            </button>
          </form>

          {pending.length > 0 && (
            <div className="flex flex-wrap gap-1.5 fade-in">
              {pending.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 text-[12.5px] pl-2.5 pr-1 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removePending(skill)}
                    disabled={busy}
                    aria-label={`Remove ${skill}`}
                    className="size-4 grid place-items-center rounded text-blue-500 hover:text-blue-900 hover:bg-white transition-colors disabled:opacity-50"
                  >
                    <X className="size-3" strokeWidth={2.5} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {pending.length > 0 && (
            <button
              type="button"
              onClick={() => void scoreAll()}
              disabled={busy || !sessionId}
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
                  Scoring {pending.length} skill
                  {pending.length === 1 ? "" : "s"}…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" strokeWidth={2.25} />
                  Update score · {pending.length} skill
                  {pending.length === 1 ? "" : "s"}
                </>
              )}
            </button>
          )}

          {error && (
            <div className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-1.5">
              {error}
            </div>
          )}
        </div>

        {/* Score list */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {scores.length === 0 ? (
            <EmptyState hasPending={pending.length > 0} />
          ) : (
            <ul className="space-y-2">
              {scores.map((s) => (
                <SkillRow
                  key={s.skill}
                  item={s}
                  onRemove={() => onRemove(s.skill)}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Average footer */}
        {scores.length > 0 && (
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="smallcaps text-[10px] text-slate-500 mb-0.5">
                  Average score
                </div>
                <div className="text-[12.5px] text-slate-600">
                  Across {scores.length} skill
                  {scores.length === 1 ? "" : "s"}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="text-[2.4rem] font-extrabold font-mono tabular-nums leading-none"
                  style={{ color: c.text }}
                >
                  {averagePct}
                  <span className="text-[1rem] text-slate-400 font-normal">
                    %
                  </span>
                </div>
                <div className="w-24">
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: c.track }}
                  >
                    <div
                      className="h-full transition-[width] duration-700"
                      style={{ width: `${averagePct}%`, backgroundColor: c.fill }}
                    />
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-slate-400 text-right">
                    {average.toFixed(1)} / 10
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SkillRow({
  item,
  onRemove,
}: {
  item: SkillScore;
  onRemove: () => void;
}) {
  const c = confidenceColor(item.score / 10);
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3 transition-shadow hover:shadow-[0_8px_18px_-14px_rgba(15,20,34,0.18)] fade-up group">
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 grid place-items-center size-9 rounded-lg font-mono font-bold text-[13px] tabular-nums"
          style={{ backgroundColor: c.track, color: c.text }}
        >
          {item.score}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-semibold text-slate-900">
            {item.skill}
          </div>
          <p className="mt-0.5 text-[12px] leading-[1.5] text-slate-500">
            {item.reasoning}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${item.skill}`}
          className="shrink-0 size-7 grid place-items-center rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
        >
          <X className="size-3.5" strokeWidth={2.25} />
        </button>
      </div>
      <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ backgroundColor: c.track }}>
        <div
          className="h-full transition-[width] duration-700"
          style={{ width: `${item.score * 10}%`, backgroundColor: c.fill }}
        />
      </div>
    </li>
  );
}

function EmptyState({ hasPending }: { hasPending: boolean }) {
  return (
    <div className="text-center py-10">
      <div className="size-12 rounded-2xl bg-blue-50 text-blue-600 grid place-items-center mx-auto mb-3">
        <Target className="size-5" />
      </div>
      <p className="text-[14px] font-semibold text-blue-900">
        {hasPending ? "Ready to score." : "Score any skill, 0–10."}
      </p>
      <p className="mt-1 text-[12.5px] text-slate-500 max-w-[36ch] mx-auto leading-relaxed">
        {hasPending
          ? "Hit Update score to send all pending skills to Claude in one go."
          : "Add skills above. Build up a list, then score them all together. Scores stay until you remove them."}
      </p>
    </div>
  );
}
