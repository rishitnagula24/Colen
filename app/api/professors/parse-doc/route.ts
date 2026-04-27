import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const EXTRACT_PROMPT = `Extract all professor/faculty information from this document. For each person found, extract: name, title, department, school/university, email, and research_interests. Return ONLY a valid JSON array with no extra text or markdown. Each item must have exactly these keys: name, title, department, school, email, research_interests. Use empty string "" for any field not found. If no professors are found, return [].`;

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
          { type: "text", text: EXTRACT_PROMPT },
        ],
      };
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [msg],
      });
      raw = message.content[0].type === "text" ? message.content[0].text : "[]";

    } else if (ext === "docx" || ext === "doc") {
      const buffer = Buffer.from(await file.arrayBuffer());
      const mammoth = await import("mammoth");
      const { value: text } = await mammoth.extractRawText({ buffer });

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: `${EXTRACT_PROMPT}\n\nDocument text:\n${text.slice(0, 8000)}`,
          },
        ],
      });
      raw = message.content[0].type === "text" ? message.content[0].text : "[]";

    } else {
      return NextResponse.json({ error: "Unsupported file type. Use PDF, DOC, or DOCX." }, { status: 400 });
    }

    let professors: Array<Record<string, string>>;
    try {
      professors = JSON.parse(raw);
    } catch {
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) return NextResponse.json({ error: "Could not parse professor data from document." }, { status: 500 });
      professors = JSON.parse(match[0]);
    }

    return NextResponse.json({ professors });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}
