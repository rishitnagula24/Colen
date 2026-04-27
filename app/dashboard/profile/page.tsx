import { createClient } from "@/lib/supabase/server";
import ProfileClient from "@/components/dashboard/ProfileClient";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ gmail?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { gmail } = await searchParams;

  const [{ data: profile }, { count: samplesCount }, { data: gmailToken }] = await Promise.all([
    supabase.from("users").select("*").eq("id", user.id).single(),
    supabase.from("writing_samples").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("user_gmail_tokens").select("gmail_address").eq("user_id", user.id).maybeSingle(),
  ]);

  return (
    <div className="px-6 py-10 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white/90">Profile</h1>
        <p className="mt-0.5 text-xs text-white/30">Personalizes your matches and emails.</p>
      </div>
      <ProfileClient
        profile={profile}
        userEmail={user.email ?? ""}
        writingSamplesCount={samplesCount ?? 0}
        gmailAddress={gmailToken?.gmail_address ?? null}
        gmailStatus={gmail ?? null}
      />
    </div>
  );
}
