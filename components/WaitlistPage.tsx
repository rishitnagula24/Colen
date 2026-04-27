"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Syne } from "next/font/google";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Mail, ArrowRight } from "lucide-react";
import GridGlowBackground from "@/components/ui/grid-glow-background";

const syne = Syne({ subsets: ["latin"], weight: ["700", "800"] });

type State = "idle" | "loading" | "success" | "duplicate" | "error";

function ColenMark() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-white/60 text-lg leading-none">(</span>
      <div className="flex flex-col gap-[4px] py-[1px]">
        <span className="block w-[3px] h-[3px] rounded-full bg-white/70" />
        <span className="block w-[3px] h-[3px] rounded-full bg-white/70" />
        <span className="block w-[3px] h-[3px] rounded-full bg-white/70" />
      </div>
      <span className="font-mono text-white/60 text-lg leading-none">)</span>
      <span className="font-medium text-white tracking-tight text-sm ml-1">Colen</span>
    </div>
  );
}

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [focusedInput, setFocusedInput] = useState(false);
  const [showLocked, setShowLocked] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("locked") === "true") {
      setShowLocked(true);
      const t = setTimeout(() => setShowLocked(false), 5000);
      return () => clearTimeout(t);
    }
  }, []);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [10, -10]);
  const rotateY = useTransform(mouseX, [-300, 300], [-10, 10]);

  function handleMouseMove(e: React.MouseEvent) {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: email.split("@")[0], email, phone: "" }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error ?? "Something went wrong."); setState("error"); return; }
      if (data.alreadyJoined) { setState("duplicate"); } else { setState("success"); }
    } catch {
      setErrorMsg("Network error. Try again.");
      setState("error");
    }
  }

  return (
    <GridGlowBackground
      backgroundColor="#0a0a0a"
      gridColor="rgba(255,255,255,0.04)"
      gridSize={48}
      glowColors={["#FF6B00", "#FF3D00", "#FFB300", "#FF8C00", "#E65100"]}
      glowCount={8}
    >
      {/* Full-page layout inside grid background */}
      <div className="relative z-10 flex flex-col min-h-screen w-full">

        {/* Nav */}
        <div className="relative z-20 flex items-center justify-between px-5 py-4 w-full">
          <ColenMark />
          <a
            href="/login"
            className="inline-flex items-center rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/75 hover:text-white hover:bg-white/[0.08] transition-all"
          >
            Sign in
          </a>
        </div>

        {/* Locked banner */}
        <AnimatePresence>
          {showLocked && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex justify-center px-4 pb-2"
            >
              <div className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
                <span>uh oh —</span>
                <span className="text-amber-200 font-medium">you&apos;re not on the list yet. join the waitlist below.</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-20">

          {/* Title — SVG loop wraps AROUND the text */}
          <div className="relative w-full max-w-4xl mx-auto h-[380px] flex items-center justify-center">
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
                      pathLength: { duration: 2.5, ease: [0.43, 0.13, 0.23, 0.96] as [number,number,number,number] },
                      opacity: { duration: 0.4 },
                    },
                  },
                }}
              />
            </motion.svg>

            {/* Text centered inside the loop */}
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
                cold emails to professors that actually get replies
              </motion.p>
            </div>
          </div>

          {/* Waitlist card — smaller */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3, duration: 0.8 }}
            className="w-full max-w-xs mt-2"
            style={{ perspective: 1500 }}
          >
            <motion.div
              className="relative"
              style={{ rotateX, rotateY }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <div className="relative group">
                {/* Traveling light beams */}
                <div className="absolute -inset-[1px] rounded-2xl overflow-hidden pointer-events-none">
                  <motion.div
                    className="absolute top-0 left-0 h-[2px] w-[45%] bg-gradient-to-r from-transparent via-white to-transparent"
                    animate={{ left: ["-50%", "105%"], opacity: [0.3, 0.7, 0.3] }}
                    transition={{ left: { duration: 2.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 1 }, opacity: { duration: 1.2, repeat: Infinity, repeatType: "mirror" } }}
                  />
                  <motion.div
                    className="absolute top-0 right-0 h-[45%] w-[2px] bg-gradient-to-b from-transparent via-white to-transparent"
                    animate={{ top: ["-50%", "105%"], opacity: [0.3, 0.7, 0.3] }}
                    transition={{ top: { duration: 2.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 1, delay: 0.6 }, opacity: { duration: 1.2, repeat: Infinity, repeatType: "mirror", delay: 0.6 } }}
                  />
                  <motion.div
                    className="absolute bottom-0 right-0 h-[2px] w-[45%] bg-gradient-to-r from-transparent via-white to-transparent"
                    animate={{ right: ["-50%", "105%"], opacity: [0.3, 0.7, 0.3] }}
                    transition={{ right: { duration: 2.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 1, delay: 1.2 }, opacity: { duration: 1.2, repeat: Infinity, repeatType: "mirror", delay: 1.2 } }}
                  />
                  <motion.div
                    className="absolute bottom-0 left-0 h-[45%] w-[2px] bg-gradient-to-b from-transparent via-white to-transparent"
                    animate={{ bottom: ["-50%", "105%"], opacity: [0.3, 0.7, 0.3] }}
                    transition={{ bottom: { duration: 2.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 1, delay: 1.8 }, opacity: { duration: 1.2, repeat: Infinity, repeatType: "mirror", delay: 1.8 } }}
                  />
                </div>

                {/* Glass card */}
                <div className="relative bg-black/50 backdrop-blur-xl rounded-xl px-5 py-4 border border-white/[0.06] shadow-2xl overflow-hidden">
                  <div
                    className="absolute inset-0 opacity-[0.015]"
                    style={{
                      backgroundImage: `linear-gradient(135deg, white 0.5px, transparent 0.5px), linear-gradient(45deg, white 0.5px, transparent 0.5px)`,
                      backgroundSize: "30px 30px",
                    }}
                  />

                  {/* Card header */}
                  <div className="text-center mb-3">
                    <motion.h2
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.5 }}
                      className="text-base font-semibold text-white"
                    >
                      Waitlist
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.6 }}
                      className="text-white/35 text-[10px] mt-0.5"
                    >
                      Get early access when we launch
                    </motion.p>
                  </div>

                  {state === "success" ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-4"
                    >
                      <p className="text-sm font-semibold bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent mb-1 tracking-tight">You&apos;re on the list.</p>
                      <p className="text-[11px] text-white/25 mt-2">check your email — we&apos;ll reach out soon.</p>
                    </motion.div>
                  ) : state === "duplicate" ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4">
                      <p className="text-xs text-amber-300/80">Already signed up — we&apos;ll reach out soon.</p>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-2">
                      <motion.div
                        className="relative"
                        whileHover={{ scale: 1.01 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        <div className="relative flex items-center overflow-hidden rounded-lg">
                          <Mail className={`absolute left-2.5 w-3 h-3 transition-all duration-300 ${focusedInput ? "text-white" : "text-white/30"}`} />
                          <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onFocus={() => setFocusedInput(true)}
                            onBlur={() => setFocusedInput(false)}
                            required
                            className="w-full bg-white/5 border border-transparent focus:border-white/20 focus:bg-white/10 text-white text-xs placeholder:text-white/25 h-8 rounded-lg pl-8 pr-3 outline-none transition-all duration-300"
                          />
                        </div>
                      </motion.div>

                      {state === "error" && (
                        <p className="text-[11px] text-red-400/80 pl-1">{errorMsg}</p>
                      )}

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={state === "loading" || !email.trim()}
                        className="w-full relative group/btn mt-1"
                      >
                        <div className="absolute inset-0 bg-white/10 rounded-lg blur-lg opacity-0 group-hover/btn:opacity-70 transition-opacity duration-300" />
                        <div className="relative overflow-hidden bg-white text-black font-medium h-8 rounded-lg flex items-center justify-center transition-all duration-300 disabled:opacity-40">
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0"
                            animate={{ x: ["-100%", "100%"] }}
                            transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 1 }}
                            style={{ opacity: state === "loading" ? 1 : 0, transition: "opacity 0.3s" }}
                          />
                          <AnimatePresence mode="wait">
                            {state === "loading" ? (
                              <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                              </motion.div>
                            ) : (
                              <motion.span
                                key="label"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-1.5 text-xs font-medium"
                              >
                                Join Waitlist
                                <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform duration-300" />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.button>

                      <p className="text-center text-[10px] text-white/15 pt-0.5">
                        no spam. we&apos;ll email you when your spot is ready.
                      </p>
                    </form>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </GridGlowBackground>
  );
}
