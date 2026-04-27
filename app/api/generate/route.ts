import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { Professor, UserProfile } from "@/types/database";

const Schema = z.object({
  professorId: z.string().uuid(),
  goalType: z.enum(["research", "mentorship", "referral"]),
  experience: z.string().default(""),
  specificAsk: z.string().default(""),
  tone: z.enum(["scholarly", "personal", "bold", "brief"]).default("scholarly"),
});

const TONE_INSTRUCTION = {
  scholarly:
    "scholarly and academic — use formal language, address them strictly as Dr. [Last Name], write in three distinct paragraphs: (1) open by referencing a specific paper or concept from their research with precise terminology, (2) introduce your credentials and how they align with their work, (3) make a concrete, specific ask. Never use casual language, contractions, or vague flattery.",
  personal:
    "personal and genuinely human — write in a warm first-person voice, mention ONE very specific thing about their research that personally resonated with you (not generic praise), use natural contractions, let your actual personality come through. This email should sound like a real person wrote it at midnight because they were excited, not like a template. Still professional but never stiff.",
  bold:
    "confident and value-first — open the FIRST sentence with your single strongest credential or most relevant achievement (not an introduction to yourself). Frame the entire email as a mutual opportunity: you bring X, they can offer Y. Be direct about what you want and why you're qualified to ask for it. Assertive without arrogance. This is the tone of someone who knows their worth.",
  brief:
    "ultra-brief and ruthless — the entire email body must be under 100 words, no exceptions. One sentence about yourself. One sentence with a specific connection to one piece of their work (cite it by name). One sentence ask. No filler, no pleasantries beyond a single-word greeting, no 'I hope this email finds you well', no closing paragraph. Every single word must justify its existence.",
};

const GOAL_MAP = {
  research: "joining their research lab / getting a research opportunity",
  mentorship: "mentorship and career guidance in this field",
  referral: "a recommendation letter or referral",
};

const MANAGED_AGENT_BETA = "managed-agents-2026-04-01";

async function runManagedAgentTurn(client: Anthropic, prompt: string): Promise<string | null> {
  const agentId = process.env.ANTHROPIC_MANAGED_AGENT_ID;
  const environmentId = process.env.ANTHROPIC_MANAGED_ENVIRONMENT_ID;
  if (!agentId || !environmentId) return null;

  const session = await client.beta.sessions.create({
    agent: agentId,
    environment_id: environmentId,
    title: "colen-email-generation",
    metadata: { source: "api/generate" },
    betas: [MANAGED_AGENT_BETA],
  });

  try {
    await client.beta.sessions.events.send(
      session.id,
      {
        events: [
          {
            type: "user.message",
            content: [{ type: "text", text: prompt }],
          },
        ],
        betas: [MANAGED_AGENT_BETA],
      },
    );

    // Poll the latest events briefly until we receive the agent text response.
    for (let i = 0; i < 12; i++) {
      const eventsPage = await client.beta.sessions.events.list(
        session.id,
        { order: "desc", betas: [MANAGED_AGENT_BETA] },
      );
      const events = (eventsPage.data ?? []) as Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
      const agentMessage = events.find((evt) => evt.type === "agent.message");
      const text = agentMessage?.content?.find((block) => block.type === "text")?.text?.trim();
      if (text) return text;

      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    return null;
  } finally {
    // Keep the managed agent workspace tidy.
    await client.beta.sessions.archive(session.id, { betas: [MANAGED_AGENT_BETA] }).catch(() => {});
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const json = await req.json();
    const parsed = Schema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const { professorId, goalType, experience, specificAsk, tone } = parsed.data;

    const [profResult, profileResult, samplesResult] = await Promise.all([
      supabase.from("professors").select("*").eq("id", professorId).single(),
      supabase.from("users").select("*").eq("id", user.id).single(),
      supabase
        .from("writing_samples")
        .select("content")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    const professor = profResult.data as Professor | null;
    const profile = profileResult.data as UserProfile | null;
    const writingSamples = (samplesResult.data ?? []) as { content: string | null }[];

    if (!professor) return NextResponse.json({ error: "Professor not found" }, { status: 404 });

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const combinedSamples = writingSamples
      .map((s) => s.content ?? "")
      .filter(Boolean)
      .join("\n\n---\n\n")
      .slice(0, 3000);

    const writingStyleSection =
      combinedSamples.length > 0
        ? `STUDENT WRITING SAMPLES — you MUST write in a voice that sounds like this exact person. Match their vocabulary, sentence length, punctuation habits, and natural tone. This email must feel like they wrote it, not like AI:
${combinedSamples}`
        : `No writing samples provided. Use a natural, authentic student voice — avoid corporate or AI-sounding language.`;

    const researchInterests = Array.isArray(professor.research_interests)
      ? professor.research_interests.join(", ")
      : (professor.research_interests as string | null) ?? "";

    const emailPrompt = `You are helping a college student write a personalized cold email to a professor. Your single most important job is to make this sound like the student actually wrote it — not like AI.

${writingStyleSection}

STUDENT PROFILE:
- Name: ${profile?.name ?? "A student"}
- School: ${profile?.school ?? "their university"}
- Major: ${profile?.major ?? "undeclared"}
- Bio: ${profile?.bio ?? ""}

PROFESSOR:
- Name: ${professor.name}
- Title: ${professor.title ?? "Professor"}
- Department: ${professor.department ?? ""}
- School: ${professor.school ?? ""}
- Research: ${researchInterests}

EMAIL DETAILS:
- Goal: ${GOAL_MAP[goalType]}
- Student experience / context: ${experience || "Not provided"}
- Specific ask: ${specificAsk || "An introductory meeting or call"}
- Tone: ${TONE_INSTRUCTION[tone]}

Write the cold email. Non-negotiable rules:
1. Reference something SPECIFIC from the professor's research — not generic flattery
2. One clear, specific, easy-to-fulfill ask
3. Length: brief tone = under 100 words strictly; bold/personal = 130–180 words; scholarly = 170–230 words
4. MUST match the student's writing voice from the samples above
5. The tone instruction above OVERRIDES everything — if the tone says brief, be brief even if it feels rude

Return ONLY valid JSON, no markdown: {"subject": "...", "body": "..."}`;

    // Prefer Anthropic Managed Agent (if configured); otherwise fall back to direct model call.
    const managedText = await runManagedAgentTurn(anthropic, emailPrompt);
    let emailText = managedText ?? "";

    if (!emailText) {
      const emailMsg = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: emailPrompt }],
      });
      emailText = emailMsg.content[0].type === "text" ? emailMsg.content[0].text : "";
    }
    let emailResult: { subject: string; body: string };
    try {
      emailResult = JSON.parse(emailText);
    } catch {
      const m = emailText.match(/\{[\s\S]*\}/);
      if (!m) return NextResponse.json({ error: "AI returned an invalid response" }, { status: 500 });
      emailResult = JSON.parse(m[0]);
    }

    // Second call: professor POV feedback with inline annotations
    const feedbackPrompt = `You are a professor who receives dozens of cold emails from students every week. Analyze this specific email and identify 3 to 5 exact moments in the text — phrases or sentences — that you would notice as a professor reading it. Some should be things that genuinely work, others should be things that would make you less likely to reply.

Subject: ${emailResult.subject}

Body:
${emailResult.body}

Rules you must follow:
1. Each annotation MUST quote text that exists verbatim in the Body above — copy it character-for-character. Do not paraphrase or summarize.
2. Your comment must be specific to what this professor would actually think reading that exact phrase — not generic student advice. Think: "this phrase signals that they actually read my work" or "every student who cold-emails me writes this exact line."
3. 3 to 5 annotations max. Pick the moments that matter most.
4. overall_impression: one blunt sentence capturing your gut reaction as this specific professor after reading the whole email.

Return ONLY valid JSON, no markdown, no extra text:
{
  "likelihood_to_reply": "low",
  "overall_impression": "string",
  "annotations": [
    { "quote": "exact verbatim phrase from the body", "type": "good", "comment": "specific professor thought" },
    { "quote": "exact verbatim phrase from the body", "type": "fix", "comment": "specific professor thought" }
  ]
}

likelihood_to_reply must be exactly one of: "low", "medium", "high"
type must be exactly one of: "good", "fix"`;

    const feedbackMsg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [{ role: "user", content: feedbackPrompt }],
    });

    const feedbackText = feedbackMsg.content[0].type === "text" ? feedbackMsg.content[0].text : "";
    let feedback: {
      likelihood_to_reply: "low" | "medium" | "high";
      overall_impression: string;
      annotations: { quote: string; type: "good" | "fix"; comment: string }[];
    };
    try {
      feedback = JSON.parse(feedbackText);
    } catch {
      const m = feedbackText.match(/\{[\s\S]*\}/);
      feedback = m
        ? JSON.parse(m[0])
        : { likelihood_to_reply: "medium", overall_impression: "", annotations: [] };
    }

    // Save to email_drafts
    const { data: draft } = await supabase
      .from("email_drafts")
      .insert({
        user_id: user.id,
        professor_id: professorId,
        goal_type: goalType,
        research_answers: { experience, specificAsk, tone },
        generated_subject: emailResult.subject,
        generated_body: emailResult.body,
        professor_perspective: feedback,
        status: "draft",
      } as never)
      .select("id")
      .single();

    // Also log to ai_generations
    await supabase.from("ai_generations").insert({
      user_id: user.id,
      professor_id: professorId,
      goal_type: goalType,
      form_inputs: { experience, specificAsk, tone },
      generated_subject: emailResult.subject,
      generated_body: emailResult.body,
      used: false,
    } as never);

    return NextResponse.json({
      subject: emailResult.subject,
      body: emailResult.body,
      draftId: (draft as { id: string } | null)?.id ?? null,
      feedback,
      hasWritingSamples: writingSamples.length > 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Generate error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
