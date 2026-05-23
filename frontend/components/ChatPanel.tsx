"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, MessageSquare, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnswerCard } from "./AnswerCard";
import type { ChatMessage } from "@/lib/types";

const FALLBACK_SUGGESTIONS = [
  "Summarize this candidate in two sentences.",
  "How many years of professional experience?",
  "What's the strongest area, and the biggest concern?",
  "Which roles would they be a good fit for?",
];

type Props = {
  messages: ChatMessage[];
  pending: boolean;
  onSend: (message: string) => Promise<void>;
  starterQuestions?: string[];
  isBookmarked?: (messageId: string) => boolean;
  onToggleBookmark?: (messageId: string) => void;
};

export function ChatPanel({
  messages,
  pending,
  onSend,
  starterQuestions,
  isBookmarked,
  onToggleBookmark,
}: Props) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, pending]);

  async function submit() {
    const v = text.trim();
    if (!v || pending) return;
    setText("");
    await onSend(v);
  }

  // Show follow-up suggestions only from the *latest* assistant message,
  // and only if we're not currently waiting on a reply.
  const lastMessage = messages[messages.length - 1];
  const showFollowUps =
    !pending &&
    lastMessage?.role === "assistant" &&
    lastMessage.suggestions.length > 0;

  return (
    <section className="card border-2 border-transparent hover:border-cyan-500 transition-colors duration-200 flex flex-col h-[calc(100dvh-7rem)] overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
        <div className="size-6 rounded-md bg-blue-50 grid place-items-center">
          <Sparkles className="size-3 text-blue-600" strokeWidth={2.5} />
        </div>
        <h2 className="text-[13px] font-semibold tracking-tight text-slate-900">
          Ask the assistant
        </h2>
        <span className="ml-auto smallcaps text-[10px] text-slate-500">
          Sourced · Confidence-noted
        </span>
      </div>

      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="px-4 sm:px-5 py-5">
          {messages.length === 0 ? (
            <EmptyState
              starterQuestions={starterQuestions}
              onPick={onSend}
            />
          ) : (
            <div className="space-y-4">
              {messages.map((m) =>
                m.role === "user" ? (
                  <UserBubble key={m.id} content={m.content} />
                ) : (
                  <AnswerCard
                    key={m.id}
                    structured={m.structured}
                    toolCalls={m.tool_calls}
                    bookmarked={isBookmarked?.(m.id)}
                    onToggleBookmark={
                      onToggleBookmark ? () => onToggleBookmark(m.id) : undefined
                    }
                  />
                ),
              )}
              {pending && <Thinking />}
              {showFollowUps && lastMessage.role === "assistant" && (
                <FollowUps
                  questions={lastMessage.suggestions}
                  onPick={onSend}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="border-t border-slate-100 bg-slate-50 p-3"
      >
        <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-white focus-within:border-blue-500 focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.15)] transition-all duration-200">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            rows={1}
            placeholder="Ask about skills, experience, fit…"
            disabled={pending}
            className={cn(
              "flex-1 bg-transparent resize-none px-3.5 py-2.5 text-[13.5px]",
              "placeholder:text-slate-400 text-slate-900",
              "focus:outline-none disabled:opacity-50 max-h-48",
            )}
          />
          <button
            type="submit"
            disabled={pending || !text.trim()}
            aria-label="Send"
            className={cn(
              "m-1.5 size-8 grid place-items-center rounded-lg",
              "bg-blue-500 text-white hover:bg-blue-600 transition-colors",
              "disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed",
            )}
          >
            <ArrowUp className="size-4" strokeWidth={2.5} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] smallcaps text-slate-400">
          <span>↵ to send · ⇧↵ for newline</span>
          <span className="tabular-nums">{text.length}</span>
        </div>
      </form>
    </section>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end fade-up">
      <div className="max-w-[88%] rounded-2xl rounded-br-md bg-blue-50 text-slate-900 border border-blue-200 px-3.5 py-2.5 text-[13.5px] leading-[1.55] whitespace-pre-wrap shadow-[0_4px_16px_-10px_rgba(59,130,246,0.35)]">
        {content}
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <div className="flex items-center gap-3 text-slate-500 text-[12px] fade-in">
      <div className="flex gap-1">
        {[0, 0.18, 0.36].map((delay, i) => (
          <span
            key={i}
            className="size-1.5 rounded-full bg-blue-500 thinking-dot"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </div>
      <span className="smallcaps text-[10.5px]">Thinking…</span>
    </div>
  );
}

function FollowUps({
  questions,
  onPick,
}: {
  questions: string[];
  onPick: (q: string) => Promise<void>;
}) {
  return (
    <div className="pt-2 fade-up">
      <div className="smallcaps text-[10px] text-slate-400 mb-2 px-0.5">
        Suggested follow-ups
      </div>
      <div className="flex flex-wrap gap-1.5">
        {questions.map((q, i) => (
          <button
            key={`${q}-${i}`}
            onClick={() => onPick(q)}
            className={cn(
              "text-left text-[12.5px] rounded-full border border-slate-200 bg-white px-3 py-1.5",
              "transition-all duration-200",
              "hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 hover:-translate-y-px",
              "text-slate-600",
            )}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  starterQuestions,
  onPick,
}: {
  starterQuestions?: string[];
  onPick: (q: string) => Promise<void>;
}) {
  const questions =
    starterQuestions && starterQuestions.length > 0
      ? starterQuestions
      : FALLBACK_SUGGESTIONS;

  return (
    <div className="h-full flex flex-col items-center text-center px-2 pt-8 fade-up">
      <div className="size-11 rounded-xl bg-blue-50 grid place-items-center mb-3">
        <MessageSquare className="size-5 text-blue-600" />
      </div>
      <h3 className="text-[16px] font-semibold tracking-tight text-slate-900">
        Ask anything about this candidate.
      </h3>
      <p className="text-[12.5px] text-slate-500 mt-1.5 max-w-md leading-[1.55]">
        Each reply comes with a confidence score and a source attribution.
        Tailored to this resume.
      </p>
      <div className="mt-6 w-full grid grid-cols-1 sm:grid-cols-2 gap-2 stagger">
        {questions.map((q, i) => (
          <button
            key={`${q}-${i}`}
            onClick={() => onPick(q)}
            className={cn(
              "text-left text-[12.5px] rounded-lg border border-slate-200 bg-white px-3 py-2.5",
              "transition-all duration-200",
              "hover:border-blue-400 hover:bg-blue-50 hover:-translate-y-px hover:shadow-[0_8px_18px_-14px_rgba(59,130,246,0.5)]",
              "text-slate-600 hover:text-slate-900",
            )}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
