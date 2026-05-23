"use client";

import { useCallback, useEffect, useState } from "react";
import type { StructuredAnswer, ToolCall } from "./types";

export type Bookmark = {
  id: string;
  message_id: string;
  structured: StructuredAnswer;
  tool_calls: ToolCall[];
  timestamp: number;
};

function storageKey(sessionId: string) {
  return `resume-assistant:bookmarks:${sessionId}`;
}

export function useBookmarks(sessionId: string | null) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    if (!sessionId) {
      setBookmarks([]);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey(sessionId));
      setBookmarks(raw ? (JSON.parse(raw) as Bookmark[]) : []);
    } catch {
      setBookmarks([]);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    try {
      localStorage.setItem(storageKey(sessionId), JSON.stringify(bookmarks));
    } catch {
      /* quota or sandbox */
    }
  }, [sessionId, bookmarks]);

  const isBookmarked = useCallback(
    (messageId: string) => bookmarks.some((b) => b.message_id === messageId),
    [bookmarks],
  );

  const toggle = useCallback(
    (entry: {
      message_id: string;
      structured: StructuredAnswer;
      tool_calls: ToolCall[];
    }) => {
      setBookmarks((prev) => {
        const existing = prev.find((b) => b.message_id === entry.message_id);
        if (existing) {
          return prev.filter((b) => b.message_id !== entry.message_id);
        }
        return [
          ...prev,
          {
            id: Math.random().toString(36).slice(2, 10),
            message_id: entry.message_id,
            structured: entry.structured,
            tool_calls: entry.tool_calls,
            timestamp: Date.now(),
          },
        ];
      });
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const clear = useCallback(() => setBookmarks([]), []);

  return { bookmarks, isBookmarked, toggle, remove, clear };
}
