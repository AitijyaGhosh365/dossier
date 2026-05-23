import type {
  ChatResponse,
  InterviewQuestionsResponse,
  JdMatchResponse,
  ScoreSkillsResponse,
  UploadResponse,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let detail = body;
    try {
      detail = JSON.parse(body)?.detail ?? body;
    } catch {
      /* keep raw */
    }
    throw new Error(`${res.status} ${res.statusText}${detail ? ` — ${detail}` : ""}`);
  }
  return (await res.json()) as T;
}

export async function uploadResume(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE_URL}/api/upload`, {
    method: "POST",
    body: form,
  });
  return unwrap<UploadResponse>(res);
}

export async function sendMessage(
  sessionId: string,
  message: string,
): Promise<ChatResponse> {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, message }),
  });
  return unwrap<ChatResponse>(res);
}

export async function scoreSkills(
  sessionId: string,
  skills: string[],
): Promise<ScoreSkillsResponse> {
  const res = await fetch(`${BASE_URL}/api/score-skills`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, skills }),
  });
  return unwrap<ScoreSkillsResponse>(res);
}

export async function matchAgainstJd(
  sessionId: string,
  jobDescription: string,
): Promise<JdMatchResponse> {
  const res = await fetch(`${BASE_URL}/api/jd-match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, job_description: jobDescription }),
  });
  return unwrap<JdMatchResponse>(res);
}

export async function generateInterviewQuestions(
  sessionId: string,
  focus: string,
): Promise<InterviewQuestionsResponse> {
  const res = await fetch(`${BASE_URL}/api/interview-questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, focus }),
  });
  return unwrap<InterviewQuestionsResponse>(res);
}
