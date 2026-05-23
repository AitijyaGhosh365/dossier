"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FileText,
  Loader2,
  ShieldCheck,
  Sparkles,
  Upload,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onUpload: (file: File) => Promise<void>;
};

export function UploadZone({ onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

  const handle = useCallback(
    async (file: File | undefined | null) => {
      if (!file) return;
      setBusy(true);
      setError(null);
      setFilename(file.name);
      try {
        await onUpload(file);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed.");
        setFilename(null);
      } finally {
        setBusy(false);
      }
    },
    [onUpload],
  );

  function pick() {
    inputRef.current?.click();
  }

  return (
    <div className="w-full">
      {/* ============ HERO ============ */}
      <section className="mx-auto max-w-[1080px] px-6 pt-16 pb-10 lg:pt-24 lg:pb-16 text-center fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[--color-border-soft] shadow-[0_2px_8px_-4px_rgba(45,91,255,0.10)] mb-7">
          <span className="size-1.5 rounded-full bg-[--color-brand] pulse-soft" />
          <span className="smallcaps text-[10px] text-[--color-brand-deep]">
            A reader for candidate dossiers
          </span>
        </div>

        <h1 className="text-[2.4rem] sm:text-[3.4rem] lg:text-[4rem] font-extrabold tracking-tight leading-[1.02] text-[--color-brand-deep]">
          Read resumes{" "}
          <span className="text-[--color-brand]">smarter.</span>
          <br />
          Hire{" "}
          <span className="text-[--color-brand]">faster.</span>
        </h1>

        <p className="mt-6 mx-auto max-w-[58ch] text-[15px] sm:text-[16px] leading-[1.65] text-[--color-ink-soft]">
          An agentic assistant that reads PDFs, extracts structured profiles,
          notes strengths and gaps, and answers every question with sources and
          confidence on the line.
        </p>

        <div className="mt-9 flex items-center justify-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={pick}
            disabled={busy}
            className="btn-primary px-5 py-2.5 text-[13.5px] inline-flex items-center gap-2 disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Reading…
              </>
            ) : (
              <>
                Upload a resume
                <ArrowRight className="size-3.5" />
              </>
            )}
          </button>
          <a
            href="#how"
            className="text-[13.5px] text-[--color-brand-deep] hover:text-[--color-brand] under-line"
          >
            See what you get →
          </a>
        </div>

        {/* The actual dropzone — visually prominent under the CTA */}
        <DropZone
          inputRef={inputRef}
          dragOver={dragOver}
          setDragOver={setDragOver}
          handle={handle}
          busy={busy}
          filename={filename}
        />

        {error && (
          <div className="mt-4 inline-flex items-center gap-2 text-[12.5px] text-[--color-brand-deep] bg-[--color-brand-soft] border border-[--color-border-soft] rounded-lg px-3.5 py-2 fade-in">
            {error}
          </div>
        )}
      </section>

      {/* ============ PREVIEW / SHOWCASE ============ */}
      <section
        id="how"
        className="mx-auto max-w-[1080px] px-6 py-12 lg:py-20 fade-up"
        style={{ animationDelay: "0.05s" }}
      >
        <div className="text-center mb-10">
          <div className="smallcaps text-[10.5px] text-[--color-brand] mb-3">
            What you get back
          </div>
          <h2 className="text-[1.9rem] sm:text-[2.4rem] font-bold tracking-tight leading-[1.1] text-[--color-brand-deep]">
            One{" "}
            <span className="text-[--color-brand]">structured dossier.</span>{" "}
            <br className="hidden sm:block" />
            Every claim sourced.
          </h2>
        </div>

        <DashboardMock />
      </section>

      {/* ============ FEATURES ============ */}
      <section className="mx-auto max-w-[1080px] px-6 py-12 lg:py-20 fade-up">
        <div className="text-center mb-10">
          <div className="smallcaps text-[10.5px] text-[--color-brand] mb-3">
            Built for hiring desks
          </div>
          <h2 className="text-[1.9rem] sm:text-[2.4rem] font-bold tracking-tight leading-[1.1] text-[--color-brand-deep]">
            Designed not to{" "}
            <span className="text-[--color-brand]">hallucinate.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger">
          {[
            {
              icon: <Wrench className="size-4" />,
              title: "3 deterministic tools",
              body: "Skill match, experience math, and resume search — pure functions the agent calls instead of guessing.",
            },
            {
              icon: <ShieldCheck className="size-4" />,
              title: "Structured by contract",
              body: "Every reply is JSON, validated by Pydantic, with confidence (0–1) and source (resume / inference).",
            },
            {
              icon: <FileText className="size-4" />,
              title: "Visible reasoning",
              body: "Each answer lists the tools the agent called, their arguments, and a preview of the result.",
            },
          ].map((f, i) => (
            <FeatureCard key={i} icon={f.icon} title={f.title} body={f.body} />
          ))}
        </div>
      </section>

      {/* ============ STATS / WHY ============ */}
      <section className="mx-auto max-w-[1080px] px-6 py-12 lg:py-16 fade-up">
        <div className="rounded-2xl bg-[--color-brand-deep] text-white px-8 py-10 sm:px-12 sm:py-14 shadow-[0_28px_56px_-32px_rgba(31,63,199,0.45)] overflow-hidden relative">
          <div
            aria-hidden
            className="absolute -top-24 -right-24 size-72 rounded-full opacity-30"
            style={{
              background:
                "radial-gradient(closest-side, rgba(255,255,255,0.4), transparent)",
            }}
          />
          <div className="relative">
            <div className="smallcaps text-[10.5px] text-white/70 mb-2.5">
              Why this assistant
            </div>
            <h3 className="text-[1.7rem] sm:text-[2rem] font-bold leading-[1.1] mb-8 text-white max-w-[44ch]">
              Reasoning you can audit. Replies you can trust.
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
              {[
                ["3", "agent tools"],
                ["100%", "structured replies"],
                ["0", "fabricated facts"],
                ["⟶", "trace on every reply"],
              ].map(([num, label], i) => (
                <div key={i}>
                  <div className="text-[2rem] sm:text-[2.4rem] font-extrabold tabular-nums leading-none text-white">
                    {num}
                  </div>
                  <div className="mt-1.5 text-[11.5px] smallcaps text-white/70">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ FOOTER NOTE ============ */}
      <section className="mx-auto max-w-[1080px] px-6 pb-14">
        <div className="flex items-center justify-center gap-2 text-[11px] text-[--color-ink-faint]">
          <FileText className="size-3" />
          <span>
            Built on Claude Sonnet 4.6 · Held in volatile memory · Single session
          </span>
        </div>
      </section>
    </div>
  );
}

/* ===== Dropzone ===== */
function DropZone({
  inputRef,
  dragOver,
  setDragOver,
  handle,
  busy,
  filename,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  handle: (f: File | undefined | null) => Promise<void>;
  busy: boolean;
  filename: string | null;
}) {
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handle(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        "relative block cursor-pointer mx-auto mt-10 max-w-[680px] rounded-2xl bg-white text-center",
        "transition-all duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
        "border border-[--color-border-soft]",
        "shadow-[0_2px_4px_rgba(14,30,58,0.03),0_24px_44px_-28px_rgba(31,63,199,0.18)]",
        "px-8 py-10",
        dragOver
          ? "border-[--color-brand] bg-[--color-brand-soft] shadow-[0_36px_60px_-30px_var(--color-brand-glow)]"
          : "hover:border-[--color-brand]/50 hover:-translate-y-px hover:shadow-[0_32px_56px_-28px_var(--color-brand-glow)]",
        busy && "pointer-events-none opacity-90",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,.md,text/plain,application/pdf"
        className="sr-only"
        onChange={(e) => handle(e.target.files?.[0])}
      />
      {busy ? (
        <ScanningIndicator filename={filename ?? "your resume"} />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="size-12 rounded-2xl bg-blue-50 grid place-items-center ring-8 ring-blue-50/40">
            <Upload className="size-5 text-blue-500" strokeWidth={2.25} />
          </div>
          <div className="space-y-1">
            <div className="text-[15px] font-semibold text-blue-700 tracking-tight">
              Drop a resume here
            </div>
            <div className="text-[12.5px] text-slate-500">
              or{" "}
              <span className="text-blue-600 font-semibold under-line">
                click to choose
              </span>{" "}
              · PDF or text · up to 10 MB
            </div>
          </div>
        </div>
      )}
    </label>
  );
}

/* ===== Scanning indicator — multi-phase animated read state ===== */
const SCAN_PHASES = [
  "Reading the document",
  "Extracting the profile",
  "Analyzing strengths & gaps",
  "Drafting starter questions",
];

function ScanningIndicator({ filename }: { filename: string }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPhase((p) => Math.min(p + 1, SCAN_PHASES.length - 1));
    }, 4200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center gap-5 fade-in">
      <ScanningDocument />
      <div className="text-center">
        <div className="text-[14.5px] font-semibold text-blue-700 tracking-tight">
          Reading{" "}
          <span className="font-mono text-[12.5px] text-blue-500">
            {filename}
          </span>
        </div>
        <div className="text-[11px] smallcaps text-slate-400 mt-1">
          This usually takes 10–20 seconds
        </div>
      </div>
      <ul className="w-full max-w-[280px] text-left space-y-2">
        {SCAN_PHASES.map((label, i) => {
          const state =
            i < phase ? "done" : i === phase ? "active" : "upcoming";
          return <PhaseRow key={label} label={label} state={state} index={i} />;
        })}
      </ul>
    </div>
  );
}

function ScanningDocument() {
  return (
    <div className="relative size-16 rounded-2xl bg-blue-50 grid place-items-center glow-pulse">
      <div className="relative size-10 rounded-md border-2 border-blue-500 bg-white overflow-hidden">
        {/* Stylized document text lines */}
        <div className="absolute inset-0 p-1.5 space-y-[3px]">
          <div className="h-[2px] bg-blue-200 rounded line-shimmer" />
          <div
            className="h-[2px] bg-blue-200 rounded line-shimmer"
            style={{ animationDelay: "0.2s" }}
          />
          <div
            className="h-[2px] bg-blue-200 rounded w-3/4 line-shimmer"
            style={{ animationDelay: "0.4s" }}
          />
          <div
            className="h-[2px] bg-blue-200 rounded line-shimmer"
            style={{ animationDelay: "0.6s" }}
          />
          <div
            className="h-[2px] bg-blue-200 rounded w-1/2 line-shimmer"
            style={{ animationDelay: "0.8s" }}
          />
        </div>
        {/* Scan line sweeping vertically */}
        <span
          aria-hidden
          className="absolute inset-x-0 h-[2px] bg-blue-500 shadow-[0_0_10px_2px_rgba(59,130,246,0.85)] scan-sweep"
        />
      </div>
    </div>
  );
}

function PhaseRow({
  label,
  state,
  index,
}: {
  label: string;
  state: "done" | "active" | "upcoming";
  index: number;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-2.5 text-[12.5px] phase-enter",
        state === "done" && "text-slate-500",
        state === "active" && "text-blue-700 font-semibold",
        state === "upcoming" && "text-slate-300",
      )}
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <span className="grid place-items-center size-4 shrink-0">
        {state === "done" && (
          <span className="size-4 rounded-full bg-blue-500 grid place-items-center text-white">
            <Check className="size-2.5" strokeWidth={3} />
          </span>
        )}
        {state === "active" && (
          <Loader2 className="size-3.5 animate-spin text-blue-500" />
        )}
        {state === "upcoming" && (
          <span className="size-1.5 rounded-full bg-slate-300" />
        )}
      </span>
      <span>{label}</span>
    </li>
  );
}

/* ===== Feature card ===== */
function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="card card-hover border border-slate-200 p-5">
      <div className="size-9 rounded-lg bg-[--color-brand-soft] text-[--color-brand] grid place-items-center mb-4">
        {icon}
      </div>
      <h3 className="text-[15px] font-semibold text-[--color-brand-deep] tracking-tight mb-1.5">
        {title}
      </h3>
      <p className="text-[13px] leading-[1.6] text-[--color-ink-soft]">{body}</p>
    </div>
  );
}

/* ===== Dashboard mockup — shows what the assistant returns ===== */
function DashboardMock() {
  return (
    <div className="card border border-slate-200 p-5 sm:p-6 relative overflow-hidden">
      {/* Browser-chrome strip */}
      <div className="flex items-center gap-1.5 mb-5">
        <span className="size-2.5 rounded-full bg-[--color-brand-soft]" />
        <span className="size-2.5 rounded-full bg-[--color-brand-soft]" />
        <span className="size-2.5 rounded-full bg-[--color-brand-soft]" />
        <span className="ml-3 text-[10.5px] smallcaps text-[--color-ink-faint]">
          resume-assistant.app · dossier
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
        {/* Left — resume dossier mock */}
        <div className="rounded-xl border border-[--color-border-soft] bg-[--color-card-tint] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-[--color-border-soft]">
            <div>
              <div className="text-[1.5rem] font-extrabold uppercase text-[--color-brand] tracking-tight leading-none">
                Jane Doe
              </div>
              <div className="mt-2 text-[11px] text-[--color-ink-faint]">
                jane@example.com · +1 555 0142
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 text-[10px]">
              <span className="link-arrow smallcaps">
                GitHub <ArrowUpRight className="size-2.5" />
              </span>
              <span className="link-arrow smallcaps">
                LinkedIn <ArrowUpRight className="size-2.5" />
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <MiniModule
              tone="strength"
              title="Strengths"
              items={["End-to-end ownership", "Mentors juniors well"]}
            />
            <MiniModule
              tone="gap"
              title="Gaps"
              items={["No CI/CD detail", "Light on testing"]}
            />
          </div>

          <div className="mt-4">
            <div className="smallcaps text-[9.5px] text-[--color-brand] mb-1.5">
              Experience
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <div className="text-[12.5px] font-semibold text-[--color-brand-deep]">
                Senior Engineer{" "}
                <span className="text-[--color-brand] font-medium">· Quarry</span>
              </div>
              <div className="font-mono text-[10px] text-[--color-brand]">
                Jul 2022 — Present
              </div>
            </div>
          </div>
        </div>

        {/* Right — chat mock */}
        <div className="rounded-xl border border-[--color-border-soft] bg-white p-4 flex flex-col gap-3">
          <div className="ml-auto rounded-2xl rounded-br-md bg-[--color-brand] text-white px-3 py-2 text-[12px] max-w-[80%] shadow-[0_8px_24px_-12px_var(--color-brand-glow)]">
            Years of professional experience?
          </div>
          <div className="rounded-xl border border-[--color-border-soft] bg-[--color-card-tint] p-3 text-[12px] text-[--color-ink-soft]">
            6.8 years across three roles since 2018, including 3+ years in
            senior backend positions.
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[--color-brand-soft] text-[--color-brand-deep] border border-[--color-border-soft]">
                <Check className="size-2.5" strokeWidth={3} /> resume
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-white text-[--color-brand-deep] border border-[--color-border-soft] font-mono">
                94% confidence
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-dashed border-[--color-border] bg-[--color-bg-soft] p-2 text-[10px] font-mono text-[--color-ink-faint] leading-relaxed">
            <span className="text-[--color-brand]">calculate_experience()</span>{" "}
            → total_years: 6.8 · per_role: 3
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniModule({
  tone,
  title,
  items,
}: {
  tone: "strength" | "gap";
  title: string;
  items: string[];
}) {
  const isStrength = tone === "strength";
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        isStrength
          ? "bg-[--color-strength-bg] border-[--color-strength-border]"
          : "bg-[--color-gap-bg] border-[--color-gap-border]",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 mb-2 smallcaps text-[9.5px] font-semibold",
          isStrength ? "text-[--color-strength-deep]" : "text-[--color-gap-deep]",
        )}
      >
        <span
          className={cn(
            "grid place-items-center size-3.5 rounded-full text-white",
            isStrength ? "bg-[--color-strength]" : "bg-[--color-gap]",
          )}
        >
          {isStrength ? (
            <Check className="size-2" strokeWidth={3} />
          ) : (
            <X className="size-2" strokeWidth={3} />
          )}
        </span>
        {title}
      </div>
      <ul className="space-y-1">
        {items.map((s, i) => (
          <li
            key={i}
            className="grid grid-cols-[6px_1fr] gap-1.5 items-start text-[11px] leading-snug text-[--color-ink-soft]"
          >
            <span
              className={cn(
                "size-1 rounded-full mt-[5px]",
                isStrength ? "bg-[--color-strength]" : "bg-[--color-gap]",
              )}
            />
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
