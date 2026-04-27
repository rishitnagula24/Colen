import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  );
}

function buildRawEmail(to: string, from: string, subject: string, body: string): string {
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    body,
  ];
  return Buffer.from(lines.join("\r\n")).toString("base64url");
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { draftId, subject, body, professorEmail } = await req.json();
    if (!draftId || !subject || !body || !professorEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data: tokenRow } = await supabase
      .from("user_gmail_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!tokenRow) {
      return NextResponse.json({ error: "Gmail not connected", code: "NO_GMAIL" }, { status: 400 });
    }

    const oauth2 = getOAuthClient();
    oauth2.setCredentials({
      access_token: tokenRow.access_token,
      refresh_token: tokenRow.refresh_token,
      expiry_date: new Date(tokenRow.expires_at).getTime(),
    });

    // Auto-refresh if expired
    const isExpired = new Date(tokenRow.expires_at) <= new Date(Date.now() + 60_000);
    if (isExpired) {
      const { credentials } = await oauth2.refreshAccessToken();
      oauth2.setCredentials(credentials);
      await supabase.from("user_gmail_tokens").update({
        access_token: credentials.access_token!,
        expires_at: new Date(credentials.expiry_date!).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);
    }

    const gmail = google.gmail({ version: "v1", auth: oauth2 });
    const raw = buildRawEmail(professorEmail, tokenRow.gmail_address, subject, body);

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    await supabase
      .from("email_drafts")
      .update({ status: "sent" })
      .eq("id", draftId)
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Send failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
