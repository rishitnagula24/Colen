"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Syne } from "next/font/google";
import { motion, AnimatePresence } from "framer-motion";
import GridGlowBackground from "@/components/ui/grid-glow-background";
import { GradientAIChatInput } from "@/components/ui/gradient-ai-chat-input";
import Loader from "@/components/ui/loader";
import IntegrationsSection from "@/components/dashboard/IntegrationsSection";

const syne = Syne({ subsets: ["latin"], weight: ["700", "800"] });

interface Props {
  userName: string | null;
}

export default function DashboardHome({ userName }: Props) {
  const router = useRouter();
  const [showSpinner, setShowSpinner] = useState(false);

  const SCHOOLS = [
    "harvard","yale","princeton","columbia","cornell","dartmouth","brown",
    "mit","stanford","caltech","carnegie mellon","georgia tech","drexel",
    "uc berkeley","ucla","uc san diego","uc davis","uc santa barbara","uc irvine",
    "university of michigan","university of illinois","uw madison","ohio state",
    "purdue","penn state","rutgers","university of washington","ut austin",
    "texas a&m","university of virginia","virginia tech","university of maryland",
    "university of florida","university of north carolina","university of georgia",
    "duke","northwestern","johns hopkins","vanderbilt","rice","emory","notre dame",
    "georgetown","nyu","usc","boston university","northeastern","tufts",
    "howard university","spelman","morehouse","university of toronto","mcgill","eth zurich",
  ];

  function routeFromMessage(msg: string): { path: string; loadingText: string } {
    const lower = msg.toLowerCase();

    // ── Writing samples / documents ──────────────────────────────────────────
    if (/\b(upload|attach|document|resume|cv|curriculum vitae|writing sample|my writing|my essays?|my papers?|my voice|writing style|samples?|add my|put in my|import my)\b/.test(lower)) {
      return { path: "/dashboard/writing-style", loadingText: "taking you to documents…" };
    }

    // ── Profile ──────────────────────────────────────────────────────────────
    if (/\b(my profile|profile|my info|my bio|bio|about me|my background|my major|my school|update my|my settings|who am i|my name)\b/.test(lower)) {
      return { path: "/dashboard/profile", loadingText: "opening your profile…" };
    }

    // ── Match / AI recommendations ────────────────────────────────────────────
    if (/\b(match|recommend|suggest|who should i|best professor|who to email|right professor|good fit|perfect professor|find me a|which professor)\b/.test(lower)) {
      return { path: "/dashboard/match", loadingText: "finding matches…" };
    }

    // ── Inbox ─────────────────────────────────────────────────────────────────
    if (/\b(inbox|reply|replied|response|responded|follow.?up|waiting|check if|any replies|got back|heard back|check my email|email back)\b/.test(lower)) {
      return { path: "/dashboard/inbox", loadingText: "checking your inbox…" };
    }

    // ── Drafts ────────────────────────────────────────────────────────────────
    if (/\b(draft|saved|my emails|previously written|old email|continue writing|unfinished)\b/.test(lower)) {
      return { path: "/dashboard/drafts", loadingText: "loading your drafts…" };
    }

    // ── School deep-link ──────────────────────────────────────────────────────
    const matchedSchool = SCHOOLS.find((s) => lower.includes(s));
    if (matchedSchool) {
      const canonical = matchedSchool
        .split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      return {
        path: `/dashboard/professors?school=${encodeURIComponent(canonical)}`,
        loadingText: `finding professors at ${canonical}…`,
      };
    }

    // ── Professor directory (find / browse / discover) ────────────────────────
    // Only if they're NOT asking to write/send an email
    if (
      /\b(find|discover|browse|search|look for|looking for|who works on|who does|who studies|works in|specializ|expert in|doing research|professor|faculty|researcher)\b/.test(lower) &&
      !/\b(write|email|draft|compose|send|message|contact|reach out)\b/.test(lower)
    ) {
      return { path: "/dashboard/professors", loadingText: "finding professors…" };
    }

    // ── Compose (email writing intent) ────────────────────────────────────────
    return { path: "/dashboard/compose", loadingText: "crafting your email…" };
  }

  const [loadingText, setLoadingText] = useState("crafting your email…");

  function handleSend(message: string) {
    localStorage.setItem("compose_context", message);
    const { path, loadingText: text } = routeFromMessage(message);
    setLoadingText(text);
    setShowSpinner(true);
    setTimeout(() => router.push(path), 1500);
  }

  return (
    <GridGlowBackground
      backgroundColor="#0a0a0a"
      gridColor="rgba(255,255,255,0.04)"
      gridSize={48}
      glowColors={["#FF6B00", "#FF3D00", "#FFB300", "#FF8C00", "#E65100"]}
      glowCount={8}
    >
      {/* Transition overlay */}
      <AnimatePresence>
        {showSpinner && (
          <>
            <motion.div
              className="fixed z-[60] rounded-full pointer-events-none"
              style={{
                left: "50%", top: "50%",
                width: 90, height: 90,
                marginLeft: -45, marginTop: -45,
                background: "radial-gradient(circle, #FF8C00 0%, #FF6B0099 50%, transparent 75%)",
                filter: "blur(18px)",
                boxShadow: "0 0 60px #FF6B00, 0 0 120px #FF6B0066",
              }}
              initial={{ x: -380, y: -240, scale: 2.2, opacity: 1 }}
              animate={{ x: 0, y: 0, scale: 0, opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.4, 0, 1, 1] }}
            />
            <motion.div
              className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0a]"
              initial={{ clipPath: "circle(0px at 50% 50%)" }}
              animate={{ clipPath: "circle(150vmax at 50% 50%)" }}
              transition={{ duration: 0.7, delay: 0.38, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                className="flex flex-col items-center gap-8"
                initial={{ opacity: 0, scale: 0.75 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.75, duration: 0.35, ease: "easeOut" }}
              >
                <Loader inline />
                <motion.p
                  className="text-sm text-white/30 tracking-widest"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.95 }}
                >
                  {loadingText}
                </motion.p>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Page content — nav is provided by DashboardShell above */}
      <div className="relative z-10 scroll-smooth">
        <section className="flex flex-col items-center px-6 pt-14 md:pt-20 pb-10 min-h-[84vh]">
          {/* colen + SVG loop */}
          <div className="relative w-full max-w-4xl mx-auto h-[300px] flex items-center justify-center">
            <motion.svg
              viewBox="0 0 900 260"
              initial="hidden"
              animate="visible"
              className="absolute inset-0 w-full h-full"
              preserveAspectRatio="xMidYMid meet"
            >
              <motion.path
                d="M 720 50 C 960 130, 820 220, 450 230 C 160 230, 60 185, 60 130 C 60 65, 220 30, 450 30 C 680 30, 720 110, 720 110"
                fill="none"
                strokeWidth="6"
                stroke="white"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ opacity: 0.18 }}
                variants={{
                  hidden: { pathLength: 0, opacity: 0 },
                  visible: {
                    pathLength: 1,
                    opacity: 0.18,
                    transition: {
                      pathLength: { duration: 2.5, ease: [0.43, 0.13, 0.23, 0.96] as [number, number, number, number] },
                      opacity: { duration: 0.4 },
                    },
                  },
                }}
              />
            </motion.svg>

            <div className="relative z-10 text-center flex flex-col items-center">
              <motion.h1
                className={`${syne.className} text-8xl md:text-9xl text-white font-bold tracking-tight`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              >
                colen
              </motion.h1>
              <motion.p
                className="text-sm text-white/35 tracking-wide mt-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1, duration: 0.8 }}
              >
                {userName
                  ? `welcome back, ${userName.split(" ")[0].toLowerCase()}`
                  : "cold emails to professors that actually get replies"}
              </motion.p>
            </div>
          </div>

          {/* Chat input */}
          <motion.div
            className="w-full max-w-2xl mx-auto mt-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3, duration: 0.7 }}
          >
            <GradientAIChatInput onSend={handleSend} disabled={showSpinner} />
          </motion.div>

        </section>

        <motion.section
          className="px-6 pb-20"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, ease: "linear" }}
        >
          <IntegrationsSection />
        </motion.section>
      </div>
    </GridGlowBackground>
  );
}
