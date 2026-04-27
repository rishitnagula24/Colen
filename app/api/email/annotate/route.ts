import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { subject, body } = await req.json();
    if (!body) return NextResponse.json({ error: "Missing email body" }, { status: 400 });

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = `You are a professor. You receive dozens of cold emails from students every week. You just read this one.

Go through it like you actually would — quickly, a little skeptical, looking for reasons to either respond or move on. Annotate 4–7 specific phrases or sentences that caught your attention, for good or bad reasons.

Rules:
- Each "quote" must be an exact substring from the Body below — copy it character-for-character
- Keep quotes to a phrase or one sentence, not a whole paragraph
- "type": "good" if this part makes you more likely to reply, "fix" if it hurts or should change
- "comment": your honest gut reaction to that specific phrase — one direct sentence, as if you're thinking it while reading
- Be specific — not generic advice like "add more detail". React to what's actually written.
- "likelihood_to_reply": your real gut answer after reading: low, medium, or high
- "overall_impression": one sentence you'd say to a colleague if they asked what you thought of this email

Return ONLY valid JSON:
{"overall_impression": "string", "likelihood_to_reply": "low | medium | high", "annotations": [{"quote": "exact phrase", "type": "good | fix", "comment": "reaction"}]}

Subject: ${subject}
Body:
${body}`;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "{}";
    let result: { overall_impression: string; likelihood_to_reply: string; annotations: { quote: string; type: "good" | "fix"; comment: string }[] };
    try {
      result = JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      result = m ? JSON.parse(m[0]) : { overall_impression: "", likelihood_to_reply: "medium", annotations: [] };
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}
