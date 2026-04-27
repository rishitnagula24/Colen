import { NextResponse } from "next/server";
import { z } from "zod";
import { parseDeadlines } from "@/lib/syllabus/parseDeadlines";
import { makeIcs } from "@/lib/syllabus/makeIcs";

const BodySchema = z.object({
  text: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = BodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const deadlines = parseDeadlines(parsed.data.text);
  const ics = makeIcs(deadlines);

  return NextResponse.json({ deadlines, ics });
}
