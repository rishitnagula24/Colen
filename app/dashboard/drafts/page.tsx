import { createClient } from "@/lib/supabase/server";
import DraftsClient from "./DraftsClient";

export default async function DraftsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: drafts } = await supabase
    .from("email_drafts")
    .select("id, generated_subject, generated_body, goal_type, status, created_at, professor_id, professors:professor_id(name, school)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const items = ((drafts ?? []) as unknown) as Array<{
    id: string;
    generated_subject: string | null;
    generated_body: string | null;
    goal_type: string | null;
    status: string;
    created_at: string;
    professor_id: string;
    professors: { name: string; school: string | null } | null;
  }>;

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Drafts</h1>
        <p className="text-sm text-white/40 mt-0.5">{items.length} saved draft{items.length !== 1 ? "s" : ""}</p>
      </div>
      <DraftsClient initialDrafts={items} />
    </div>
  );
}
