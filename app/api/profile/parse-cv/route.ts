import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const PROMPT = `You are helping a college student build a profile that will be used to match them with professors for research, mentorship, or recommendation emails.

Read this student's resume/CV and do two things:

1. Write a 3–4 sentence first-person bio that highlights: their field of study, specific research interests or projects, technical skills, and academic goals. Naturally weave in academic and research keywords (e.g. "machine learning", "computational biology", "NLP", "climate modeling", "behavioral economics") so the bio can be matched against professor research profiles. It should sound like a real student introducing themselves — not a formal summary.

2. Extract a list of 8–15 research/academic keywords from the resume. These should be specific enough to match professor research topics (e.g. "transformer models", "reinforcement learning", "genomics", "urban planning" — not generic terms like "teamwork" or "communication").

Return ONLY a JSON object in exactly this format with no extra text:
{"bio": "string", "keywords": ["keyword1", "keyword2", ...]}`;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const ext = file.name.split(".").pop()?.toLowerCase();
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    let raw = "";

    if (ext === "pdf") {
      const buffer = Buffer.from(await file.arrayBuffer());
      const b64 = buffer.toString("base64");
      const msg: MessageParam = {
        role: "user",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } } as any,
          { type: "text", text: PROMPT },
        ],
      };
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 600,
        messages: [msg],
      });
      raw = message.content[0].type === "text" ? message.content[0].text : "{}";

    } else if (ext === "docx" || ext === "doc") {
      const buffer = Buffer.from(await file.arrayBuffer());
      const mammoth = await import("mammoth");
      const { value: text } = await mammoth.extractRawText({ buffer });
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 600,
        messages: [{ role: "user", content: `${PROMPT}\n\nResume text:\n${text.slice(0, 8000)}` }],
      });
      raw = message.content[0].type === "text" ? message.content[0].text : "{}";

    } else {
      return NextResponse.json({ error: "Upload a PDF, DOC, or DOCX file." }, { status: 400 });
    }

    let result: { bio: string; keywords: string[] };
    try {
      result = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) return NextResponse.json({ error: "Could not parse CV. Try a different file." }, { status: 500 });
      result = JSON.parse(m[0]);
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}
