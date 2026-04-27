export type GoalType = "research" | "mentorship" | "referral";
export type EmailDirection = "outbound" | "inbound";
export type ThreadStatus = "draft" | "sent" | "replied";
export type ToneType = "scholarly" | "personal" | "bold" | "brief";

export interface UserProfile {
  id: string;
  email: string;
  platform_email: string | null;
  name: string | null;
  school: string | null;
  major: string | null;
  year: string | null;
  bio: string | null;
  onboarded: boolean;
  created_at: string;
}

export interface UserProfileRecord {
  id: string;
  full_name: string | null;
  school: string | null;
  major: string | null;
  year: string | null;
  bio: string | null;
  updated_at: string;
}

export interface ScrapedPapers {
  papers: Array<{
    title: string;
    year: number;
    abstract_preview: string;
    doi?: string;
    plain_summary?: string;
  }>;
  summary: string;
  key_themes: string[];
}

export interface Professor {
  id: string;
  name: string;
  title: string | null;
  department: string | null;
  school: string | null;
  research_interests: string[];
  research_summary: string | null;
  scraped_papers: ScrapedPapers | null;
  recent_publications: unknown | null;
  email: string | null;
  source: string;
  created_at: string;
}

export interface ProfessorMatchScore {
  id: string;
  user_id: string;
  professor_id: string;
  score: number;
  match_reasons: string;
  created_at: string;
  professors?: Professor;
}

export interface ProfessorFavorite {
  id: string;
  user_id: string;
  professor_id: string;
  created_at: string;
  professors?: Professor;
}

export interface WritingSample {
  id: string;
  user_id: string;
  file_name: string | null;
  content: string | null;
  plan: string;
  created_at: string;
}

export type MoodType = "direct" | "curious" | "confident" | "concise";

export interface EmailAnnotation {
  quote: string;
  type: "good" | "fix";
  comment: string;
}

export interface ProfessorFeedback {
  overall_impression: string;
  annotations: EmailAnnotation[];
  likelihood_to_reply: "low" | "medium" | "high";
}

export interface EmailDraft {
  id: string;
  user_id: string;
  professor_id: string;
  goal_type: GoalType | null;
  research_answers: Record<string, string> | null;
  generated_subject: string | null;
  generated_body: string | null;
  professor_perspective: ProfessorFeedback | null;
  status: "draft" | "sent";
  created_at: string;
}

export interface EmailThread {
  id: string;
  user_id: string;
  professor_id: string;
  subject: string;
  status: ThreadStatus;
  created_at: string;
  updated_at: string;
  professors?: Professor;
}

export interface EmailMessage {
  id: string;
  thread_id: string;
  direction: EmailDirection;
  body: string;
  sent_at: string | null;
  opened_at: string | null;
  created_at: string;
}

export interface AiGeneration {
  id: string;
  user_id: string;
  professor_id: string;
  goal_type: GoalType | null;
  form_inputs: Record<string, string> | null;
  generated_subject: string | null;
  generated_body: string | null;
  used: boolean;
  created_at: string;
}

type TableDef<R, I = Partial<R>, U = Partial<R>> = {
  Row: R;
  Insert: I;
  Update: U;
};

export interface Database {
  public: {
    Tables: {
      users: TableDef<UserProfile>;
      user_profiles: TableDef<UserProfileRecord>;
      professors: TableDef<Professor>;
      professor_match_scores: TableDef<ProfessorMatchScore>;
      professor_favorites: TableDef<ProfessorFavorite>;
      writing_samples: TableDef<WritingSample>;
      email_drafts: TableDef<EmailDraft>;
      email_threads: TableDef<EmailThread>;
      email_messages: TableDef<EmailMessage>;
      ai_generations: TableDef<AiGeneration>;
    };
  };
}
