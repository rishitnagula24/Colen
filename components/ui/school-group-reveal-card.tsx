"use client";

import { useRef, useCallback } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SchoolGroupRevealCardProps {
  label: string;
  schools: string[];
  onPickSchool: (school: string) => void;
  accent?: string;
  className?: string;
}

export function SchoolGroupRevealCard({
  label,
  schools,
  onPickSchool,
  accent = "#FF6B00",
  className,
}: SchoolGroupRevealCardProps) {
  const holderRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const startClip = "circle(6px at 44px 44px)";
  const expandClip = "circle(160% at 44px 44px)";

  const assignRef = useCallback((el: HTMLDivElement | null) => {
    holderRef.current = el;
  }, []);

  useGSAP(() => {
    gsap.set(overlayRef.current, { clipPath: startClip });
  }, { scope: holderRef });

  const reveal = () =>
    gsap.to(overlayRef.current, { clipPath: expandClip, duration: 0.75, ease: "expo.inOut" });
  const conceal = () =>
    gsap.to(overlayRef.current, { clipPath: startClip, duration: 0.9, ease: "expo.out" });

  const count = schools.length;

  return (
    <div
      ref={assignRef}
      onMouseEnter={reveal}
      onMouseLeave={conceal}
      style={{ borderColor: accent } as React.CSSProperties}
      className={cn("relative overflow-hidden rounded-3xl border-2", className)}
    >
      {/* Base card */}
      <div className="flex flex-col bg-card text-card-foreground p-6 min-h-[220px]">
        <p className="text-xs text-white/40 mb-1">{count} schools</p>
        <h3 className="text-xl font-semibold text-white leading-tight mb-3">{label}</h3>
        <p className="text-sm text-white/40 leading-relaxed line-clamp-2">
          {schools.slice(0, 4).join(", ")}
          {schools.length > 4 ? ` +${schools.length - 4} more` : ""}
        </p>
      </div>

      {/* Overlay — reveals on hover, shows clickable school list */}
      <div
        ref={overlayRef}
        className="absolute inset-0 h-full w-full"
      >
        <div
          className="h-full flex flex-col p-6 min-h-[220px]"
          style={{ background: accent }}
        >
          <p className="text-xs text-white/70 mb-1">{count} schools</p>
          <h3 className="text-lg font-semibold text-white leading-tight mb-3">{label}</h3>

          {/* School list */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 max-h-[140px]">
            {schools.map((s) => (
              <button
                key={s}
                onClick={() => onPickSchool(s)}
                className="w-full flex items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-left text-sm font-medium text-white hover:bg-white/20 transition-colors"
              >
                <span className="truncate">{s}</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/60" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
