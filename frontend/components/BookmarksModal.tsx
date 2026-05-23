"use client";

import { useEffect } from "react";
import { Bookmark, BookmarkX, Trash2, X } from "lucide-react";
import { confidenceColor } from "@/lib/utils";
import type { Bookmark as BookmarkType } from "@/lib/bookmarks";

type Props = {
  open: boolean;
  onClose: () => void;
  bookmarks: BookmarkType[];
  onRemove: (id: string) => void;
  onClear: () => void;
};

export function BookmarksModal({
  open,
  onClose,
  bookmarks,
  onRemove,
  onClear,
}: Props) {
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
      aria-labelledby="bm-modal-title"
      className="fixed inset-0 z-50 grid place-items-center px-4 py-8 bg-slate-900/30 backdrop-blur-sm fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card border border-slate-200 w-full max-w-[760px] max-h-[88dvh] overflow-hidden flex flex-col"
        style={{ animation: "fadeUp 0.32s cubic-bezier(0.2,0.7,0.2,1) both" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-blue-50 text-blue-600 grid place-items-center">
              <Bookmark className="size-4" strokeWidth={2.25} />
            </div>
            <div>
              <div className="smallcaps text-[10px] text-blue-600 mb-0.5">
                Tool · Bookmarks
              </div>
              <h2
                id="bm-modal-title"
                className="text-[1.05rem] font-bold text-blue-900 tracking-tight"
              >
                Saved replies{" "}
                <span className="font-mono text-slate-400 text-[0.9rem]">
                  · {bookmarks.length}
                </span>
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {bookmarks.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                title="Remove all bookmarks"
                className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="size-3" />
                <span className="smallcaps text-[10px]">Clear all</span>
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

        <div className="overflow-y-auto flex-1 p-5">
          {bookmarks.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="space-y-3">
              {bookmarks
                .slice()
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((b) => (
                  <BookmarkItem
                    key={b.id}
                    bookmark={b}
                    onRemove={() => onRemove(b.id)}
                  />
                ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function BookmarkItem({
  bookmark,
  onRemove,
}: {
  bookmark: BookmarkType;
  onRemove: () => void;
}) {
  const c = confidenceColor(bookmark.structured.confidence);
  const pct = Math.round(bookmark.structured.confidence * 100);
  const when = new Date(bookmark.timestamp);
  const ago = relativeTime(bookmark.timestamp);

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-[0_10px_24px_-18px_rgba(15,20,34,0.16)] fade-up">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="text-[10px] smallcaps text-slate-400">
          {ago} ·{" "}
          <span className="font-mono">
            {when.toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          title="Remove bookmark"
          className="text-slate-400 hover:text-rose-600 transition-colors shrink-0"
        >
          <BookmarkX className="size-4" strokeWidth={2} />
        </button>
      </div>

      <p className="text-[13.5px] leading-[1.6] text-slate-700 whitespace-pre-wrap">
        {bookmark.structured.answer}
      </p>

      <div className="mt-3 flex items-center gap-2 flex-wrap text-[11px]">
        <span
          className={
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border " +
            (bookmark.structured.source === "resume"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-800 border-amber-200")
          }
        >
          <span className="smallcaps text-[10px]">
            {bookmark.structured.source === "resume" ? "From resume" : "Inferred"}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-slate-200">
          <span className="smallcaps text-[10px] text-slate-500">Confidence</span>
          <span
            className="font-mono tabular-nums font-semibold"
            style={{ color: c.text }}
          >
            {pct}%
          </span>
        </span>
        {bookmark.structured.missing_data.length > 0 && (
          <span className="inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
            <span className="smallcaps">Missing:</span>{" "}
            <span>{bookmark.structured.missing_data.join(", ")}</span>
          </span>
        )}
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="size-12 rounded-2xl bg-blue-50 text-blue-600 grid place-items-center mx-auto mb-3">
        <Bookmark className="size-5" />
      </div>
      <p className="text-[14px] font-semibold text-blue-900">
        No bookmarks yet.
      </p>
      <p className="mt-1 text-[12.5px] text-slate-500 max-w-[36ch] mx-auto leading-relaxed">
        Hit the bookmark icon on any reply to save it here. They&apos;re kept
        per-session in your browser.
      </p>
    </div>
  );
}

function relativeTime(ts: number): string {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts).toLocaleDateString();
}
