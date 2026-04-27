import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("users")
    .select("onboarded")
    .eq("id", user.id)
    .single();

  if (data?.onboarded === false) redirect("/onboarding");

  return <DashboardShell>{children}</DashboardShell>;
}
