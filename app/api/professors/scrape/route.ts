import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scrapeProfessorPapers } from "@/lib/professors/scrape";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { professorId, name, school } = await req.json();
    if (!professorId || !name || !school) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const found = await scrapeProfessorPapers(professorId, name, school);
    return NextResponse.json({ found });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}
