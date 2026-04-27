"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, RefreshCw, Upload, Loader2, Building2, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/spotlight-card";
import { cn } from "@/lib/utils";
import type { ProfessorMatchScore, Professor, ScrapedPapers } from "@/types/database";

interface MatchResult extends ProfessorMatchScore {
  professors: Professor;
}

function ScoreBadge({ score }: { score: number }) {
  const { ring, text, bg } =
    score >= 70
      ? { ring: "border-green-500/40", text: "text-green-300", bg: "bg-green-500/15" }
      : score >= 40
      ? { ring: "border-amber-500/40", text: "text-amber-300", bg: "bg-amber-500/15" }
      : { ring: "border-red-500/40", text: "text-red-300", bg: "bg-red-500/15" };

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border", bg, ring, text)}>
      {score}
      <span className="opacity-50 font-normal">/100</span>
    </span>
  );
}


export default function ProfessorsMatchClient() {
  const [scores, setScores] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function fetchMatches(force: boolean): Promise<MatchResult[]> {
    const res = await fetch("/api/professors/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to load matches");
    return (data.scores ?? []) as MatchResult[];
  }

  async function manualRefresh() {
    setRefreshing(true);
    setError("");
    try {
      const scores = await fetchMatches(true);
      setScores(scores);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      setError("");
      try {
        // Try cache first
        const cached = await fetchMatches(false);
        if (cached.length > 0) {
          setScores(cached);
          setLoading(false);
          // Silently refresh in background
          setRefreshing(true);
          fetchMatches(true)
            .then((fresh) => { if (fresh.length > 0) setScores(fresh); })
            .catch(() => {})
            .finally(() => setRefreshing(false));
          return;
        }
        // No cache — generate fresh and wait
        const fresh = await fetchMatches(true);
        setScores(fresh);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load matches");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Professor Matches</h1>
          <p className="mt-1 text-sm text-white/40 flex items-center gap-2">
            AI-scored research fit based on your profile.
            {refreshing && !loading && (
              <span className="inline-flex items-center gap-1 text-orange-300/70 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                Updating scores…
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/professors">
            <Button variant="secondary" size="sm">
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Open professor directory
            </Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={manualRefresh} disabled={refreshing || loading}>
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/8 bg-white/3 p-5 animate-pulse space-y-3 min-h-[220px]">
              <div className="h-4 bg-white/8 rounded w-3/4" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
              <div className="h-3 bg-white/5 rounded w-full" />
              <div className="h-3 bg-white/5 rounded w-5/6" />
            </div>
          ))}
        </div>
      ) : scores.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-orange-400" />
          </div>
          <p className="text-white/60 text-sm">No professor matches yet.</p>
          <p className="text-white/30 text-xs max-w-md">
            Add or discover professors in the directory first, then come back to Match.
          </p>
          <Link href="/dashboard/professors" className="mt-2">
            <Button variant="secondary" size="sm">
              <Building2 className="h-3.5 w-3.5 mr-1.5" />
              Go to professor directory
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {scores.map((item) => {
            const prof = item.professors;
            const scraped = prof?.scraped_papers as ScrapedPapers | null;
            const summary = prof?.research_summary ?? scraped?.summary ?? prof?.research_interests?.slice(0, 3).join(", ") ?? "";

            return (
              <GlowCard
                key={item.id}
                glowColor="ember"
                customSize
                className={cn(
                  "w-full min-h-[220px] flex flex-col gap-0 p-5 transition-opacity duration-300",
                  refreshing && "opacity-60"
                )}
              >
                {/* Score + name row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white leading-tight truncate">{prof?.name}</p>
                    {prof?.title && (
                      <p className="text-[11px] text-white/35 mt-0.5 truncate">{prof.title}</p>
                    )}
                  </div>
                  <ScoreBadge score={item.score} />
                </div>

                {/* Department / school */}
                {(prof?.department || prof?.school) && (
                  <div className="flex items-center gap-1 text-[11px] text-white/25 mb-3">
                    <Building2 className="h-3 w-3 shrink-0" />
                    <span className="truncate">{[prof.department, prof.school].filter(Boolean).join(" · ")}</span>
                  </div>
                )}

                {/* Match reason */}
                {item.match_reasons && (
                  <p className="text-xs text-white/55 leading-relaxed mb-2 line-clamp-2">{item.match_reasons}</p>
                )}

                {/* Research summary */}
                {summary && (
                  <div className="flex items-start gap-1.5 text-[11px] text-white/25 leading-relaxed line-clamp-2 mb-3">
                    <BookOpen className="h-3 w-3 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{summary}</span>
                  </div>
                )}

                {/* CTA */}
                <div className="mt-auto pt-3">
                  <Link href={`/dashboard/compose?professorId=${prof?.id}`}>
                    <button className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white/8 hover:bg-white/14 border border-white/10 hover:border-white/20 text-white/80 hover:text-white text-xs font-medium py-2 transition-all">
                      <Sparkles className="h-3.5 w-3.5" />
                      Write email
                      <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                    </button>
                  </Link>
                </div>
              </GlowCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
