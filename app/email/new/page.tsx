import { createClient } from "@/lib/supabase/server";
import type { Professor } from "@/types/database";
import EmailNewClient from "./EmailNewClient";

interface PageProps {
  searchParams: Promise<{ professorId?: string }>;
}

export default async function EmailNewPage({ searchParams }: PageProps) {
  const { professorId } = await searchParams;
  const supabase = await createClient();

  let professor: Professor | null = null;
  if (professorId) {
    const { data } = await supabase
      .from("professors")
      .select("*")
      .eq("id", professorId)
      .single();
    professor = data as Professor | null;
  }

  return <EmailNewClient professor={professor} />;
}
