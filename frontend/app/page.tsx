"use client";

import { useCallback, useState } from "react";
import { Header } from "@/components/Header";
import { UploadZone } from "@/components/UploadZone";
import { ResumePanel } from "@/components/ResumePanel";
import { ChatPanel } from "@/components/ChatPanel";
import { ChatToolBar } from "@/components/ChatToolBar";
import { useBookmarks } from "@/lib/bookmarks";
import { useSkillScores } from "@/lib/skillScores";
import { sendMessage, uploadResume } from "@/lib/api";
import { shortId } from "@/lib/utils";
import type { ChatMessage, ResumeData } from "@/lib/types";

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);

  const { bookmarks, isBookmarked, toggle, remove, clear } = useBookmarks(sessionId);
  const {
    scores: skillScores,
    upsert: upsertSkillScores,
    remove: removeSkillScore,
    clear: clearSkillScores,
  } = useSkillScores(sessionId);

  const handleToggleBookmark = useCallback(
    (messageId: string) => {
      const msg = messages.find(
        (m) => m.id === messageId && m.role === "assistant",
      );
      if (!msg || msg.role !== "assistant") return;
      toggle({
        message_id: messageId,
        structured: msg.structured,
        tool_calls: msg.tool_calls,
      });
    },
    [messages, toggle],
  );

  const handleUpload = useCallback(async (file: File) => {
    const res = await uploadResume(file);
    setSessionId(res.session_id);
    setResume(res.resume);
    setMessages([]);
  }, []);

  const handleNewResume = useCallback(() => {
    setSessionId(null);
    setResume(null);
    setMessages([]);
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      if (!sessionId || pending) return;
      const userMsg: ChatMessage = { id: shortId(), role: "user", content: text };
      setMessages((m) => [...m, userMsg]);
      setPending(true);
      try {
        const res = await sendMessage(sessionId, text);
        setMessages((m) => [
          ...m,
          {
            id: shortId(),
            role: "assistant",
            structured: res.structured,
            tool_calls: res.tool_calls,
            suggestions: res.suggestions ?? [],
          },
        ]);
      } catch (e) {
        setMessages((m) => [
          ...m,
          {
            id: shortId(),
            role: "assistant",
            structured: {
              answer:
                e instanceof Error
                  ? `Request failed: ${e.message}`
                  : "Request failed.",
              confidence: 0,
              source: "inference",
              missing_data: [],
            },
            tool_calls: [],
            suggestions: [],
          },
        ]);
      } finally {
        setPending(false);
      }
    },
    [sessionId, pending],
  );

  return (
    <div className="min-h-dvh flex flex-col">
      <Header hasResume={!!resume} onNewResume={handleNewResume} />

      {!resume ? (
        <main className="flex-1">
          <UploadZone onUpload={handleUpload} />
        </main>
      ) : (
        <main className="flex-1 mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 py-5">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(360px,1fr)_60px] gap-5">
            <div className="lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto pr-1">
              <ResumePanel resume={resume} />
            </div>
            <ChatPanel
              messages={messages}
              pending={pending}
              onSend={handleSend}
              starterQuestions={resume.suggested_questions}
              isBookmarked={isBookmarked}
              onToggleBookmark={handleToggleBookmark}
            />
            <ChatToolBar
              resume={resume}
              sessionId={sessionId}
              bookmarks={bookmarks}
              onRemoveBookmark={remove}
              onClearBookmarks={clear}
              skillScores={skillScores}
              onUpsertSkillScores={upsertSkillScores}
              onRemoveSkillScore={removeSkillScore}
              onClearSkillScores={clearSkillScores}
            />
          </div>
        </main>
      )}
    </div>
  );
}
