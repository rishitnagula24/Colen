import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Professor, UserProfile } from "@/types/database";
import ComposeClient from "@/components/dashboard/ComposeClient";

export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{ professor?: string; professorId?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: professors }, { data: profile }, { count: samplesCount }, { data: favorites }] = await Promise.all([
    supabase.from("professors").select("*").order("name"),
    supabase.from("users").select("*").eq("id", user.id).single(),
    supabase.from("writing_samples").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("professor_favorites").select("professor_id").eq("user_id", user.id),
  ]);

  const starredIds = (favorites ?? []).map((f: { professor_id: string }) => f.professor_id);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <ComposeClient
        professors={(professors ?? []) as Professor[]}
        initialProfessorId={params.professorId ?? params.professor ?? null}
        userProfile={profile as UserProfile | null}
        writingSamplesCount={samplesCount ?? 0}
        starredProfessorIds={starredIds}
      />
    </div>
  );
}
