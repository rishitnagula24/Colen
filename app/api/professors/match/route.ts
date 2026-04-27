import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import type { Professor, ScrapedPapers } from "@/types/database";

type MatchScoreRow = {
  id: string;
  score: number;
  match_reasons: string | null;
  professors: Professor;
};

// Map majors to likely relevant departments. Used to narrow the candidate set
// before running an LLM, which is the real perf win.
const MAJOR_TO_DEPARTMENTS: Record<string, string[]> = {
  "computer science": ["Computer Science", "Engineering", "Mathematics"],
  "cs": ["Computer Science", "Engineering", "Mathematics"],
  "software engineering": ["Computer Science", "Engineering"],
  "data science": ["Computer Science", "Mathematics", "Engineering"],
  "ai": ["Computer Science", "Engineering"],
  "math": ["Mathematics", "Physics", "Computer Science"],
  "mathematics": ["Mathematics", "Physics", "Computer Science"],
  "physics": ["Physics", "Mathematics", "Materials Science", "Engineering"],
  "chemistry": ["Chemistry", "Materials Science", "Biology"],
  "biology": ["Biology", "Neuroscience", "Medicine"],
  "neuroscience": ["Neuroscience", "Biology", "Psychology", "Medicine"],
  "psychology": ["Psychology", "Neuroscience"],
  "economics": ["Economics", "Business", "Mathematics"],
  "business": ["Business", "Economics"],
  "finance": ["Business", "Economics", "Mathematics"],
  "medicine": ["Medicine", "Biology", "Neuroscience"],
  "biomedical": ["Medicine", "Biology", "Engineering"],
  "mechanical engineering": ["Engineering", "Materials Science", "Physics"],
  "electrical engineering": ["Engineering", "Computer Science", "Physics"],
  "chemical engineering": ["Engineering", "Chemistry", "Materials Science"],
  "civil engineering": ["Engineering", "Environmental Science"],
  "materials science": ["Materials Science", "Chemistry", "Engineering", "Physics"],
  "environmental": ["Environmental Science", "Biology", "Chemistry"],
  "environmental science": ["Environmental Science", "Biology", "Chemistry"],
};

function departmentsForMajor(major: string): string[] {
  const key = major.trim().toLowerCase();
  if (!key || key === "undeclared") return [];
  if (MAJOR_TO_DEPARTMENTS[key]) return MAJOR_TO_DEPARTMENTS[key];
  for (const [k, v] of Object.entries(MAJOR_TO_DEPARTMENTS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return [];
}

function pickRotatingRelevant(scores: MatchScoreRow[], count = 10): MatchScoreRow[] {
  if (scores.length <= count) return scores;

  const strong = scores.filter((s) => s.score >= 70);
  const good = scores.filter((s) => s.score >= 45 && s.score < 70);
  const rest = scores.filter((s) => s.score < 45);

  // Prioritize strong matches; rotate within each band so refresh varies results
  // while still showing high-relevance professors.
  const pickFrom = (arr: MatchScoreRow[], n: number) =>
    [...arr].sort(() => Math.random() - 0.5).slice(0, n);

  const picks: MatchScoreRow[] = [];
  picks.push(...pickFrom(strong, Math.min(strong.length, count)));
  if (picks.length < count) picks.push(...pickFrom(good, count - picks.length));
  if (picks.length < count) picks.push(...pickFrom(rest, count - picks.length));

  return picks.sort((a, b) => b.score - a.score);
}

interface BatchScore {
  professor_id: string;
  score: number;
  reason: string;
}

async function batchScore(
  anthropic: Anthropic,
  major: string,
  bio: string,
  candidates: Professor[]
): Promise<BatchScore[]> {
  if (candidates.length === 0) return [];

  const lines = candidates.map((p) => {
    const themes = (p.scraped_papers as ScrapedPapers | null)?.key_themes?.join(", ") ?? "";
    const research = p.research_summary ?? (p.research_interests ?? []).join(", ") ?? "";
    const info = [research, themes].filter(Boolean).join(" | ").slice(0, 400);
    return `- id: ${p.id}\n  name: ${p.name}\n  dept: ${p.department ?? ""}\n  research: ${info}`;
  });

  const prompt = `You are helping a student find research-fit professors.

Student major: ${major}
Student bio: ${bio || "(none provided)"}

Score each professor 0-100 for how relevant their research is to this student's major and interests. Reward matches in the same field and closely related fields. Penalize unrelated fields. Prefer professors with clear, specific research overlap.

Professors:
${lines.join("\n")}

Return ONLY a JSON array, one object per professor, no extra text. Format:
[{"professor_id": "uuid", "score": 0-100, "reason": "<=15 words"}]`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "[]";
    const match = text.match(/\[[\s\S]*\]/);
    const arr: BatchScore[] = JSON.parse(match ? match[0] : text);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const force = body?.force === true;

    if (!force) {
      const { data: existing } = await supabase
        .from("professor_match_scores")
        .select("*, professors(*)")
        .eq("user_id", user.id)
        .order("score", { ascending: false })
        .limit(40);

      if (existing && existing.length > 0) {
        const rotating = pickRotatingRelevant(existing as MatchScoreRow[]);
        return NextResponse.json({ scores: rotating, cached: true });
      }
    }

    const [{ data: profileData }, { data: usersData }] = await Promise.all([
      supabase.from("user_profiles").select("*").eq("id", user.id).single(),
      supabase.from("users").select("major, bio, name").eq("id", user.id).single(),
    ]);

    const major = profileData?.major ?? usersData?.major ?? "undeclared";
    const bio = profileData?.bio ?? usersData?.bio ?? "";

    // Narrow the candidate set before running the LLM.
    const relevantDepts = departmentsForMajor(major);
    let candidates: Professor[] = [];

    if (relevantDepts.length > 0) {
      const { data: byDept } = await supabase
        .from("professors")
        .select("*")
        .in("department", relevantDepts)
        .limit(40);
      candidates = (byDept as Professor[]) ?? [];
    }

    if (candidates.length < 15) {
      const { data: extras } = await supabase
        .from("professors")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40 - candidates.length);
      const existingIds = new Set(candidates.map((c) => c.id));
      for (const p of (extras as Professor[]) ?? []) {
        if (!existingIds.has(p.id)) candidates.push(p);
      }
    }

    if (candidates.length === 0) {
      return NextResponse.json({ scores: [], cached: false });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const scored = await batchScore(anthropic, major, bio, candidates);

    const byId = new Map(candidates.map((p) => [p.id, p]));
    const valid = scored.filter((s) => byId.has(s.professor_id));

    await supabase.from("professor_match_scores").delete().eq("user_id", user.id);
    if (valid.length > 0) {
      await supabase.from("professor_match_scores").insert(
        valid.map((s) => ({
          user_id: user.id,
          professor_id: s.professor_id,
          score: Math.max(0, Math.min(100, Math.round(s.score))),
          match_reasons: s.reason ?? "",
        }))
      );
    }

    const { data: saved } = await supabase
      .from("professor_match_scores")
      .select("*, professors(*)")
      .eq("user_id", user.id)
      .order("score", { ascending: false })
      .limit(40);

    const rotating = pickRotatingRelevant((saved ?? []) as MatchScoreRow[]);
    return NextResponse.json({ scores: rotating, cached: false });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}
