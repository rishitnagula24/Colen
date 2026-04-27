import { createClient } from "@/lib/supabase/server";
import DashboardHome from "@/components/dashboard/DashboardHome";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("users").select("name").eq("id", user.id).single()
    : { data: null };

  return <DashboardHome userName={profile?.name ?? null} />;
}
