"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  hasResume?: boolean;
  onNewResume?: () => void;
};

export function Header({ hasResume, onNewResume }: Props) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-100">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Wordmark — text only, refined */}
        <a
          href="/"
          className="group inline-flex items-baseline gap-2"
          aria-label="Dossier home"
        >
          <span
            className="serif text-[1.5rem] leading-none text-blue-700 tracking-tight"
            style={{ fontFamily: "var(--font-instrument-serif), Georgia, serif" }}
          >
            Dossier
          </span>
          <span className="hidden sm:inline-block text-[10px] smallcaps text-slate-400 tracking-[0.18em]">
            Hiring desk
          </span>
        </a>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {hasResume && (
            <button
              type="button"
              onClick={onNewResume}
              className={cn(
                "group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
                "text-[12.5px] font-semibold text-blue-700",
                "bg-white border border-slate-200",
                "transition-all duration-200",
                "hover:border-blue-400 hover:bg-blue-50 hover:-translate-y-px",
                "hover:shadow-[0_8px_18px_-12px_rgba(59,130,246,0.45)]",
              )}
            >
              <Plus
                className="size-3.5 transition-transform group-hover:rotate-90"
                strokeWidth={2.5}
              />
              <span>New resume</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
