import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { Professor, UserProfile } from "@/types/database";

const Schema = z.object({
  professorId: z.string().uuid(),
  subject: z.string().min(1),
  body: z.string().min(1),
  threadId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { professorId, subject, body, threadId } = parsed.data;

  const [profResult, profileResult] = await Promise.all([
    supabase.from("professors").select("*").eq("id", professorId).single(),
    supabase.from("users").select("*").eq("id", user.id).single(),
  ]);

  const professor = profResult.data as Professor | null;
  const profile = profileResult.data as UserProfile | null;

  if (!professor) {
    return NextResponse.json({ error: "Professor not found" }, { status: 404 });
  }

  let resolvedThreadId = threadId;
  if (!resolvedThreadId) {
    const { data: thread, error } = await supabase
      .from("email_threads")
      .insert({
        user_id: user.id,
        professor_id: professorId,
        subject,
        status: "sent",
      } as never)
      .select()
      .single();

    if (error || !thread) {
      return NextResponse.json({ error: "Failed to create thread" }, { status: 500 });
    }
    resolvedThreadId = (thread as { id: string }).id;
  } else {
    await supabase
      .from("email_threads")
      .update({ status: "sent", updated_at: new Date().toISOString() } as never)
      .eq("id", resolvedThreadId);
  }

  const { error: msgError } = await supabase.from("email_messages").insert({
    thread_id: resolvedThreadId,
    direction: "outbound",
    body,
    sent_at: new Date().toISOString(),
  } as never);

  if (msgError) {
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }

  if (process.env.SENDGRID_API_KEY && professor.email && profile?.platform_email) {
    try {
      await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: professor.email, name: professor.name }] }],
          from: {
            email: profile.platform_email,
            name: `${profile.name ?? "A student"} via Colen`,
          },
          reply_to: { email: profile.platform_email },
          subject,
          content: [{ type: "text/plain", value: body }],
        }),
      });
    } catch {}
  }

  return NextResponse.json({ success: true, threadId: resolvedThreadId });
}
