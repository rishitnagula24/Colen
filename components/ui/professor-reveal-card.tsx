"use client";

import { useRef, useCallback } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { PenLine, Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Professor } from "@/types/database";

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

interface ProfessorRevealCardProps {
  professor: Professor;
  isFavorite: boolean;
  loadingFavorite: boolean;
  onToggleFavorite: () => void;
  className?: string;
}

export function ProfessorRevealCard({
  professor: p,
  isFavorite,
  loadingFavorite,
  onToggleFavorite,
  className,
}: ProfessorRevealCardProps) {
  const holderRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const startClip = "circle(48px at 48px 48px)";
  const expandClip = "circle(160% at 48px 48px)";

  const assignRef = useCallback((el: HTMLDivElement | null) => {
    holderRef.current = el;
  }, []);

  useGSAP(() => {
    gsap.set(overlayRef.current, { clipPath: startClip });
  }, { scope: holderRef });

  const reveal = () => {
    gsap.to(overlayRef.current, { clipPath: expandClip, duration: 0.75, ease: "expo.inOut" });
  };
  const conceal = () => {
    gsap.to(overlayRef.current, { clipPath: startClip, duration: 0.9, ease: "expo.out" });
  };

  const stats = p.recent_publications as { cited_by_count?: number; works_count?: number } | null;
  const citations = stats?.cited_by_count ?? 0;
  const research = (p.research_interests ?? []).slice(0, 3).join(", ");
  const summary = p.research_summary ?? research;

  return (
    <div
      ref={assignRef}
      onMouseEnter={reveal}
      onMouseLeave={conceal}
      style={{ borderColor: "#FF6B00" } as React.CSSProperties}
      className={cn("relative overflow-hidden rounded-3xl border-2 cursor-pointer", className)}
    >
      {/* Base card */}
      <div className="flex flex-col rounded-3xl bg-card text-card-foreground p-6">
        <Avatar className="h-12 w-12 ring-2 ring-offset-2 ring-offset-card ring-[#FF6B00]/60 mb-4">
          <AvatarFallback className="bg-white/8 text-white text-sm font-semibold">
            {initials(p.name)}
          </AvatarFallback>
        </Avatar>
        <p className="text-xs text-white/40 mb-1">{p.school ?? ""}</p>
        <h3 className="text-lg font-semibold text-white leading-tight mb-3">{p.name}</h3>
        <p className="text-sm text-white/50 leading-relaxed line-clamp-3 flex-grow">
          {summary || p.title || ""}
        </p>
        {citations > 0 && (
          <p className="text-[11px] text-white/25 mt-3">
            {citations.toLocaleString()} citations · {stats?.works_count ?? 0} papers
          </p>
        )}
      </div>

      {/* Overlay card — revealed on hover */}
      <div
        ref={overlayRef}
        className="absolute inset-0 h-full w-full"
        style={
          {
            "--accent-color": "#FF6B00",
            "--on-accent-foreground": "#fff",
            "--on-accent-muted-foreground": "rgba(255,255,255,0.75)",
          } as React.CSSProperties
        }
      >
        <div
          className="h-full flex flex-col rounded-3xl p-6"
          style={{ background: "#FF6B00", color: "var(--on-accent-foreground)" }}
        >
          <Avatar className="h-12 w-12 ring-2 ring-offset-2 ring-offset-[#FF6B00] ring-white/40 mb-4">
            <AvatarFallback className="bg-white/20 text-white text-sm font-semibold">
              {initials(p.name)}
            </AvatarFallback>
          </Avatar>
          <p className="text-xs mb-1" style={{ color: "var(--on-accent-muted-foreground)" }}>
            {[p.title, p.department].filter(Boolean).join(" · ") || p.school || ""}
          </p>
          <h3 className="text-lg font-semibold leading-tight mb-3" style={{ color: "var(--on-accent-foreground)" }}>
            {p.name}
          </h3>

          {(p.research_interests ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(p.research_interests ?? []).slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium border border-white/30 bg-white/15"
                  style={{ color: "var(--on-accent-foreground)" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-auto flex items-center gap-2 pt-3">
            <Link
              href={`/dashboard/compose?professorId=${p.id}`}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white text-[#FF6B00] text-xs font-semibold py-2 hover:bg-white/90 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <PenLine className="h-3.5 w-3.5" />
              Compose email
            </Link>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
              disabled={loadingFavorite}
              className="rounded-xl border border-white/30 bg-white/10 hover:bg-white/20 p-2 transition-colors"
              aria-label={isFavorite ? "Unfavorite" : "Favorite"}
            >
              <Star className={isFavorite ? "h-4 w-4 fill-white text-white" : "h-4 w-4 text-white/70"} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
