"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import GridGlowBackground from "@/components/ui/grid-glow-background";

const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.2,
      duration: 0.8,
      ease: "easeInOut" as const,
    },
  }),
};

/** Colen wordmark: three vertical dots inside parentheses */
function ColenLogoMark({
  className,
  size = "lg",
}: {
  className?: string;
  size?: "sm" | "lg";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-mono leading-none tracking-tight",
        size === "sm" && "text-base",
        size === "lg" && "text-5xl sm:text-7xl",
        className,
      )}
      aria-hidden
      title="Colen"
    >
      <span className="inline-flex items-center">
        <span className="text-white/95">(</span>
        <span
          className={cn(
            "flex flex-col items-center px-0.5",
            size === "sm" && "gap-0.5 py-0.5",
            size === "lg" && "gap-1 py-1",
          )}
        >
          <span
            className={cn(
              "shrink-0 rounded-full bg-white/90",
              size === "sm" && "h-1.5 w-1.5",
              size === "lg" && "h-2.5 w-2.5 sm:h-3 sm:w-3",
            )}
          />
          <span
            className={cn(
              "shrink-0 rounded-full bg-white/90",
              size === "sm" && "h-1.5 w-1.5",
              size === "lg" && "h-2.5 w-2.5 sm:h-3 sm:w-3",
            )}
          />
          <span
            className={cn(
              "shrink-0 rounded-full bg-white/90",
              size === "sm" && "h-1.5 w-1.5",
              size === "lg" && "h-2.5 w-2.5 sm:h-3 sm:w-3",
            )}
          />
        </span>
        <span className="text-white/95">)</span>
      </span>
    </span>
  );
}

export function GridGlowBackgroundDemo() {
  return (
    <GridGlowBackground>
      <div className="max-w-3xl text-center">
        <motion.div
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          custom={0}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white/85"
        >
          <ColenLogoMark size="sm" />
          <span className="text-white/70">·</span>
          <span>For college students</span>
        </motion.div>

        <motion.h1
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          custom={1}
          className="text-5xl font-bold tracking-tight text-white sm:text-7xl"
        >
          Colen{" "}
          <span className="inline-flex items-center gap-1 text-white/90">
            <ColenLogoMark size="lg" />
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          custom={2}
          className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/60"
        >
          One thoughtful email opens the door. Write clear, confident outreach
          so you can land lab conversations—without sounding generic.
        </motion.p>

        <motion.div
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          custom={3}
          className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
        >
          <Link
            href="/signup"
            className="inline-flex rounded-full bg-white px-6 py-3 text-lg font-semibold text-black shadow-lg shadow-white/20 transition-transform hover:scale-105"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-x-2 rounded-full px-6 py-3 text-lg font-semibold leading-6 text-white transition-colors hover:bg-white/10"
          >
            Sign in
            <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
        </motion.div>
      </div>
    </GridGlowBackground>
  );
}

export default GridGlowBackgroundDemo;
