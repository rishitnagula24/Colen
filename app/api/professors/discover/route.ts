import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const FIELD_IDS: Record<string, string> = {
  "Computer Science": "17",
  "Engineering": "22",
  "Mechanical Engineering": "22",
  "Electrical Engineering": "22",
  "Civil Engineering": "22",
  "Chemical Engineering": "15",
  "Biomedical Engineering": "22",
  "Aerospace Engineering": "22",
  "Mathematics": "26",
  "Statistics": "26",
  "Data Science": "17",
  "Artificial Intelligence": "17",
  "Physics": "31",
  "Astronomy": "31",
  "Chemistry": "16",
  "Biochemistry": "13",
  "Biology": "11",
  "Molecular Biology": "13",
  "Genetics": "13",
  "Microbiology": "24",
  "Immunology": "24",
  "Economics": "20",
  "Finance": "14",
  "Accounting": "14",
  "Marketing": "14",
  "Management": "14",
  "Business": "14",
  "Psychology": "32",
  "Neuroscience": "28",
  "Cognitive Science": "32",
  "Materials Science": "25",
  "Environmental Science": "23",
  "Earth Science": "19",
  "Geology": "19",
  "Medicine": "27",
  "Public Health": "27",
  "Nursing": "29",
  "Pharmacology": "30",
  "Dentistry": "35",
  "Veterinary": "34",
  "Agricultural Science": "11",
  "Nutrition": "27",
  "Sociology": "33",
  "Political Science": "33",
  "Anthropology": "33",
  "Philosophy": "12",
  "History": "12",
  "Linguistics": "12",
  "Literature": "12",
  "Education": "33",
  "Law": "33",
  "Communications": "33",
  "Art History": "12",
  "Music": "12",
  "Architecture": "22",
  "Energy": "21",
};

const OA_HEADERS = { "User-Agent": "Colen/1.0 (mailto:contact@colen.app)" };

interface OAAuthor {
  id?: string;
  display_name?: string;
  topics?: Array<{ display_name: string }>;
  summary_stats?: { h_index?: number };
  works_count?: number;
  cited_by_count?: number;
}

interface OAAuthorship {
  author?: { id?: string; display_name?: string };
  institutions?: Array<{ id?: string }>;
}

async function resolveInstitutionId(school: string): Promise<string | null> {
  const url = `https://api.openalex.org/institutions?search=${encodeURIComponent(school)}&per_page=3`;
  const res = await fetch(url, { headers: OA_HEADERS });
  if (!res.ok) return null;
  const data = await res.json();
  const results: Array<{ id?: string; display_name?: string; type?: string }> = data.results ?? [];
  if (results.length === 0) return null;

  const university =
    results.find(
      (r) =>
        r.type === "education" ||
        r.display_name?.toLowerCase().includes(school.toLowerCase().split(" ")[0])
    ) ?? results[0];

  const raw = university?.id ?? "";
  return raw.split("/").pop() ?? null;
}

async function fetchWorksAuthors(
  instId: string,
  fieldId: string,
  opts: { startPage: number; maxPages: number }
): Promise<Map<string, string>> {
  const authors = new Map<string, string>();

  const endPage = opts.startPage + opts.maxPages - 1;
  for (let page = opts.startPage; page <= endPage; page++) {
    const url = `https://api.openalex.org/works?filter=institutions.id:${instId},primary_topic.field.id:${fieldId}&per_page=200&page=${page}&sort=cited_by_count:desc&select=authorships`;
    const res = await fetch(url, { headers: OA_HEADERS });
    if (!res.ok) break;
    const data = await res.json();
    const works: Array<{ authorships?: OAAuthorship[] }> = data.results ?? [];
    if (works.length === 0) break;

    for (const work of works) {
      for (const a of work.authorships ?? []) {
        const hasInst = a.institutions?.some((i) => i.id === `https://openalex.org/${instId}`);
        if (!hasInst) continue;
        const aid = (a.author?.id ?? "").split("/").pop();
        const name = a.author?.display_name ?? "";
        if (aid && name && !authors.has(aid)) authors.set(aid, name);
      }
    }

    if (works.length < 200) break;
  }

  return authors;
}

async function fetchAuthorProfiles(authorIds: string[]): Promise<OAAuthor[]> {
  const profiles: OAAuthor[] = [];

  for (let i = 0; i < authorIds.length; i += 50) {
    const chunk = authorIds.slice(i, i + 50);
    const filter = chunk.map((id) => `A${id}`).join("|");
    const url = `https://api.openalex.org/authors?filter=openalex_id:${filter}&per_page=50&select=id,display_name,topics,summary_stats,works_count,cited_by_count`;
    const res = await fetch(url, { headers: OA_HEADERS });
    if (!res.ok) continue;
    const data = await res.json();
    profiles.push(...(data.results ?? []));
  }

  return profiles;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { school, department, phase } = await req.json();
    if (!school || !department) {
      return NextResponse.json({ error: "school and department required" }, { status: 400 });
    }

    const fieldId = FIELD_IDS[department];
    if (!fieldId) return NextResponse.json({ error: "Unknown department" }, { status: 400 });

    // Phase 1 (fast): return stored + 1 page from OpenAlex so UI can render quickly.
    // Phase 2 (deep): crawl more pages in the background and return the full list.
    const isDeep = phase === "deep";

    // Always return any stored professors first so the UI has something instantly.
    const { data: stored } = await supabase
      .from("professors")
      .select("*")
      .eq("school", school)
      .eq("department", department)
      .order("name", { ascending: true });

    if (!isDeep && (stored?.length ?? 0) >= 10) {
      // Fast path — if we already have meaningful cached results, return them immediately.
      return NextResponse.json({
        professors: stored ?? [],
        cached: true,
        phase: "fast",
        hasMore: true,
      });
    }

    const instId = await resolveInstitutionId(school);
    if (!instId) {
      return NextResponse.json(
        { error: `Could not find "${school}" in OpenAlex. Try the full official name.` },
        { status: 404 }
      );
    }

    const authorMap = await fetchWorksAuthors(instId, fieldId, {
      startPage: 1,
      maxPages: isDeep ? 15 : 1,
    });

    if (authorMap.size === 0) {
      return NextResponse.json({ professors: stored ?? [], cached: false, phase: isDeep ? "deep" : "fast", hasMore: false });
    }

    const authorIds = Array.from(authorMap.keys());
    const profiles = await fetchAuthorProfiles(authorIds);

    const existingNames = new Set((stored ?? []).map((p) => p.name?.toLowerCase()));

    const toInsert = profiles
      .filter((p) => {
        if (!p.display_name) return false;
        if (existingNames.has(p.display_name.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => (b.cited_by_count ?? 0) - (a.cited_by_count ?? 0))
      .map((p) => ({
        name: p.display_name!,
        title: "Professor",
        department,
        school,
        email: "",
        research_interests: (p.topics ?? []).slice(0, 6).map((t) => t.display_name),
        recent_publications: {
          h_index: p.summary_stats?.h_index ?? 0,
          cited_by_count: p.cited_by_count ?? 0,
          works_count: p.works_count ?? 0,
        },
        source: "openalex",
      }));

    if (toInsert.length > 0) {
      const service = createServiceClient();
      for (let i = 0; i < toInsert.length; i += 100) {
        await service.from("professors").insert(toInsert.slice(i, i + 100));
      }
    }

    const { data: all } = await supabase
      .from("professors")
      .select("*")
      .eq("school", school)
      .eq("department", department)
      .order("name");

    return NextResponse.json({
      professors: all ?? [],
      cached: false,
      phase: isDeep ? "deep" : "fast",
      hasMore: !isDeep,
      added: toInsert.length,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}
