import { createClient } from "@/lib/supabase/server";
import type { WritingSample } from "@/types/database";
import WritingStyleClient from "./WritingStyleClient";

export default async function WritingStylePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: samples } = user
    ? await supabase
        .from("writing_samples")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return <WritingStyleClient initialSamples={(samples as WritingSample[]) ?? []} />;
}
