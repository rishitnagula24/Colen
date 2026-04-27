"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PenLine, ChevronRight, ArrowLeft, Upload, X, Loader2, Users, Search, Star } from "lucide-react";
import { SchoolGroupRevealCard } from "@/components/ui/school-group-reveal-card";
import type { Professor } from "@/types/database";

// ─── School catalogue ──────────────────────────────────────────────────────

type SchoolGroup = { label: string; schools: string[] };

const SCHOOL_GROUPS: SchoolGroup[] = [
  {
    label: "Ivy League",
    schools: [
      "Harvard", "Yale", "Princeton", "Columbia", "Cornell",
      "University of Pennsylvania", "Dartmouth", "Brown",
    ],
  },
  {
    label: "Tech Powerhouses",
    schools: [
      "MIT", "Stanford", "Caltech", "Carnegie Mellon", "Georgia Tech",
      "Rensselaer Polytechnic Institute", "Worcester Polytechnic Institute",
      "Stevens Institute of Technology", "Drexel University",
    ],
  },
  {
    label: "UC System",
    schools: [
      "UC Berkeley", "UCLA", "UC San Diego", "UC Davis",
      "UC Santa Barbara", "UC Irvine", "UC Santa Cruz", "UC Riverside", "UC Merced",
    ],
  },
  {
    label: "Top Public — Midwest & Northeast",
    schools: [
      "University of Michigan", "University of Illinois",
      "UW Madison", "Ohio State", "Purdue", "Penn State",
      "University of Minnesota", "Michigan State", "Indiana University",
      "University of Iowa", "Iowa State University", "University of Nebraska",
      "University of Missouri", "University of Kansas", "University of Cincinnati",
      "Rutgers University", "University of Connecticut",
      "University of Massachusetts Amherst", "University of Delaware",
      "University at Buffalo", "Stony Brook University",
    ],
  },
  {
    label: "Top Public — South & West",
    schools: [
      "University of Washington", "UT Austin", "Texas A&M University",
      "University of Virginia", "Virginia Tech", "University of Maryland",
      "University of Florida", "Florida State University",
      "University of North Carolina", "North Carolina State University",
      "University of Georgia", "Clemson University",
      "University of Tennessee", "University of Alabama", "University of Kentucky",
      "University of Pittsburgh", "University of Colorado Boulder",
      "University of Arizona", "Arizona State University", "University of Utah",
      "University of Oregon", "University of New Mexico",
      "University of Texas Dallas", "University of Central Florida",
      "Florida International University", "George Mason University",
    ],
  },
  {
    label: "Other T50 Private",
    schools: [
      "Duke", "Northwestern", "Johns Hopkins", "Vanderbilt", "Rice",
      "Emory", "Notre Dame", "Georgetown", "NYU", "USC",
      "Boston University", "Northeastern", "Tufts",
      "Washington University in St. Louis", "Case Western Reserve",
      "University of Rochester", "Wake Forest University", "Tulane University",
      "Baylor University", "Syracuse University", "Lehigh University",
      "Fordham University", "Villanova University",
      "George Washington University", "American University",
    ],
  },
  {
    label: "HBCUs",
    schools: [
      "Howard University", "Spelman College", "Morehouse College",
      "Hampton University", "Clark Atlanta University",
      "Florida A&M University", "North Carolina A&T State University",
    ],
  },
  {
    label: "Canadian & International",
    schools: [
      "University of Toronto", "McGill University",
      "University of British Columbia", "University of Waterloo",
      "University of Alberta", "ETH Zurich", "University of Edinburgh",
      "University of Melbourne",
    ],
  },
];

type DepartmentGroup = { label: string; departments: string[] };

const DEPARTMENT_GROUPS: DepartmentGroup[] = [
  {
    label: "Engineering & Computing",
    departments: [
      "Computer Science", "Data Science", "Artificial Intelligence",
      "Engineering", "Mechanical Engineering", "Electrical Engineering",
      "Civil Engineering", "Chemical Engineering", "Biomedical Engineering",
      "Aerospace Engineering", "Materials Science", "Architecture", "Energy",
    ],
  },
  {
    label: "Natural Sciences",
    departments: [
      "Mathematics", "Statistics", "Physics", "Astronomy",
      "Chemistry", "Biochemistry", "Biology", "Molecular Biology", "Genetics",
      "Microbiology", "Immunology", "Environmental Science",
      "Earth Science", "Geology",
    ],
  },
  {
    label: "Health & Medicine",
    departments: [
      "Medicine", "Neuroscience", "Public Health", "Nursing",
      "Pharmacology", "Dentistry", "Veterinary", "Nutrition",
    ],
  },
  {
    label: "Social Sciences & Humanities",
    departments: [
      "Psychology", "Cognitive Science", "Sociology", "Political Science",
      "Anthropology", "Economics", "Linguistics", "Philosophy",
      "History", "Literature", "Education", "Law", "Communications",
      "Art History", "Music",
    ],
  },
  {
    label: "Business",
    departments: [
      "Business", "Finance", "Accounting", "Marketing", "Management",
    ],
  },
  {
    label: "Agriculture",
    departments: ["Agricultural Science"],
  },
];

const ALL_DEPARTMENTS = DEPARTMENT_GROUPS.flatMap((g) => g.departments);

// ─── Component ────────────────────────────────────────────────────────────

type View = "schools" | "departments" | "professors";
type FavoriteEntry = { professor_id: string; professors: Professor };
const LOCAL_FAVORITES_KEY = "colen_professor_favorites";

export default function ProfessorsDiscoverClient() {
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>("schools");
  const [school, setSchool] = useState("");
  const [department, setDepartment] = useState("");
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // School search
  const [searchQuery, setSearchQuery] = useState("");
  const [customSchool, setCustomSchool] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Department filter on departments view
  const [deptQuery, setDeptQuery] = useState("");

  // Professor search on professors view
  const [profQuery, setProfQuery] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);

  // CV modal
  const [cvModalOpen, setCvModalOpen] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvParsing, setCvParsing] = useState(false);
  const [cvError, setCvError] = useState("");
  const [cvParsed, setCvParsed] = useState<Array<Record<string, string>>>([]);
  const [cvImporting, setCvImporting] = useState(false);
  const [cvImported, setCvImported] = useState(0);
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoriteLoadingId, setFavoriteLoadingId] = useState<string | null>(null);
  const [favoritesModalOpen, setFavoritesModalOpen] = useState(false);
  const [selectedFavorite, setSelectedFavorite] = useState<Professor | null>(null);
  const hasAppliedPresetSchool = useRef(false);

  // Filter school list by search query
  const filteredGroups = searchQuery.trim()
    ? SCHOOL_GROUPS.map((g) => ({
        ...g,
        schools: g.schools.filter((s) =>
          s.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter((g) => g.schools.length > 0)
    : SCHOOL_GROUPS;

  const totalSchools = SCHOOL_GROUPS.reduce((n, g) => n + g.schools.length, 0);

  async function loadFavorites() {
    try {
      const res = await fetch("/api/professors/favorites", { cache: "no-store" });
      if (!res.ok) throw new Error("Favorites API unavailable");
      const data = await res.json();
      const list: FavoriteEntry[] = data.favorites ?? [];
      setFavorites(list);
      setFavoriteIds(new Set(list.map((f) => f.professor_id)));
    } catch {
      try {
        const stored = JSON.parse(localStorage.getItem(LOCAL_FAVORITES_KEY) ?? "[]") as FavoriteEntry[];
        setFavorites(stored);
        setFavoriteIds(new Set(stored.map((f) => f.professor_id)));
      } catch {
        setFavorites([]);
        setFavoriteIds(new Set());
      }
    }
  }

  async function toggleFavorite(professor: Professor) {
    if (favoriteLoadingId === professor.id) return;
    setFavoriteLoadingId(professor.id);
    const isFavorite = favoriteIds.has(professor.id);

    try {
      const res = await fetch("/api/professors/favorites", {
        method: isFavorite ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professorId: professor.id }),
      });
      if (!res.ok) throw new Error("Favorites API unavailable");
      await loadFavorites();
    } catch {
      const nextIds = new Set(favoriteIds);
      let nextFavorites = [...favorites];

      if (isFavorite) {
        nextIds.delete(professor.id);
        nextFavorites = nextFavorites.filter((f) => f.professor_id !== professor.id);
      } else {
        nextIds.add(professor.id);
        nextFavorites = [{ professor_id: professor.id, professors: professor }, ...nextFavorites];
      }

      setFavoriteIds(nextIds);
      setFavorites(nextFavorites);
      localStorage.setItem(LOCAL_FAVORITES_KEY, JSON.stringify(nextFavorites));
    } finally {
      setFavoriteLoadingId(null);
    }
  }

  function pickSchool(s: string) {
    setSchool(s);
    setDepartment("");
    setProfessors([]);
    setError("");
    setView("departments");
  }

  function handleCustomSchool(e: React.FormEvent) {
    e.preventDefault();
    const name = customSchool.trim();
    if (!name) return;
    pickSchool(name);
    setCustomSchool("");
  }

  async function pickDepartment(dept: string) {
    setDepartment(dept);
    setView("professors");
    setLoading(true);
    setError("");
    setProfessors([]);
    setLoadingMore(false);

    try {
      // Phase 1 — fast: get first batch (cached + 1 OpenAlex page) quickly.
      const fastRes = await fetch("/api/professors/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ school, department: dept, phase: "fast" }),
      });
      const fastData = await fastRes.json();
      if (!fastRes.ok) {
        setError(fastData.error ?? "Failed to load professors");
        setLoading(false);
        return;
      }

      setProfessors(fastData.professors ?? []);
      setLoading(false);

      // Phase 2 — deep: crawl more pages in the background if more results are expected.
      if (fastData.hasMore) {
        setLoadingMore(true);
        try {
          const deepRes = await fetch("/api/professors/discover", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ school, department: dept, phase: "deep" }),
          });
          const deepData = await deepRes.json();
          if (deepRes.ok) {
            setProfessors(deepData.professors ?? []);
          }
        } catch {
          // Ignore — user already has phase 1 results on screen.
        } finally {
          setLoadingMore(false);
        }
      }
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  }

  async function handleCvFile(file: File) {
    setCvFile(file);
    setCvError("");
    setCvParsed([]);
    setCvParsing(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/professors/parse-doc", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { setCvError(data.error ?? "Could not parse file"); return; }
      const parsed: Array<Record<string, string>> = data.professors ?? [];
      if (parsed.length === 0) { setCvError("No professor info found."); return; }
      setCvParsed(parsed.map((p) => ({ ...p, school: p.school || school, department: p.department || department })));
    } catch {
      setCvError("Failed to parse file.");
    } finally {
      setCvParsing(false);
    }
  }

  async function importCvProfessors() {
    if (!cvParsed.length) return;
    setCvImporting(true);
    let count = 0;
    for (const p of cvParsed) {
      try {
        const res = await fetch("/api/professors/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: p.name, title: p.title || "Professor",
            department: p.department || department, school: p.school || school,
            email: p.email || "",
            research_interests: p.research_interests ? p.research_interests.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
          }),
        });
        if (res.ok) {
          const { id } = await res.json();
          if (id) {
            count++;
            fetch("/api/professors/scrape", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ professorId: id, name: p.name, school: p.school || school }),
            }).catch(() => {});
          }
        }
      } catch {}
    }
    setCvImported(count);
    setCvImporting(false);
    if (school && department) pickDepartment(department);
  }

  function resetCvModal() {
    setCvModalOpen(false);
    setCvFile(null);
    setCvParsed([]);
    setCvError("");
    setCvImported(0);
  }

  useEffect(() => {
    void loadFavorites();
  }, []);

  // Allow deep-linking straight into a specific school from homepage cards.
  useEffect(() => {
    const presetSchool = searchParams.get("school");
    if (!presetSchool || hasAppliedPresetSchool.current) return;
    hasAppliedPresetSchool.current = true;
    pickSchool(presetSchool);
  }, [searchParams]);

  // ── Shared modals (rendered once, across all views) ─────────────────────

  const modals = (
    <>
      {/* CV Modal */}
      {cvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f0f0f] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">Add professor from CV</h2>
              <button onClick={resetCvModal} className="text-white/30 hover:text-white/60 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {cvImported > 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-green-400 font-medium mb-1">{cvImported} professor{cvImported > 1 ? "s" : ""} added!</p>
                <button onClick={resetCvModal} className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors">Done</button>
              </div>
            ) : (
              <>
                <input type="file" accept=".pdf,.doc,.docx" className="hidden" id="cv-upload"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCvFile(f); }} />

                {!cvFile ? (
                  <label htmlFor="cv-upload" className="block w-full rounded-xl border-2 border-dashed border-white/10 bg-white/3 py-10 text-center hover:border-white/20 hover:bg-white/5 transition-all cursor-pointer">
                    <Upload className="h-7 w-7 text-white/20 mx-auto mb-2" />
                    <p className="text-sm text-white/40">Click to upload PDF or DOCX</p>
                    <p className="text-xs text-white/20 mt-1">CV, faculty page, or department roster</p>
                  </label>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/80 truncate">{cvFile.name}</p>
                        <p className="text-xs text-white/30 mt-0.5">{(cvFile.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <button onClick={() => { setCvFile(null); setCvParsed([]); setCvError(""); }} className="text-white/30 hover:text-white/60">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    {cvParsing && <div className="flex items-center gap-2 text-sm text-white/40"><Loader2 className="h-4 w-4 animate-spin" />Extracting…</div>}
                    {cvError && <p className="text-sm text-red-400">{cvError}</p>}
                    {cvParsed.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-white/40">{cvParsed.length} professor{cvParsed.length > 1 ? "s" : ""} found:</p>
                        <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                          {cvParsed.map((p, i) => (
                            <div key={i} className="rounded-lg border border-white/8 bg-white/3 px-3 py-2.5">
                              <p className="text-sm text-white font-medium">{p.name || "Unknown"}</p>
                              <p className="text-xs text-white/40 mt-0.5">{[p.title, p.department, p.school].filter(Boolean).join(" · ")}</p>
                            </div>
                          ))}
                        </div>
                        <button onClick={importCvProfessors} disabled={cvImporting}
                          className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50 transition-colors">
                          {cvImporting ? "Importing…" : `Add ${cvParsed.length} professor${cvParsed.length > 1 ? "s" : ""}`}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <p className="mt-4 text-xs text-white/20">Upload a CV, faculty directory, or any document listing professors.</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Favorites Modal */}
      {favoritesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0f0f0f] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-300 fill-amber-300/40" />
                Favorite Professors
              </h2>
              <button onClick={() => setFavoritesModalOpen(false)} className="text-white/30 hover:text-white/60 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {favorites.length === 0 ? (
              <p className="text-sm text-white/40 py-8 text-center">No favorites yet. Star any professor to see them here.</p>
            ) : (
              <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-1">
                {favorites.map((f) => (
                  <button
                    key={f.professor_id}
                    onClick={() => setSelectedFavorite(f.professors)}
                    className="w-full text-left rounded-lg border border-white/8 bg-white/3 px-4 py-3 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-white font-medium truncate">{f.professors?.name}</p>
                        <p className="text-xs text-white/40 truncate">
                          {[f.professors?.title, f.professors?.department, f.professors?.school].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-white/30 shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Favorite Profile Modal */}
      {selectedFavorite && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0f0f0f] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h3 className="text-lg font-semibold text-white">{selectedFavorite.name}</h3>
                <p className="text-sm text-white/45 mt-1">
                  {[selectedFavorite.title, selectedFavorite.department, selectedFavorite.school].filter(Boolean).join(" · ")}
                </p>
              </div>
              <button onClick={() => setSelectedFavorite(null)} className="text-white/30 hover:text-white/60 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {selectedFavorite.research_summary && (
              <p className="text-sm text-white/60 leading-relaxed mb-4">{selectedFavorite.research_summary}</p>
            )}

            {(selectedFavorite.research_interests ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-5">
                {(selectedFavorite.research_interests ?? []).slice(0, 12).map((tag) => (
                  <span key={tag} className="rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-xs text-white/60">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => void toggleFavorite(selectedFavorite)}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/8 transition-colors"
              >
                <Star className="h-4 w-4 fill-amber-300/40 text-amber-300" />
                Remove favorite
              </button>
              <Link href={`/dashboard/compose?professorId=${selectedFavorite.id}`} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors">
                <PenLine className="h-4 w-4" />
                Open profile / compose
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // ── Views ──────────────────────────────────────────────────────────────

  if (view === "schools") {
    return (
      <div className="px-8 py-8 max-w-7xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-white">Professors</h1>
            <p className="mt-1 text-sm text-white/40">{totalSchools} schools · choose one to browse professors by department.</p>
          </div>
          <button
            onClick={() => setFavoritesModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/15 transition-colors shrink-0"
          >
            <Star className="h-4 w-4 fill-amber-300/40" />
            Favorites ({favorites.length})
          </button>
        </div>

        {/* Search + custom school */}
        <div className="flex gap-2 mb-8">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Filter schools…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-violet-500/50 focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <form onSubmit={handleCustomSchool} className="flex gap-2">
            <input
              type="text"
              placeholder="Any other school…"
              value={customSchool}
              onChange={(e) => setCustomSchool(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-violet-500/50 focus:outline-none w-52"
            />
            <button
              type="submit"
              disabled={!customSchool.trim()}
              className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {filteredGroups.length === 0 ? (
          <div className="text-center py-12 text-white/30 text-sm">
            No schools match &ldquo;{searchQuery}&rdquo; — use the search box on the right to load any school directly.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredGroups.map((group) => (
              <SchoolGroupRevealCard
                key={group.label}
                label={group.label}
                schools={group.schools}
                onPickSchool={pickSchool}
              />
            ))}
          </div>
        )}
        {modals}
      </div>
    );
  }

  if (view === "departments") {
    return (
      <div className="px-8 py-8 max-w-5xl mx-auto">
        <button
          onClick={() => setView("schools")}
          className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          All schools
        </button>

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-white">{school}</h1>
            <p className="mt-1 text-sm text-white/40">{ALL_DEPARTMENTS.length} departments · pick one to see professors.</p>
          </div>
          <button
            onClick={() => setFavoritesModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/15 transition-colors shrink-0"
          >
            <Star className="h-4 w-4 fill-amber-300/40" />
            Favorites ({favorites.length})
          </button>
        </div>

        <div className="relative max-w-sm mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 pointer-events-none" />
          <input
            type="text"
            placeholder="Search departments…"
            value={deptQuery}
            onChange={(e) => setDeptQuery(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-violet-500/50 focus:outline-none"
          />
          {deptQuery && (
            <button onClick={() => setDeptQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {(() => {
          const filteredGroups = deptQuery.trim()
            ? DEPARTMENT_GROUPS.map((g) => ({
                ...g,
                departments: g.departments.filter((d) =>
                  d.toLowerCase().includes(deptQuery.toLowerCase())
                ),
              })).filter((g) => g.departments.length > 0)
            : DEPARTMENT_GROUPS;

          if (filteredGroups.length === 0) {
            return (
              <div className="text-center py-12 text-white/30 text-sm">
                No departments match &ldquo;{deptQuery}&rdquo;.
              </div>
            );
          }

          return (
            <div className="space-y-8">
              {filteredGroups.map((group) => (
                <div key={group.label}>
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-white/25 mb-3">
                    {group.label}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {group.departments.map((dept) => (
                      <button
                        key={dept}
                        onClick={() => pickDepartment(dept)}
                        className="group flex items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/3 px-4 py-3.5 text-left hover:border-violet-500/30 hover:bg-violet-500/5 transition-all"
                      >
                        <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                          {dept}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-white/20 shrink-0 group-hover:text-violet-400 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
        {modals}
      </div>
    );
  }

  // view === "professors"
  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <button
        onClick={() => setView("departments")}
        className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        {school}
      </button>

      <div className="flex items-start justify-between gap-4 mb-7">
        <div>
          <h1 className="text-xl font-semibold text-white">{department}</h1>
          <p className="mt-1 text-sm text-white/40">{school}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFavoritesModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/15 transition-colors shrink-0"
          >
            <Star className="h-4 w-4 fill-amber-300/40" />
            Favorites ({favorites.length})
          </button>
          <button
            onClick={() => setCvModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/8 hover:text-white transition-colors shrink-0"
          >
            <Upload className="h-4 w-4" />
            Add from CV
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
          <p className="text-sm text-white/50">Finding professors at {school}…</p>
          <p className="text-xs text-white/25">First load takes 10–20 seconds.</p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>
      )}

      {!loading && !error && professors.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
          <Users className="h-10 w-10 text-white/10" />
          <p className="text-sm text-white/30">No professors found for this combination.</p>
        </div>
      )}

      {!loading && professors.length > 0 && (() => {
        const q = profQuery.trim().toLowerCase();
        const filteredProfs = q
          ? professors.filter((p) => {
              const fields = [
                p.name,
                p.title ?? "",
                p.department ?? "",
                (p.research_interests ?? []).join(" "),
                p.research_summary ?? "",
              ].join(" ").toLowerCase();
              return fields.includes(q);
            })
          : professors;

        return (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search professors by name or research…"
                  value={profQuery}
                  onChange={(e) => setProfQuery(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-violet-500/50 focus:outline-none"
                />
                {profQuery && (
                  <button onClick={() => setProfQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="text-xs text-white/30">
                {filteredProfs.length} of {professors.length}
              </p>
              {loadingMore && (
                <p className="inline-flex items-center gap-1.5 text-xs text-violet-300/70">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Finding more…
                </p>
              )}
            </div>

            {filteredProfs.length === 0 ? (
              <div className="text-center py-12 text-white/30 text-sm">
                No professors match &ldquo;{profQuery}&rdquo;.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProfs.map((p) => (
                  <ProfessorCard
                    key={p.id}
                    professor={p}
                    isFavorite={favoriteIds.has(p.id)}
                    loadingFavorite={favoriteLoadingId === p.id}
                    onToggleFavorite={() => toggleFavorite(p)}
                  />
                ))}
              </div>
            )}
          </>
        );
      })()}

      {modals}
    </div>
  );
}

function ProfessorCard({
  professor: p,
  isFavorite,
  loadingFavorite,
  onToggleFavorite,
}: {
  professor: Professor;
  isFavorite: boolean;
  loadingFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const stats = p.recent_publications as { cited_by_count?: number; works_count?: number } | null;
  const citations = stats?.cited_by_count ?? 0;

  return (
    <div className="group rounded-xl border border-white/8 bg-white/3 p-5 hover:border-white/15 hover:bg-white/5 transition-all flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-white text-sm leading-tight truncate">{p.name}</h3>
          <p className="text-xs text-white/40 mt-0.5">{p.title ?? "Professor"}</p>
        </div>
        <button
          onClick={onToggleFavorite}
          disabled={loadingFavorite}
          className="text-white/35 hover:text-amber-300 disabled:opacity-50 transition-colors shrink-0"
          aria-label={isFavorite ? "Unfavorite professor" : "Favorite professor"}
        >
          <Star className={isFavorite ? "h-4 w-4 fill-amber-300 text-amber-300" : "h-4 w-4"} />
        </button>
      </div>

      {citations > 0 && (
        <p className="text-[11px] text-white/25">
          {citations.toLocaleString()} citations · {stats?.works_count ?? 0} papers
        </p>
      )}

      {(p.research_interests ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {(p.research_interests ?? []).slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-full border border-white/8 bg-white/5 px-2 py-0.5 text-[11px] text-white/50">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-2 border-t border-white/8">
        <Link
          href={`/dashboard/compose?professorId=${p.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
        >
          <PenLine className="h-3.5 w-3.5" />
          Compose email
        </Link>
      </div>
    </div>
  );
}

