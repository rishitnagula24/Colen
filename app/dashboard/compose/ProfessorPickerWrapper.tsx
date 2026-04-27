"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles, X } from "lucide-react";
import type { Professor } from "@/types/database";

interface Props {
  professors: Pick<Professor, "id" | "name" | "school" | "department">[];
}

export default function ProfessorPickerWrapper({ professors }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Pick<Professor, "id" | "name" | "school" | "department"> | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? professors.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        (p.school ?? "").toLowerCase().includes(query.toLowerCase()) ||
        (p.department ?? "").toLowerCase().includes(query.toLowerCase())
      ).slice(0, 20)
    : professors.slice(0, 20);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectProfessor(p: Pick<Professor, "id" | "name" | "school" | "department">) {
    setSelected(p);
    setQuery(p.name);
    setOpen(false);
  }

  function clearSelection() {
    setSelected(null);
    setQuery("");
    inputRef.current?.focus();
  }

  function go() {
    if (selected) router.push(`/dashboard/compose?professorId=${selected.id}`);
  }

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto">
      <div className="mb-7">
        <h1 className="text-xl font-semibold text-white">Compose email</h1>
        <p className="mt-1 text-sm text-white/40">Pick a professor to get started.</p>
      </div>

      <div className="rounded-xl border border-white/8 bg-white/3 p-6 space-y-4">
        <div ref={containerRef} className="relative">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-white/30 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search by name, school, or department…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-9 py-3 text-sm text-white placeholder:text-white/30 focus:border-violet-500/50 focus:outline-none"
            />
            {query && (
              <button
                onClick={clearSelection}
                className="absolute right-3 text-white/30 hover:text-white/60 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {open && filtered.length > 0 && (
            <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-white/10 bg-[#141414] shadow-2xl overflow-hidden">
              <div className="max-h-72 overflow-y-auto">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    onMouseDown={(e) => { e.preventDefault(); selectProfessor(p); }}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{p.name}</p>
                      <p className="text-xs text-white/40 mt-0.5 truncate">
                        {[p.department, p.school].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              {professors.length > 20 && query.trim() === "" && (
                <p className="px-4 py-2 text-xs text-white/25 border-t border-white/5">
                  Showing 20 of {professors.length} — type to search
                </p>
              )}
            </div>
          )}

          {open && query.trim() !== "" && filtered.length === 0 && (
            <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-white/10 bg-[#141414] shadow-2xl px-4 py-4">
              <p className="text-sm text-white/30">No professors match &ldquo;{query}&rdquo;</p>
            </div>
          )}
        </div>

        {selected && (
          <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-4 py-3">
            <p className="text-sm text-white font-medium">{selected.name}</p>
            <p className="text-xs text-white/40 mt-0.5">{[selected.department, selected.school].filter(Boolean).join(" · ")}</p>
          </div>
        )}

        {professors.length === 0 && (
          <p className="text-sm text-white/30">
            No professors yet. Go to{" "}
            <a href="/dashboard/professors" className="text-violet-400 hover:underline">
              Professors
            </a>{" "}
            to discover some first.
          </p>
        )}

        <button
          onClick={go}
          disabled={!selected}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          Continue
        </button>
      </div>
    </div>
  );
}
