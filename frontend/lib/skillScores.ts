"use client";

import { useCallback, useEffect, useState } from "react";
import type { SkillScore } from "./types";

function storageKey(sessionId: string) {
  return `resume-assistant:skill-scores:${sessionId}`;
}

export function useSkillScores(sessionId: string | null) {
  const [scores, setScores] = useState<SkillScore[]>([]);

  useEffect(() => {
    if (!sessionId) {
      setScores([]);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey(sessionId));
      setScores(raw ? (JSON.parse(raw) as SkillScore[]) : []);
    } catch {
      setScores([]);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    try {
      localStorage.setItem(storageKey(sessionId), JSON.stringify(scores));
    } catch {
      /* quota or sandbox */
    }
  }, [sessionId, scores]);

  const upsert = useCallback((items: SkillScore[]) => {
    setScores((prev) => {
      const map = new Map(prev.map((s) => [s.skill.toLowerCase(), s]));
      for (const item of items) {
        map.set(item.skill.toLowerCase(), item);
      }
      return Array.from(map.values());
    });
  }, []);

  const remove = useCallback((skill: string) => {
    const k = skill.toLowerCase();
    setScores((prev) => prev.filter((s) => s.skill.toLowerCase() !== k));
  }, []);

  const clear = useCallback(() => setScores([]), []);

  return { scores, upsert, remove, clear };
}
