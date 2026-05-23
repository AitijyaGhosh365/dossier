import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Normalize a URL so the browser doesn't treat it as a same-host relative path.
 * "github.com/janedev" → "https://github.com/janedev"
 * "https://x.com" → unchanged
 * "mailto:a@b.com" / "tel:..." → unchanged
 */
export function ensureProtocol(url: string): string {
  const u = url.trim();
  if (!u) return u;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(u)) return u;
  return `https://${u.replace(/^\/+/, "")}`;
}

/**
 * Interpolate confidence (0–1) to an HSL color band:
 *   0   → red    (hue 0)
 *   0.5 → amber  (hue 60)
 *   1   → green  (hue 120)
 * Returns colors for the bar fill and the number text.
 */
export function confidenceColor(value: number) {
  const clamped = Math.max(0, Math.min(1, value));
  const hue = Math.round(clamped * 120);
  return {
    fill: `hsl(${hue}, 72%, 46%)`,
    text: `hsl(${hue}, 70%, 36%)`,
    track: `hsl(${hue}, 60%, 92%)`,
  };
}
