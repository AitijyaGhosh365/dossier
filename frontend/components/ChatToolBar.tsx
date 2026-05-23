"use client";

import { useState } from "react";
import { Bookmark, Briefcase, MessageCircle, Sparkles, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { StrengthsGapsModal } from "./StrengthsGapsModal";
import { BookmarksModal } from "./BookmarksModal";
import { SkillScoreModal } from "./SkillScoreModal";
import { JdMatchModal } from "./JdMatchModal";
import { InterviewQuestionsModal } from "./InterviewQuestionsModal";
import type { Bookmark as BookmarkType } from "@/lib/bookmarks";
import type { ResumeData, SkillScore } from "@/lib/types";

type ToolKey =
  | "strengths-gaps"
  | "skill-score"
  | "jd-match"
  | "interview-questions"
  | "bookmarks"
  | null;

type Props = {
  resume: ResumeData;
  sessionId: string | null;
  bookmarks: BookmarkType[];
  onRemoveBookmark: (id: string) => void;
  onClearBookmarks: () => void;
  skillScores: SkillScore[];
  onUpsertSkillScores: (items: SkillScore[]) => void;
  onRemoveSkillScore: (skill: string) => void;
  onClearSkillScores: () => void;
};

export function ChatToolBar({
  resume,
  sessionId,
  bookmarks,
  onRemoveBookmark,
  onClearBookmarks,
  skillScores,
  onUpsertSkillScores,
  onRemoveSkillScore,
  onClearSkillScores,
}: Props) {
  const [open, setOpen] = useState<ToolKey>(null);
  const close = () => setOpen(null);
  const bookmarkCount = bookmarks.length;
  const skillScoreCount = skillScores.length;

  return (
    <>
      <div className="hidden lg:flex flex-col gap-2 sticky top-[5.5rem] self-start">
        <ToolButton
          icon={<Sparkles className="size-4" strokeWidth={2.25} />}
          label="Strengths & Gaps"
          onClick={() => setOpen("strengths-gaps")}
          active={open === "strengths-gaps"}
        />
        <ToolButton
          icon={<Target className="size-4" strokeWidth={2.25} />}
          label="Skill Score"
          onClick={() => setOpen("skill-score")}
          active={open === "skill-score"}
          badge={skillScoreCount > 0 ? skillScoreCount : undefined}
        />
        <ToolButton
          icon={<Briefcase className="size-4" strokeWidth={2.25} />}
          label="JD Match"
          onClick={() => setOpen("jd-match")}
          active={open === "jd-match"}
        />
        <ToolButton
          icon={<MessageCircle className="size-4" strokeWidth={2.25} />}
          label="Interview Questions"
          onClick={() => setOpen("interview-questions")}
          active={open === "interview-questions"}
        />
        <ToolButton
          icon={<Bookmark className="size-4" strokeWidth={2.25} />}
          label="Bookmarks"
          onClick={() => setOpen("bookmarks")}
          active={open === "bookmarks"}
          badge={bookmarkCount > 0 ? bookmarkCount : undefined}
        />
      </div>

      {/* Mobile — floating action button */}
      <button
        type="button"
        onClick={() => setOpen("strengths-gaps")}
        aria-label="Strengths & Gaps"
        className="lg:hidden fixed bottom-5 right-5 z-30 size-12 rounded-full bg-cyan-500 text-white shadow-[0_14px_36px_-12px_rgba(6,182,212,0.5)] grid place-items-center transition-transform hover:scale-105 active:scale-95"
      >
        <Sparkles className="size-5" strokeWidth={2.25} />
      </button>

      <StrengthsGapsModal
        open={open === "strengths-gaps"}
        onClose={close}
        strengths={resume.strengths}
        gaps={resume.gaps}
      />

      <BookmarksModal
        open={open === "bookmarks"}
        onClose={close}
        bookmarks={bookmarks}
        onRemove={onRemoveBookmark}
        onClear={onClearBookmarks}
      />

      <SkillScoreModal
        open={open === "skill-score"}
        onClose={close}
        sessionId={sessionId}
        scores={skillScores}
        onUpsert={onUpsertSkillScores}
        onRemove={onRemoveSkillScore}
        onClear={onClearSkillScores}
      />

      <JdMatchModal
        open={open === "jd-match"}
        onClose={close}
        sessionId={sessionId}
      />

      <InterviewQuestionsModal
        open={open === "interview-questions"}
        onClose={close}
        sessionId={sessionId}
      />
    </>
  );
}

function ToolButton({
  icon,
  label,
  onClick,
  active,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  badge?: number;
}) {
  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={cn(
          "size-11 grid place-items-center rounded-xl border-2 transition-all duration-200",
          active
            ? "bg-cyan-500 text-white border-cyan-500 shadow-[0_10px_24px_-10px_rgba(6,182,212,0.55)]"
            : "bg-white text-slate-600 border-slate-200 hover:border-cyan-500 hover:text-cyan-600 hover:bg-cyan-50 hover:-translate-y-px hover:shadow-[0_10px_22px_-12px_rgba(6,182,212,0.5)]",
        )}
      >
        {icon}
      </button>

      {typeof badge === "number" && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-cyan-500 text-white text-[10px] font-bold leading-none grid place-items-center border-2 border-white shadow-sm">
          {badge}
        </span>
      )}

      <span
        className={cn(
          "pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-2",
          "whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium z-10",
          "bg-slate-900 text-white opacity-0 transition-opacity duration-150",
          "group-hover:opacity-100",
        )}
      >
        {label}
      </span>
    </div>
  );
}
