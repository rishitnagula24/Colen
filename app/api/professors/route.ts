import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);

  const q = searchParams.get("q");
  const school = searchParams.get("school");
  const dept = searchParams.get("dept");

  let query = supabase.from("professors").select("*").order("name");

  if (school) query = query.eq("school", school);
  if (dept) query = query.eq("department", dept);
  if (q) {
    query = query.or(`name.ilike.%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
