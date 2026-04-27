import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    const { name, email, phone } = await req.json();
    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Check for duplicate
    const { data: existing } = await supabase
      .from("waitlist")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (existing) {
      return NextResponse.json({ ok: true, alreadyJoined: true });
    }

    // Insert into waitlist
    const { error: insertError } = await supabase.from("waitlist").insert({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || null,
    });

    if (insertError) {
      console.error("Waitlist insert error:", insertError);
      return NextResponse.json({ error: "Could not save. Try again." }, { status: 500 });
    }

    // Send confirmation email via Resend (gracefully skip if key not set)
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Colen <noreply@colen.me>",
        to: email.trim(),
        subject: "You're on the Colen waitlist",
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#0a0a0a;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:0;">
  <div style="max-width:480px;margin:0 auto;padding:48px 24px;">
    <div style="margin-bottom:32px;">
      <span style="font-family:monospace;font-size:22px;color:#ffffff;letter-spacing:-0.5px;">(···)</span>
      <span style="font-size:18px;font-weight:600;color:#ffffff;margin-left:8px;">Colen</span>
    </div>

    <h1 style="font-size:22px;font-weight:600;color:#ffffff;margin:0 0 12px;">You're on the list, ${name.split(" ")[0]}.</h1>
    <p style="font-size:15px;color:rgba(255,255,255,0.5);margin:0 0 32px;line-height:1.6;">
      You're on the Colen waitlist. We'll reach out when your spot opens up.
    </p>

    <div style="border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px 24px;margin-bottom:32px;">
      <p style="font-size:13px;color:rgba(255,255,255,0.35);margin:0 0 8px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">What Colen does</p>
      <p style="font-size:14px;color:rgba(255,255,255,0.6);margin:0;line-height:1.7;">
        Writes cold emails to professors that actually sound like you wrote them —
        specific to their research, short, and direct. Built for students who want
        research opportunities, mentorship, or recommendations.
      </p>
    </div>

    <p style="font-size:13px;color:rgba(255,255,255,0.25);margin:0;">
      You signed up with ${email}${phone ? ` · ${phone}` : ""}.<br>
      If this wasn't you, ignore this email.
    </p>
  </div>
</body>
</html>`,
      }).catch((err) => console.error("Resend error:", err));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Waitlist error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
