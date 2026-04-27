import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardSidebar from "@/components/dashboard/Sidebar";
import type { UserProfile } from "@/types/database";

export default async function ProfessorsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("users")
    .select("name, email, platform_email, onboarded")
    .eq("id", user.id)
    .single();

  const profile = data as Pick<UserProfile, "name" | "email" | "platform_email" | "onboarded"> | null;
  if (profile && !profile.onboarded) redirect("/onboarding");

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#0a0a0a" }}>
      <DashboardSidebar
        userName={profile?.name ?? null}
        userEmail={profile?.email ?? user.email ?? ""}
        platformEmail={profile?.platform_email ?? null}
      />
      <main className="flex-1 ml-14 min-h-screen">{children}</main>
    </div>
  );
}
