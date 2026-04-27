import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import type { Professor, ScrapedPapers, MoodType } from "@/types/database";

const MOOD_INSTRUCTIONS: Record<MoodType, string> = {
  direct:
    "DIRECT TONE — structural rules: (1) First sentence IS the point, no warm-up. (2) Sentences under 12 words on average. (3) State the ask in the final paragraph, one sentence. (4) Cut every adjective that isn't doing real work. No 'really', 'very', 'incredible'. (5) No transitional filler like 'I wanted to reach out because' — just make the move.",
  curious:
    "CURIOUS TONE — structural rules: (1) Open with something specific from their research that pulled you in — a result, a claim, a method — and say why it got you thinking. (2) Ask one genuine question you couldn't find the answer to. Not rhetorical. A real question you want answered. (3) Curiosity should feel earned, not performed — no 'fascinating' or 'intriguing'. Show the thought process, not the reaction to it. (4) End with a low-friction ask — a question or a short call, not a 'would love to connect'.",
  confident:
    "CONFIDENT TONE — structural rules: (1) Write as a peer, not a supplicant. No permission-asking language. (2) Open by naming their work and making a specific observation about it — as if you're having a conversation, not applying for something. (3) State your own work or angle plainly and without hedging — 'I've been working on X' not 'I've been trying to learn about X'. (4) The ask is a proposal, not a request — 'Would it make sense to talk?' not 'Would it be okay if I asked you something?'. (5) No apology for taking their time. No self-deprecation. (6) Sentences are declarative. Avoid questions except for the final ask.",
  concise:
    "CONCISE TONE — structural rules: (1) HARD cap: 70–100 words in the body, no exceptions. (2) No paragraph longer than 2 sentences. (3) The email has exactly three parts: one sentence naming their specific work, one or two sentences about why you're relevant, one sentence with the ask. (4) Cut every transition word. Cut every filler phrase. If a word isn't load-bearing, delete it. (5) The subject line should be 4 words or fewer. (6) No sign-off pleasantries except the name.",
};

const GOAL_INSTRUCTIONS: Record<string, string> = {
  research:
    "GOAL — research opportunity: The ask must be about joining the lab or contributing to a specific project. Reference the specific research area you want to work on. Propose something concrete: a meeting to discuss your fit, a chance to show preliminary work, or an internship/RA position. Do NOT say 'I would love to learn' — say what you want to DO.",
  mentorship:
    "GOAL — mentorship: The ask is for guidance, not a job. Be specific about what kind of guidance: career advice, feedback on your research direction, a recommendation on what to read or do next. Make it clear you're not asking for a big time commitment — coffee chat, 20-minute call, a quick email reply. Don't make it about you getting into grad school — make it about the specific question or challenge you're facing.",
  referral:
    "GOAL — referral or recommendation: You're asking for a letter of rec or professional referral. Be direct about it — state what you're applying for and why you thought of this professor specifically. Give them an easy out if they don't know you well enough. Include a timeline if relevant. This ask requires the most credibility — you MUST reference prior contact or coursework if any exists.",
};

// Analyze writing samples to extract real style patterns
function analyzeStyle(samples: string[]): string {
  if (!samples.length) return "";
  const combined = samples.join(" ");
  const sentences = combined.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const avgLen = sentences.length
    ? Math.round(sentences.reduce((a, s) => a + s.split(/\s+/).length, 0) / sentences.length)
    : 15;
  const usesDash = combined.includes("—") || combined.includes(" - ");
  const usesParens = combined.includes("(");
  const shortSentences = sentences.filter(s => s.split(/\s+/).length <= 6).length;
  const burstiness = sentences.length > 0 ? Math.round((shortSentences / sentences.length) * 100) : 0;

  // Detect red flags they already have in their own writing
  const informal = /\b(kinda|honestly|actually|pretty much|i mean|like,|just|yeah)\b/i.test(combined);
  const fragments = sentences.some(s => s.split(/\s+/).length <= 4 && !s.includes(","));

  return `STYLE ANALYSIS FROM THIS STUDENT'S ACTUAL WRITING:
- Average sentence length: ${avgLen} words
- Short sentence frequency: ${burstiness}% of sentences are 6 words or under
- Uses em-dashes: ${usesDash ? "yes — incorporate them naturally" : "no — don't add them"}
- Uses parenthetical asides: ${usesParens ? "yes — use sparingly" : "no — avoid them"}
- Informal register: ${informal ? "yes — they write informally, match that" : "no — slightly more formal"}
- Writes in fragments: ${fragments ? "yes — use sentence fragments where it feels natural" : "no — stick to full sentences"}

Mirror these patterns exactly. Do not write smoother or more polished than their samples. If they write choppy and fast, write choppy and fast.`;
}

// Check for AI red-flag phrases that hurt authenticity
function redFlagCheck(body: string): string[] {
  const flags = [
    "I hope this email finds you well",
    "I am reaching out",
    "I would love to",
    "I am passionate about",
    "I came across your profile",
    "your impressive work",
    "I am writing to express",
    "please don't hesitate",
    "Thank you for your time and consideration",
    "I look forward to hearing from you",
    "kind regards",
    "warm regards",
    "I am a",
    "as a student of",
    "it would be an honor",
    "I have always been fascinated",
  ];
  return flags.filter(f => body.toLowerCase().includes(f.toLowerCase()));
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { professorId, goalType, mood = "direct", researchAnswers, cvText, paperUrl, draftId } = await req.json();
    if (!professorId || !goalType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [{ data: profileData }, { data: userData }, { data: samples }, { data: profData }] =
      await Promise.all([
        supabase.from("user_profiles").select("*").eq("id", user.id).single(),
        supabase.from("users").select("name, major, year, bio").eq("id", user.id).single(),
        supabase.from("writing_samples").select("content").eq("user_id", user.id),
        supabase.from("professors").select("*").eq("id", professorId).single(),
      ]);

    if (!profData) return NextResponse.json({ error: "Professor not found" }, { status: 404 });

    const prof = profData as Professor;
    const name = profileData?.full_name ?? userData?.name ?? "A student";
    const major = profileData?.major ?? userData?.major ?? "undeclared";
    const year = profileData?.year ?? userData?.year ?? "undergraduate";
    const bio = profileData?.bio ?? userData?.bio ?? "";
    const hasSamples = (samples?.length ?? 0) > 0;

    const writingSamples = (samples ?? []).map((s) => s.content ?? "").filter(Boolean);
    const styleAnalysis = analyzeStyle(writingSamples);
    const writingText = writingSamples.join("\n\n---\n\n").slice(0, 3000);

    const scraped = prof.scraped_papers as ScrapedPapers | null;
    const keyThemes = scraped?.key_themes?.join(", ") ?? "";
    const researchText = prof.research_summary ?? prof.research_interests?.join(", ") ?? "";
    const paperTitles = scraped?.papers?.map(p => p.title) ?? [];

    const paperContext = scraped?.papers?.length
      ? scraped.papers
          .map((p, i) =>
            `Paper ${i + 1}: "${p.title}" (${p.year})${p.plain_summary ? `\n  → ${p.plain_summary}` : p.abstract_preview ? `\n  Abstract: ${p.abstract_preview}` : ""}`
          )
          .join("\n")
      : "";

    const answers = researchAnswers ?? {};
    const moodInstruction = MOOD_INSTRUCTIONS[mood as MoodType] ?? MOOD_INSTRUCTIONS.direct;
    const goalInstruction = GOAL_INSTRUCTIONS[goalType] ?? GOAL_INSTRUCTIONS.research;
    const hasAnswers = [answers.q1, answers.q2, answers.q3].some(Boolean);

    const studentContext = `=== STUDENT ===
${name}, ${year}, ${major}.${bio ? ` ${bio}` : ""}

=== PROFESSOR ===
${prof.name}${prof.department ? `, ${prof.department}` : ""} at ${prof.school ?? ""}.
Research: ${researchText}${keyThemes ? `. Key themes: ${keyThemes}` : ""}
${paperContext ? `Papers:\n${paperContext}` : ""}
${cvText ? `CV excerpt:\n${cvText.slice(0, 1200)}` : ""}
${paperUrl ? `Paper link: ${paperUrl}` : ""}

=== TONE TO USE ===
${moodInstruction}

=== GOAL / ASK ===
${goalInstruction}

${hasAnswers ? `=== STUDENT'S OWN WORDS — USE THESE AS THE CORE OF THE EMAIL ===
These are the student's actual thoughts. The email should be built around them, not around the professor data.
The professor data above is context — these answers below are the substance.
${answers.q1 ? `What specific research they've reviewed: ${answers.q1}` : ""}
${answers.q2 ? `What finding interests them and why: ${answers.q2}` : ""}
${answers.q3 ? `How it connects to their own work: ${answers.q3}` : ""}` : ""}

${styleAnalysis}
${writingText ? `\n=== STUDENT WRITING SAMPLES — COPY THIS VOICE EXACTLY ===\n${writingText}` : ""}`;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const emailMsg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: `You are ghostwriting a cold email for a college student. You have three jobs, ranked by importance:

1. FOLLOW THE TONE EXACTLY — The tone instructions tell you how to structure every sentence, what to open with, what the ask looks like, what words to avoid. These are not suggestions. If the tone says "first sentence IS the point," the first sentence IS the point. If it says "ask one genuine question," that's the only ask.

2. BUILD THE EMAIL AROUND THE STUDENT'S OWN WORDS — If the student provided their own answers (what they read, what they found interesting, how it connects to their work), those answers are the email. Extract the specific thought they had, render it in their voice, make it the center. The professor's research data is background verification, not the content.

3. THE ASK MUST MATCH THE GOAL — research = lab/project access. mentorship = guidance or advice. referral = letter of rec. The ask must be concrete and low-friction, not "I would love to connect" or "I look forward to hearing from you."

VOICE: If writing samples exist, copy their exact rhythm, vocabulary level, and sentence patterns. Do not smooth it out. Do not fix their casual grammar.
BURSTINESS: Vary sentence length. Short punchy. Then a longer one that unpacks something. Real humans write this way.
LENGTH: 120–200 words in the body.
BANNED — never write: "I hope this email finds you well", "I am reaching out", "I would love to", "I am passionate about", "it would be an honor", "please don't hesitate", "I look forward to hearing from you", "Thank you for your time", "kind regards", "best regards", "warm regards".
IMPERFECTION: Fragments are fine. Starting with "And" or "But" is fine. Don't over-polish.`,
      messages: [
        {
          role: "user",
          content: `Student: Maya, junior, Biology. Bio: doing undergrad research on C. elegans, interested in aging.
Professor: Professor Chen, Biology at UCSF.
Research: mTOR signaling, longevity pathways, dietary restriction in model organisms.
Papers:
Paper 1: "Tissue-Specific mTORC1 Inhibition Extends Lifespan in C. elegans" (2022)
  → Inhibiting mTORC1 specifically in intestinal cells—not neurons—drives the majority of lifespan extension seen with dietary restriction. Challenges assumption that neuronal sensing is primary driver.
Goal: research
Mood: direct — First sentence states why you're writing. Short sentences.
Context Q1: I read this paper while trying to understand why my own DR protocol in worms isn't giving consistent results — the tissue-specificity finding might explain it.
STYLE ANALYSIS: Average sentence 9 words. 40% short sentences. No em-dashes. Informal register. Uses fragments.
STUDENT WRITING SAMPLES:
Been running DR experiments for six weeks. Results are inconsistent. Some worms live longer, some don't. Can't figure out if it's the protocol or something else.
---
Talked to my PI about it. She said keep going. I'm not sure that's the answer.
Return only a JSON object: {"subject": "string", "body": "string"}`,
        },
        {
          role: "assistant",
          content: `{"subject": "tissue-specific mTOR paper — question about DR","body": "Hi Professor Chen,\\n\\nI've been running dietary restriction experiments in C. elegans for the past six weeks and getting inconsistent lifespan results. Read your 2022 paper on tissue-specific mTORC1 inhibition and I think the intestinal-vs-neuronal finding might be why.\\n\\nI'm a junior in the biology department doing undergrad research. My PI doesn't work on longevity directly, so I've been piecing this together on my own.\\n\\nQuick question: in the tissue-specific knockdown experiments, how did you handle animals that showed partial inhibition? That's where I'm losing consistency.\\n\\nThanks,\\nMaya"}`,
        },
        {
          role: "user",
          content: `=== STUDENT ===
Jordan, senior, Computer Science. Building a neural net-based compiler optimization tool for their thesis.

=== PROFESSOR ===
Professor Lim, CS at MIT.
Research: program synthesis, neural program repair, learned compiler passes.
Papers:
Paper 1: "Learning to Rewrite: Neural Compiler Optimization at Scale" (2023)
  → Trained a transformer on 40M LLVM IR transformations to predict optimization sequences. Beat hand-tuned passes on 3 out of 5 benchmarks. Key finding: model generalizes across architectures when trained on diverse IR.

=== TONE TO USE ===
CONFIDENT TONE — Write as a peer. No permission-asking. Open with an observation. The ask is a proposal.

=== GOAL / ASK ===
GOAL — research opportunity: Ask about joining the lab or contributing to a specific project.

Return only a JSON object: {"subject": "string", "body": "string"}`,
        },
        {
          role: "assistant",
          content: `{"subject": "compiler optimization research — potential collaboration","body": "Hi Professor Lim,\\n\\nYour 2023 paper on learned compiler passes is directly relevant to what I'm working on. The cross-architecture generalization result is the part I keep coming back to — it suggests the model is learning something real about IR structure, not just memorizing benchmark-specific patterns.\\n\\nI'm a senior building a thesis project on transformer-based optimization for RISC-V targets. My current approach uses the same IR-level representation. I'd like to discuss whether there's a way to contribute to your work or extend it toward the specific architecture constraints I'm dealing with.\\n\\nWould a 20-minute conversation make sense?\\n\\nJordan"}`,
        },
        {
          role: "user",
          content: `=== STUDENT ===
Alex, junior, Neuroscience. Bio: studying decision-making under uncertainty.

=== PROFESSOR ===
Professor Rangel, Neuroscience at Caltech.
Research: computational models of value-based decision making, dopamine signaling, fMRI studies of reward.
Papers:
Paper 1: "Dopamine Prediction Error Signals Scale With Subjective Uncertainty" (2022)
  → Dopamine PE signals are modulated by how uncertain the subject is about the outcome — not just whether the outcome was better or worse than expected. Challenges the standard RPE model.

=== TONE TO USE ===
CONCISE TONE — 70–100 words max. Three parts: their work, your relevance, the ask.

=== GOAL / ASK ===
GOAL — research opportunity: Ask about joining the lab.

Return only a JSON object: {"subject": "string", "body": "string"}`,
        },
        {
          role: "assistant",
          content: `{"subject": "RPE + uncertainty paper","body": "Hi Professor Rangel,\\n\\nYour 2022 finding that dopamine PE signals scale with uncertainty — not just prediction error — changes how I'm thinking about my own decision-making research.\\n\\nI'm a junior studying value-based choice under uncertainty. I'd like to explore whether there's a fit for me in your lab.\\n\\nOpen to a brief call if that's easier.\\n\\nAlex"}`,
        },
        {
          role: "user",
          content: `${studentContext}
Return only a JSON object in exactly this format with no extra text: {"subject": "string", "body": "string"}`,
        },
      ],
    });

    const emailText = emailMsg.content[0].type === "text" ? emailMsg.content[0].text : "{}";
    let emailResult: { subject: string; body: string };
    try {
      emailResult = JSON.parse(emailText);
    } catch {
      const m = emailText.match(/\{[\s\S]*\}/);
      if (!m) return NextResponse.json({ error: "AI returned invalid response" }, { status: 500 });
      emailResult = JSON.parse(m[0]);
    }

    // ── Deep scoring ───────────────────────────────────────────────────────────
    const redFlags = redFlagCheck(emailResult.body);
    const wc = emailResult.body.trim().split(/\s+/).length;
    const paperMentioned = paperTitles.some(t =>
      emailResult.body.toLowerCase().includes(t.toLowerCase().slice(0, 20))
    );

    const scorePrompt = `You are scoring a student cold email to a professor. This is a rigorous evaluation — not generic feedback. Score on 6 dimensions.

SCORING RUBRIC:

1. OPENING LINE (0–20 pts)
- 18–20: First sentence names the professor's specific research/paper/finding and why they're writing
- 10–17: Gets specific quickly but doesn't open with it
- 5–9: Generic opener that delays the point
- 0–4: Template opener ("I hope this email finds you well", "I am reaching out", etc.)

2. RESEARCH SPECIFICITY (0–25 pts)
- 22–25: Names a specific paper + quotes a specific finding/result from it
- 15–21: Names a paper or specific topic but doesn't show deep reading
- 8–14: Mentions research area only, no specific work referenced
- 0–7: Generic, could apply to any professor

3. AUTHENTIC VOICE (0–20 pts)
- 17–20: Reads like a real student wrote it — specific observations, natural rhythm, imperfect
- 10–16: Mostly authentic but some generic phrases sneak in
- 5–9: Feels templated or over-polished
- 0–4: Obvious AI or template language

4. CLARITY OF ASK (0–15 pts)
- 13–15: One specific, low-friction ask (15-min call, single question, meeting)
- 8–12: Has an ask but vague ("connect", "learn more")
- 3–7: Ask buried or unclear
- 0–2: No ask at all

5. LENGTH (0–10 pts)
- 10: 120–200 words (ideal for cold email)
- 7: 80–120 or 200–260 words
- 4: 260–320 words
- 1: Under 80 or over 320 words

6. CREDIBILITY WITHOUT BRAGGING (0–10 pts)
- 9–10: Mentions relevant work/project/context that makes them a credible person to email
- 5–8: Some context given
- 1–4: No context — professor has no reason to know who this is
- 0: Overclaims or sounds entitled

AUTOMATIC DEDUCTIONS (apply after scoring):
${redFlags.length > 0 ? `- Found these red-flag phrases (−3 each): ${redFlags.join(", ")}` : "- No red-flag phrases detected"}
- Word count: ${wc} words
- Professor's paper title referenced: ${paperMentioned ? "yes (bonus already in specificity)" : "not detected — check manually"}

Return ONLY valid JSON, no extra text:
{"opening": number, "specificity": number, "voice": number, "ask": number, "length": number, "credibility": number, "deductions": number, "notes": {"opening": "one line", "specificity": "one line", "voice": "one line", "ask": "one line", "length": "one line", "credibility": "one line"}, "overall": "one sentence honest summary"}

Subject: ${emailResult.subject}
Body:
${emailResult.body}`;

    const scoreMsg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [{ role: "user", content: scorePrompt }],
    });

    const scoreText = scoreMsg.content[0].type === "text" ? scoreMsg.content[0].text : "{}";
    let scoreResult: {
      opening: number; specificity: number; voice: number; ask: number;
      length: number; credibility: number; deductions: number;
      notes: Record<string, string>; overall: string;
    };
    try {
      scoreResult = JSON.parse(scoreText);
    } catch {
      const m = scoreText.match(/\{[\s\S]*\}/);
      scoreResult = m ? JSON.parse(m[0]) : {
        opening: 0, specificity: 0, voice: 0, ask: 0, length: 0, credibility: 0,
        deductions: 0, notes: {}, overall: ""
      };
    }

    if (draftId) {
      await supabase
        .from("email_drafts")
        .update({ generated_subject: emailResult.subject, generated_body: emailResult.body })
        .eq("id", draftId)
        .eq("user_id", user.id);
    } else {
      const { data: draft } = await supabase
        .from("email_drafts")
        .insert({
          user_id: user.id,
          professor_id: professorId,
          goal_type: goalType,
          research_answers: answers,
          generated_subject: emailResult.subject,
          generated_body: emailResult.body,
          status: "draft",
        })
        .select("id")
        .single();

      return NextResponse.json({ email: emailResult, score: scoreResult, draftId: draft?.id ?? null, hasSamples });
    }

    return NextResponse.json({ email: emailResult, score: scoreResult, draftId, hasSamples });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}
