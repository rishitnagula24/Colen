"use client";

import React, { useEffect } from "react";

import { EditableChip } from "@/components/ui/editable-chip";

const QUOTE = "Brave emails open real doors.";

const DigitalSerenity = () => {
  useEffect(() => {
    const animateWords = () => {
      const wordElements = document.querySelectorAll(".word-animate");
      wordElements.forEach((word) => {
        const delay = parseInt(word.getAttribute("data-delay") ?? "0", 10) || 0;
        setTimeout(() => {
          const el = word as HTMLElement;
          if (el) el.style.animation = "word-appear 0.65s ease-out forwards";
        }, delay);
      });
    };
    const timeoutId = setTimeout(animateWords, 250);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const wordElements = document.querySelectorAll(".word-animate");
    const handleMouseEnter = (e: Event) => {
      const t = e.target as HTMLElement;
      if (t) t.style.textShadow = "0 2px 18px rgba(99, 102, 241, 0.35)";
    };
    const handleMouseLeaveWord = (e: Event) => {
      const t = e.target as HTMLElement;
      if (t) t.style.textShadow = "none";
    };
    wordElements.forEach((word) => {
      word.addEventListener("mouseenter", handleMouseEnter);
      word.addEventListener("mouseleave", handleMouseLeaveWord);
    });
    return () => {
      wordElements.forEach((word) => {
        word.removeEventListener("mouseenter", handleMouseEnter);
        word.removeEventListener("mouseleave", handleMouseLeaveWord);
      });
    };
  }, []);

  const pageStyles = `
    @keyframes word-appear {
      0% { opacity: 0; transform: translateY(14px) scale(0.98); filter: blur(4px); }
      100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
    }
    .word-animate {
      display: inline-block;
      opacity: 0;
      transition: color 0.2s ease, transform 0.2s ease;
    }
    .word-animate:hover {
      color: #4338ca;
      transform: translateY(-1px);
    }
  `;

  return (
    <>
      <style>{pageStyles}</style>
      <div className="relative min-h-[min(100dvh,720px)] overflow-hidden bg-gradient-to-br from-indigo-50 via-violet-100 to-rose-100 font-sans text-neutral-900">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-fuchsia-50/80 via-transparent to-white/70" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(196,181,253,0.45),transparent_50%),radial-gradient(ellipse_at_20%_80%,rgba(251,207,232,0.5),transparent_55%)]" />

        <div className="relative z-10 flex min-h-[min(100dvh,720px)] flex-col items-center justify-center px-6 py-14 text-center sm:px-10 sm:py-16">
          <div className="w-full max-w-md rounded-2xl border border-indigo-200/70 bg-white/90 px-6 py-8 shadow-lg shadow-indigo-900/10 backdrop-blur-sm sm:px-8 sm:py-9">
            <h1 className="text-4xl font-black tracking-tight text-neutral-950 sm:text-5xl">
              <span className="word-animate" data-delay="0">
                Colen
              </span>
              <span className="word-animate" data-delay="120">
                :
              </span>
            </h1>

            <p className="mt-4 text-base font-bold leading-snug text-neutral-800 sm:text-lg">
              <span className="word-animate" data-delay="280">
                {QUOTE}
              </span>
            </p>

            <div className="mt-5 flex justify-center">
              <EditableChip
                defaultLabel="Your focus"
                className="mx-auto w-fit"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DigitalSerenity;
