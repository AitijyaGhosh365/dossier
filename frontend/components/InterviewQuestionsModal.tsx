"use client";

import { useEffect, useState } from "react";
import { Ear, HelpCircle, Loader2, MessageCircle, Sparkles, X } from "lucide-react";
import { generateInterviewQuestions } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { InterviewQuestion } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  sessionId: string | null;
};

const QUICK_TOPICS = [
  "Their strongest area",
  "Leadership & ownership",
  "Biggest gap",
  "Most recent role",
];

export function InterviewQuestionsModal({ open, onClose, sessionId }: Props) {
  const [focus, setFocus] = useState("");
  const [questions, setQuestions] = useState<InterviewQuestion[] | null>(null);
  const [resolvedFocus, setResolvedFocus] = useState<string>("");
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

  async function generate(submittedFocus: string) {
    if (!sessionId || busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await generateInterviewQuestions(sessionId, submittedFocus);
      setQuestions(res.questions);
      setResolvedFocus(res.focus || submittedFocus);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setQuestions(null);
    setFocus("");
    setError(null);
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="iv-modal-title"
      className="fixed inset-0 z-50 grid place-items-center px-4 py-8 bg-slate-900/30 backdrop-blur-sm fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card border border-slate-200 w-full max-w-[820px] max-h-[88dvh] overflow-hidden flex flex-col"
        style={{ animation: "fadeUp 0.32s cubic-bezier(0.2,0.7,0.2,1) both" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-blue-50 text-blue-600 grid place-items-center">
              <MessageCircle className="size-4" strokeWidth={2.25} />
            </div>
            <div>
              <div className="smallcaps text-[10px] text-blue-600 mb-0.5">
                Tool · Interview Questions
              </div>
              <h2
                id="iv-modal-title"
                className="text-[1.05rem] font-bold text-blue-900 tracking-tight"
              >
                Targeted prompts for this candidate
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {questions && (
              <button
                type="button"
                onClick={reset}
                className="text-[11px] px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors smallcaps"
              >
                New focus
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
          {!questions ? (
            <div className="px-5 py-5 space-y-4">
              <label className="smallcaps text-[10px] text-slate-500">
                What to focus on
              </label>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void generate(focus);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                  placeholder="e.g. Python, leadership, the Quarry migration, their biggest gap…"
                  disabled={busy}
                  className={cn(
                    "flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5",
                    "text-[13.5px] text-slate-900 placeholder:text-slate-400",
                    "focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.12)]",
                    "transition-all disabled:opacity-60",
                  )}
                />
                <button
                  type="submit"
                  disabled={busy || !sessionId}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 px-4 py-2.5",
                    "rounded-lg text-[13.5px] font-semibold transition-all",
                    "bg-blue-500 text-white hover:bg-blue-600",
                    "shadow-[0_8px_22px_-10px_rgba(59,130,246,0.45)]",
                    "hover:shadow-[0_10px_28px_-10px_rgba(59,130,246,0.55)]",
                    "disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none",
                  )}
                >
                  {busy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" strokeWidth={2.25} /> Generate
                    </>
                  )}
                </button>
              </form>

              <div>
                <div className="smallcaps text-[10px] text-slate-400 mb-2">
                  Or pick a quick topic
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TOPICS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setFocus(t);
                        void generate(t);
                      }}
                      disabled={busy || !sessionId}
                      className="text-[12.5px] px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-1.5">
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="px-5 py-5 space-y-4">
              <div className="text-[12px] text-slate-500">
                <span className="smallcaps text-[10px] text-slate-400">Focus</span>{" "}
                · <span className="text-slate-700 font-medium">{resolvedFocus}</span>
              </div>
              <ol className="space-y-3">
                {questions.map((q, i) => (
                  <QuestionCard key={i} index={i + 1} question={q} />
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionCard({
  index,
  question,
}: {
  index: number;
  question: InterviewQuestion;
}) {
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-[0_8px_18px_-14px_rgba(15,20,34,0.18)] fade-up">
      <div className="flex items-start gap-3">
        <div className="shrink-0 size-7 rounded-lg bg-blue-50 text-blue-600 grid place-items-center font-mono font-bold text-[12px] tabular-nums">
          {String(index).padStart(2, "0")}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] leading-[1.55] text-slate-900 font-medium">
            {question.question}
          </p>

          <div className="mt-3 space-y-2">
            <div className="flex items-start gap-2 text-[12px] text-slate-600">
              <HelpCircle className="size-3.5 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <span className="smallcaps text-[9.5px] text-blue-600 mr-1">
                  Why
                </span>
                {question.rationale}
              </div>
            </div>
            <div className="flex items-start gap-2 text-[12px] text-slate-600">
              <Ear className="size-3.5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <span className="smallcaps text-[9.5px] text-emerald-700 mr-1">
                  Listen for
                </span>
                {question.listen_for}
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
