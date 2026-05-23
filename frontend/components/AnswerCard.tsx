"use client";

import {
  AlertCircle,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn, confidenceColor, ensureProtocol } from "@/lib/utils";
import type { StructuredAnswer, ToolCall } from "@/lib/types";

type Props = {
  structured: StructuredAnswer;
  toolCalls: ToolCall[];
  bookmarked?: boolean;
  onToggleBookmark?: () => void;
};

export function AnswerCard({
  structured,
  bookmarked,
  onToggleBookmark,
}: Props) {
  const pct = Math.round(structured.confidence * 100);

  return (
    <article className="card overflow-hidden fade-up border border-slate-200">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex-1 text-[14px] leading-[1.65] text-slate-700">
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-slate-900">
                    {children}
                  </strong>
                ),
                em: ({ children }) => <em className="italic">{children}</em>,
                ul: ({ children }) => (
                  <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-5 my-2 space-y-1">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li>{children}</li>,
                code: ({ children }) => (
                  <code className="font-mono text-[12.5px] px-1 py-0.5 rounded bg-slate-100 text-slate-800">
                    {children}
                  </code>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href ? ensureProtocol(href) : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline underline-offset-2"
                  >
                    {children}
                  </a>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-blue-200 pl-3 italic text-slate-600 my-2">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {structured.answer}
            </ReactMarkdown>
          </div>
          {onToggleBookmark && (
            <button
              type="button"
              onClick={onToggleBookmark}
              title={bookmarked ? "Remove bookmark" : "Bookmark this reply"}
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark this reply"}
              className={cn(
                "shrink-0 size-7 grid place-items-center rounded-md transition-all duration-200",
                bookmarked
                  ? "text-blue-600 bg-blue-50 hover:bg-blue-100"
                  : "text-slate-400 hover:text-blue-600 hover:bg-blue-50",
              )}
            >
              {bookmarked ? (
                <BookmarkCheck className="size-4" strokeWidth={2.25} />
              ) : (
                <Bookmark className="size-4" strokeWidth={2.25} />
              )}
            </button>
          )}
        </div>

        {structured.missing_data.length > 0 && (
          <div className="mt-3.5 inline-flex items-start gap-2 text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertCircle className="size-3.5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold">Not in resume:</span>{" "}
              {structured.missing_data.join(", ")}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 sm:px-5 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center gap-2 flex-wrap">
        <SourceBadge source={structured.source} />
        <ConfidencePill pct={pct} confidence={structured.confidence} />
      </div>
    </article>
  );
}

function SourceBadge({ source }: { source: StructuredAnswer["source"] }) {
  if (source === "resume") {
    return (
      <span
        title="Answer pulled directly from the uploaded resume."
        className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200"
      >
        <BookOpen className="size-3" />
        <span className="smallcaps text-[10px]">From resume</span>
      </span>
    );
  }
  return (
    <span
      title="The agent inferred this beyond what the resume literally says."
      className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200"
    >
      <Sparkles className="size-3" />
      <span className="smallcaps text-[10px]">Inferred</span>
    </span>
  );
}

function ConfidencePill({
  pct,
  confidence,
}: {
  pct: number;
  confidence: number;
}) {
  const c = confidenceColor(confidence);
  return (
    <span
      title="The agent's self-rated confidence in this answer (0% lowest, 100% highest)."
      className="inline-flex items-center gap-2 text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200"
    >
      <span className="smallcaps text-[10px] text-slate-500">Confidence</span>
      <span
        className="font-mono tabular-nums font-semibold"
        style={{ color: c.text }}
      >
        {pct}%
      </span>
      <span
        className="block h-1 w-12 rounded-full overflow-hidden"
        style={{ backgroundColor: c.track }}
      >
        <span
          className="block h-full transition-[width] duration-700"
          style={{ width: `${pct}%`, backgroundColor: c.fill }}
        />
      </span>
    </span>
  );
}
