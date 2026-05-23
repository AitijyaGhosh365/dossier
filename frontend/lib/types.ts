// Mirror of backend/app/schemas.py — keep in sync when the API shape changes.

export type ExperienceEntry = {
  role: string;
  company: string;
  start: string | null;
  end: string | null;
  description: string | null;
};

export type EducationEntry = {
  degree: string;
  institution: string;
  year: string | null;
  score: string | null;
};

export type SkillCategory = {
  name: string;
  items: string[];
};

export type Project = {
  name: string;
  description: string | null;
  technologies: string[];
  date: string | null;
  url: string | null;
};

export type Achievement = {
  title: string;
  description: string | null;
  date: string | null;
};

export type ResumeLink = {
  label: string;
  url: string;
};

export type ResumeData = {
  name: string | null;
  email: string | null;
  phone: string | null;
  summary: string | null;
  skills: SkillCategory[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  projects: Project[];
  achievements: Achievement[];
  links: ResumeLink[];
  strengths: string[];
  gaps: string[];
  suggested_questions: string[];
  raw_text: string;
};

export type StructuredAnswer = {
  answer: string;
  confidence: number;
  source: "resume" | "inference";
  missing_data: string[];
};

export type ToolCall = {
  name: string;
  arguments: Record<string, unknown>;
  result_preview: string;
};

export type ChatResponse = {
  session_id: string;
  structured: StructuredAnswer;
  tool_calls: ToolCall[];
  suggestions: string[];
};

export type UploadResponse = {
  session_id: string;
  resume: ResumeData;
};

export type SkillScore = {
  skill: string;
  score: number; // 0-10
  reasoning: string;
};

export type ScoreSkillsResponse = {
  scores: SkillScore[];
};

export type JdMatchResult = {
  overall_fit: number; // 0-100
  fit_summary: string;
  matched_skills: string[];
  missing_skills: string[];
  experience_assessment: string;
  key_strengths: string[];
  key_concerns: string[];
};

export type JdMatchResponse = {
  result: JdMatchResult;
};

export type InterviewQuestion = {
  question: string;
  rationale: string;
  listen_for: string;
};

export type InterviewQuestionsResponse = {
  focus: string;
  questions: InterviewQuestion[];
};

export type ChatMessage =
  | { id: string; role: "user"; content: string }
  | {
      id: string;
      role: "assistant";
      structured: StructuredAnswer;
      tool_calls: ToolCall[];
      suggestions: string[];
    };
