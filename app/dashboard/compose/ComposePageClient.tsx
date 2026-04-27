"use client";

import { useEffect, useRef, useCallback, useTransition, useState } from "react";
import { cn } from "@/lib/utils";
import {
  XIcon,
  LoaderIcon,
  SendIcon,
  Command,
  Paperclip,
  BookOpen,
  GraduationCap,
  FlaskConical,
  MailCheck,
  ChevronDown,
  RefreshCw,
  Sparkles,
  Check,
  Copy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Professor } from "@/types/database";
import Link from "next/link";
import { GradientBackground } from "@/components/ui/paper-design-shader-background";
import { EmailFormatToolbar } from "@/components/ui/email-format-toolbar";

// ── useAutoResizeTextarea ─────────────────────────────────────────────────────

function useAutoResizeTextarea({ minHeight, maxHeight }: { minHeight: number; maxHeight?: number }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const adjustHeight = useCallback((reset?: boolean) => {
    const el = textareaRef.current;
    if (!el) return;
    if (reset) { el.style.height = `${minHeight}px`; return; }
    el.style.height = `${minHeight}px`;
    el.style.height = `${Math.max(minHeight, Math.min(el.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY))}px`;
  }, [minHeight, maxHeight]);
  useEffect(() => { const el = textareaRef.current; if (el) el.style.height = `${minHeight}px`; }, [minHeight]);
  useEffect(() => {
    const onResize = () => adjustHeight();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [adjustHeight]);
  return { textareaRef, adjustHeight };
}

// ── TypingDots ────────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center ml-1">
      {[1, 2, 3].map((dot) => (
        <motion.div key={dot} className="w-1.5 h-1.5 bg-white/90 rounded-full mx-0.5"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.9, 0.3], scale: [0.85, 1.1, 0.85] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: dot * 0.15, ease: "easeInOut" }}
          style={{ boxShadow: "0 0 4px rgba(255,255,255,0.3)" }} />
      ))}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

type ProfRow = Pick<Professor, "id" | "name" | "school" | "department" | "research_interests" | "title">;

interface Props {
  professors: ProfRow[];
  userProfile: { name?: string | null; major?: string | null; school?: string | null; bio?: string | null } | null;
}

// ── Action types ──────────────────────────────────────────────────────────────

interface EmailAction {
  icon: React.ReactNode;
  label: string;
  description: string;
  prefix: string;
  goal: "research" | "mentorship" | "referral";
  tone: "formal" | "warm" | "concise";
  placeholder: string;
}

const EMAIL_ACTIONS: EmailAction[] = [
  {
    icon: <BookOpen className="w-4 h-4" />,
    label: "Research Inquiry",
    description: "Email a professor about their research",
    prefix: "/research",
    goal: "research",
    tone: "formal",
    placeholder: "Describe your research interest, relevant experience, or a specific paper you liked…",
  },
  {
    icon: <GraduationCap className="w-4 h-4" />,
    label: "Mentorship Ask",
    description: "Request mentorship from a professor",
    prefix: "/mentor",
    goal: "mentorship",
    tone: "warm",
    placeholder: "Tell me your background and what kind of guidance you're looking for…",
  },
  {
    icon: <FlaskConical className="w-4 h-4" />,
    label: "Lab Position",
    description: "Inquire about open lab positions",
    prefix: "/lab",
    goal: "research",
    tone: "formal",
    placeholder: "Describe your skills, relevant coursework, and why you want to join their lab…",
  },
  {
    icon: <MailCheck className="w-4 h-4" />,
    label: "Follow-up",
    description: "Write a polite follow-up email",
    prefix: "/followup",
    goal: "referral",
    tone: "concise",
    placeholder: "How long ago did you send the first email, and is there anything new to mention?",
  },
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function ComposePageClient({ professors, userProfile }: Props) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [, startTransition] = useTransition();
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [inputFocused, setInputFocused] = useState(false);
  const commandPaletteRef = useRef<HTMLDivElement>(null);

  // Professor picker
  const [selectedProf, setSelectedProf] = useState<ProfRow | null>(null);
  const [profOpen, setProfOpen] = useState(false);
  const [profQuery, setProfQuery] = useState("");
  const profDropRef = useRef<HTMLDivElement>(null);

  // Active email action (goal + tone)
  const [activeAction, setActiveAction] = useState<EmailAction>(EMAIL_ACTIONS[0]);

  // Generated email
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [genError, setGenError] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sent, setSent] = useState(false);

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 60, maxHeight: 200 });
  const bodyRef = useRef<HTMLDivElement>(null);

  // Sync API-generated body text into the contenteditable div
  useEffect(() => {
    if (bodyRef.current && body && bodyRef.current.innerText !== body) {
      bodyRef.current.innerText = body;
    }
  }, [body]);

  const filteredProfs = profQuery.trim()
    ? professors.filter((p) => `${p.name} ${p.school ?? ""} ${p.department ?? ""}`.toLowerCase().includes(profQuery.toLowerCase())).slice(0, 10)
    : professors.slice(0, 10);

  // Mouse glow
  useEffect(() => {
    const onMove = (e: MouseEvent) => setMousePosition({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Close command palette on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const btn = document.querySelector("[data-command-button]");
      if (commandPaletteRef.current && !commandPaletteRef.current.contains(target) && !btn?.contains(target))
        setShowCommandPalette(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Close prof dropdown on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (profDropRef.current && !profDropRef.current.contains(e.target as Node)) setProfOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Sync command palette to value
  useEffect(() => {
    if (value.startsWith("/") && !value.includes(" ")) {
      setShowCommandPalette(true);
      const idx = EMAIL_ACTIONS.findIndex((a) => a.prefix.startsWith(value));
      setActiveSuggestion(idx >= 0 ? idx : -1);
    } else {
      setShowCommandPalette(false);
    }
  }, [value]);

  const selectAction = (index: number) => {
    const action = EMAIL_ACTIONS[index];
    setActiveAction(action);
    setValue(action.prefix + " ");
    setShowCommandPalette(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommandPalette) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveSuggestion((p) => (p < EMAIL_ACTIONS.length - 1 ? p + 1 : 0)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActiveSuggestion((p) => (p > 0 ? p - 1 : EMAIL_ACTIONS.length - 1)); }
      else if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); if (activeSuggestion >= 0) selectAction(activeSuggestion); }
      else if (e.key === "Escape") { e.preventDefault(); setShowCommandPalette(false); }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) handleGenerate();
    }
  };

  async function handleGenerate() {
    if (!selectedProf) { setProfOpen(true); return; }
    const context = value.replace(/^\/\w+\s*/, "").trim();
    setIsGenerating(true);
    setGenError("");
    setSubject("");
    setBody("");

    startTransition(async () => {
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            professorId: selectedProf.id,
            goalType: activeAction.goal,
            experience: context,
            specificAsk: "",
            tone: activeAction.tone,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Generation failed");
        setSubject(data.subject ?? "");
        setBody(data.body ?? "");
      } catch (err: unknown) {
        setGenError(err instanceof Error ? err.message : "Failed to generate email");
      } finally {
        setIsGenerating(false);
      }
    });
  }

  async function handleSend() {
    if (!selectedProf || !subject || !body) return;
    setSending(true);
    setSendError("");
    try {
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professorId: selectedProf.id, subject, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Send failed");
      setSent(true);
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  const hasEmail = subject.trim() && body.trim();
  const [showWarning, setShowWarning] = useState(true);
  const [warningHovered, setWarningHovered] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const text = `Subject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function profInitials(name: string) {
    return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  }

  // Sent state
  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <GradientBackground />
        <motion.div className="relative z-10 flex flex-col items-center gap-5" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center border border-white/10 shadow-2xl">
            <Check className="h-7 w-7 text-white" />
          </div>
          <p className="text-white font-semibold text-xl">Email sent!</p>
          <Link href="/dashboard/inbox" className="text-sm text-white/40 hover:text-white/70 transition-colors">Go to inbox →</Link>
        </motion.div>
      </div>
    );
  }

  const placeholder = value.startsWith("/") && !value.includes(" ")
    ? "Select a command from the list above…"
    : activeAction.placeholder;

  return (
    <div className="min-h-screen flex flex-col w-full items-center justify-center text-white p-6 relative overflow-hidden">
      <GradientBackground />
      <div className="fixed inset-0 -z-10 bg-black/40" />

      <div className="w-full max-w-lg mx-auto relative">
        <motion.div className="relative z-10 space-y-5"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>

          {/* ── Main compose card (incident-report style) ─────────────────── */}
          <div className="flex flex-col rounded-3xl overflow-hidden bg-[#0d0d0d] text-white shadow-[11px_21px_3px_rgba(0,0,0,0.06),14px_27px_7px_rgba(0,0,0,0.10),19px_38px_14px_rgba(0,0,0,0.13),27px_54px_27px_rgba(0,0,0,0.16),39px_78px_50px_rgba(0,0,0,0.20)]">

            {/* Title */}
            <div className="px-7 pt-6 pb-5">
              <h3 className="text-3xl font-bold">write an email.</h3>
              <p className="text-sm text-[#9A9AAF] mt-1">
                {userProfile?.name ? `hi ${userProfile.name.split(" ")[0]} — ` : ""}pick a type, add context, generate.
              </p>
            </div>

            {/* Email type rows */}
            <div className="flex flex-col font-mono divide-y divide-[#1c1c1c] border-t border-[#1c1c1c]">
              {EMAIL_ACTIONS.map((action, i) => {
                const isActive = activeAction.prefix === action.prefix;
                return (
                  <motion.button key={action.prefix} onClick={() => selectAction(i)}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex w-full py-3.5 px-7 items-center gap-2 text-left hover:bg-white/[0.02] transition-colors">
                    <div className="flex flex-row gap-3 items-center text-sm w-1/2 text-[#9A9AAF]">
                      <span className={cn("transition-colors", isActive ? "text-orange-400" : "text-white/25")}>{action.icon}</span>
                      <span className={cn("transition-colors", isActive && "text-white")}>{action.label}</span>
                    </div>
                    <div className="flex gap-2 w-1/2 justify-end items-center">
                      <span className={cn("text-xs transition-colors", isActive ? "text-orange-400/70" : "text-white/15")}>{action.prefix}</span>
                      <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
                        <rect width="28" height="28" rx="14"
                          fill={isActive ? "rgb(255 107 0)" : "rgb(255 255 255)"}
                          fillOpacity={isActive ? 0.28 : 0.04} />
                        {isActive
                          ? <path d="M9 14.5L12.5 18L19 11" stroke="#FF6B00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          : <path d="M12 14h4M14 12l2 2-2 2" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
                      </svg>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Professor picker row */}
            <div className="border-t border-[#1c1c1c] px-7 py-4 relative" ref={profDropRef}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm text-[#9A9AAF] font-mono">
                  <GraduationCap className="h-4 w-4 text-white/25" />
                  <span>to:</span>
                </div>
                <button onClick={() => setProfOpen(o => !o)}
                  className={cn("flex items-center gap-1.5 text-sm font-medium transition-colors",
                    selectedProf ? "text-orange-300" : "text-white/30 hover:text-white/60")}>
                  {selectedProf ? selectedProf.name : "pick a professor"}
                  <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </button>
              </div>
              {selectedProf && (
                <p className="text-right text-xs text-white/20 mt-0.5 font-mono">
                  {[selectedProf.title, selectedProf.department, selectedProf.school].filter(Boolean).join(" · ")}
                </p>
              )}
              <AnimatePresence>
                {profOpen && (
                  <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.15 }}
                    className="absolute z-50 top-full left-7 right-7 mt-1 rounded-2xl border border-white/10 bg-[#111]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                    <div className="p-2 border-b border-white/8">
                      <input autoFocus type="text" placeholder="Search professors…" value={profQuery}
                        onChange={(e) => setProfQuery(e.target.value)}
                        className="w-full bg-white/5 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none" />
                    </div>
                    <div className="max-h-52 overflow-y-auto">
                      {filteredProfs.length === 0
                        ? <p className="px-4 py-3 text-sm text-white/30">No professors found.</p>
                        : filteredProfs.map((p) => (
                          <button key={p.id} onClick={() => { setSelectedProf(p); setProfOpen(false); setProfQuery(""); }}
                            className="w-full text-left px-4 py-2.5 hover:bg-white/8 transition-colors border-b border-white/5 last:border-0">
                            <p className="text-sm text-white font-medium truncate">{p.name}</p>
                            <p className="text-xs text-white/35 truncate">{[p.department, p.school].filter(Boolean).join(" · ")}</p>
                          </button>
                        ))}
                    </div>
                    {professors.length > 10 && (
                      <p className="px-4 py-2 text-xs text-white/20 border-t border-white/5">Type to search all {professors.length} professors</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Context textarea */}
            <div className="border-t border-[#1c1c1c] relative">
              <AnimatePresence>
                {showCommandPalette && (
                  <motion.div ref={commandPaletteRef}
                    className="absolute left-7 right-7 bottom-full mb-2 backdrop-blur-xl bg-[#111]/95 rounded-xl z-50 border border-white/10 overflow-hidden shadow-xl"
                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} transition={{ duration: 0.15 }}>
                    {EMAIL_ACTIONS.map((a, i) => (
                      <motion.div key={a.prefix}
                        className={cn("flex items-center gap-2 px-4 py-2.5 text-xs cursor-pointer transition-colors",
                          activeSuggestion === i ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5")}
                        onClick={() => selectAction(i)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                        <div className="w-4 h-4 flex items-center justify-center text-white/50">{a.icon}</div>
                        <span className="font-medium">{a.label}</span>
                        <span className="text-white/25 ml-1 font-mono">{a.prefix}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              <textarea ref={textareaRef} value={value}
                onChange={(e) => { setValue(e.target.value); adjustHeight(); }}
                onKeyDown={handleKeyDown}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder={activeAction.placeholder}
                className="w-full px-7 py-5 resize-none bg-transparent text-white/80 text-sm focus:outline-none placeholder:text-[#9A9AAF]/40 min-h-[90px] font-mono"
                style={{ overflow: "hidden" }} />
              <AnimatePresence>
                {attachments.length > 0 && (
                  <motion.div className="px-7 pb-3 flex gap-2 flex-wrap"
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    {attachments.map((file, i) => (
                      <motion.div key={i} className="flex items-center gap-2 text-xs bg-white/[0.03] py-1.5 px-3 rounded-lg text-white/50 font-mono"
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                        <span>{file}</span>
                        <button onClick={() => setAttachments(p => p.filter((_, j) => j !== i))} className="text-white/25 hover:text-white">
                          <XIcon className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              {genError && <p className="px-7 pb-3 text-xs text-red-400 font-mono">{genError}</p>}
            </div>

            {/* Action bar */}
            <div className="px-7 py-4 border-t border-[#1c1c1c] flex items-center justify-between">
              <div className="flex items-center gap-1">
                <motion.button type="button" whileTap={{ scale: 0.94 }}
                  onClick={() => setAttachments(p => [...p, `file-${Math.floor(Math.random()*999)}.pdf`])}
                  className="p-2 text-white/25 hover:text-white/60 rounded-lg transition-colors">
                  <Paperclip className="w-4 h-4" />
                </motion.button>
                <motion.button type="button" data-command-button whileTap={{ scale: 0.94 }}
                  onClick={(e) => { e.stopPropagation(); setShowCommandPalette(p => !p); }}
                  className={cn("p-2 text-white/25 hover:text-white/60 rounded-lg transition-colors", showCommandPalette && "bg-white/10 text-white/60")}>
                  <Command className="w-4 h-4" />
                </motion.button>
              </div>
              <motion.button type="button" onClick={handleGenerate}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                disabled={isGenerating || !value.trim()}
                className={cn("px-5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2",
                  value.trim() && !isGenerating ? "bg-white text-black" : "bg-white/[0.05] text-white/25 cursor-not-allowed")}>
                {isGenerating ? <LoaderIcon className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isGenerating ? "Generating…" : "Generate"}
              </motion.button>
            </div>
          </div>

          {/* Generated email */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div key="skeleton"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="backdrop-blur-2xl bg-white/[0.02] rounded-2xl border border-white/[0.05] p-6 space-y-3">
                <div className="flex items-center gap-2 text-white/50 text-sm">
                  <Sparkles className="h-4 w-4 text-orange-400 animate-pulse" />
                  Writing your email to {selectedProf?.name}…
                </div>
                <div className="space-y-2 animate-pulse">
                  {[2, 3, 2.5, 3, 2].map((w, i) => (
                    <div key={i} className="h-2.5 bg-white/[0.06] rounded" style={{ width: `${w / 3 * 100}%` }} />
                  ))}
                </div>
              </motion.div>
            )}

            {hasEmail && !isGenerating && (
              <motion.div key="email"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="w-full p-1.5 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.18] shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_8px_32px_rgba(0,0,0,0.6)]"
              >
                <div className="w-full rounded-xl bg-gradient-to-br from-white/[0.09] via-white/[0.04] to-transparent backdrop-blur-md border border-white/[0.10] text-white">

                  {/* Professor header row */}
                  <div className="flex gap-3 p-5 pb-4">
                    <div className="h-10 w-10 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-300 text-sm font-semibold shrink-0">
                      {selectedProf ? profInitials(selectedProf.name) : "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-white/90 text-sm leading-tight">{selectedProf?.name}</p>
                          <p className="text-white/40 text-xs mt-0.5">
                            {[selectedProf?.title, selectedProf?.school].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <button onClick={() => handleGenerate()} disabled={isGenerating}
                          className="flex items-center gap-1 text-[11px] text-white/25 hover:text-white/50 transition-colors shrink-0 pt-0.5">
                          <RefreshCw className="h-3 w-3" /> Regenerate
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="px-5 pb-3 border-b border-white/[0.06]">
                    <label className="text-[10px] font-semibold text-white/20 uppercase tracking-widest block mb-1">Subject</label>
                    <input value={subject} onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-transparent text-white text-sm font-medium focus:outline-none placeholder:text-white/20" />
                  </div>

                  {/* Body + toolbar */}
                  <div className="p-5 space-y-3">
                    <EmailFormatToolbar editorRef={bodyRef} />
                    <div
                      ref={bodyRef}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={() => setBody(bodyRef.current?.innerText ?? "")}
                      className="w-full min-h-[180px] bg-transparent text-white/75 text-sm leading-relaxed focus:outline-none outline-none whitespace-pre-wrap"
                    />
                  </div>

                  {/* Warning banner — UpgradeBanner style */}
                  <AnimatePresence>
                    {showWarning && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="mx-5 mb-4 overflow-hidden flex justify-center"
                      >
                        <div className="relative">
                          {/* Flying gear icons on hover */}
                          <motion.div
                            animate={warningHovered ? { x: -10, y: -10, opacity: 1, rotate: 360 } : { x: 0, y: 0, opacity: 0, rotate: 0 }}
                            transition={{ x: { duration: 0.3 }, y: { duration: 0.3 }, opacity: { duration: 0.3 }, rotate: { duration: 1, type: "spring", stiffness: 100, damping: 10 } }}
                            className="pointer-events-none absolute left-[4px] top-[2px]"
                          >
                            <svg height="14" viewBox="0 0 16 16" width="14" className="text-amber-500/70" fill="currentColor">
                              <path fillRule="evenodd" clipRule="evenodd" d="M9.49999 0H6.49999L6.22628 1.45975C6.1916 1.64472 6.05544 1.79299 5.87755 1.85441C5.6298 1.93996 5.38883 2.04007 5.15568 2.15371C4.98644 2.2362 4.78522 2.22767 4.62984 2.12136L3.40379 1.28249L1.28247 3.40381L2.12135 4.62986C2.22766 4.78524 2.23619 4.98646 2.1537 5.15569C2.04005 5.38885 1.93995 5.62981 1.8544 5.87756C1.79297 6.05545 1.6447 6.19162 1.45973 6.2263L0 6.5V9.5L1.45973 9.7737C1.6447 9.80838 1.79297 9.94455 1.8544 10.1224C1.93995 10.3702 2.04006 10.6112 2.1537 10.8443C2.23619 11.0136 2.22767 11.2148 2.12136 11.3702L1.28249 12.5962L3.40381 14.7175L4.62985 13.8786C4.78523 13.7723 4.98645 13.7638 5.15569 13.8463C5.38884 13.9599 5.6298 14.06 5.87755 14.1456C6.05544 14.207 6.1916 14.3553 6.22628 14.5403L6.49999 16H9.49999L9.77369 14.5403C9.80837 14.3553 9.94454 14.207 10.1224 14.1456C10.3702 14.06 10.6111 13.9599 10.8443 13.8463C11.0135 13.7638 11.2147 13.7723 11.3701 13.8786L12.5962 14.7175L14.7175 12.5962L13.8786 11.3701C13.7723 11.2148 13.7638 11.0135 13.8463 10.8443C13.9599 10.6112 14.06 10.3702 14.1456 10.1224C14.207 9.94455 14.3553 9.80839 14.5402 9.7737L16 9.5V6.5L14.5402 6.2263C14.3553 6.19161 14.207 6.05545 14.1456 5.87756C14.06 5.62981 13.9599 5.38885 13.8463 5.1557C13.7638 4.98647 13.7723 4.78525 13.8786 4.62987L14.7175 3.40381L12.5962 1.28249L11.3701 2.12137C11.2148 2.22768 11.0135 2.2362 10.8443 2.15371C10.6111 2.04007 10.3702 1.93996 10.1224 1.85441C9.94454 1.79299 9.80837 1.64472 9.77369 1.45974L9.49999 0ZM8 11C9.65685 11 11 9.65685 11 8C11 6.34315 9.65685 5 8 5C6.34315 5 5 6.34315 5 8C5 9.65685 6.34315 11 8 11Z" />
                            </svg>
                          </motion.div>
                          <motion.div
                            animate={warningHovered ? { x: 10, y: 10, opacity: 1, rotate: 360 } : { x: 0, y: 0, opacity: 0, rotate: 0 }}
                            transition={{ x: { duration: 0.3 }, y: { duration: 0.3 }, opacity: { duration: 0.3 }, rotate: { duration: 1, type: "spring", stiffness: 100, damping: 10 } }}
                            className="pointer-events-none absolute bottom-[2px] left-[5.5rem]"
                          >
                            <svg height="14" viewBox="0 0 16 16" width="14" className="text-amber-500/70" fill="currentColor">
                              <path fillRule="evenodd" clipRule="evenodd" d="M9.49999 0H6.49999L6.22628 1.45975C6.1916 1.64472 6.05544 1.79299 5.87755 1.85441C5.6298 1.93996 5.38883 2.04007 5.15568 2.15371C4.98644 2.2362 4.78522 2.22767 4.62984 2.12136L3.40379 1.28249L1.28247 3.40381L2.12135 4.62986C2.22766 4.78524 2.23619 4.98646 2.1537 5.15569C2.04005 5.38885 1.93995 5.62981 1.8544 5.87756C1.79297 6.05545 1.6447 6.19162 1.45973 6.2263L0 6.5V9.5L1.45973 9.7737C1.6447 9.80838 1.79297 9.94455 1.8544 10.1224C1.93995 10.3702 2.04006 10.6112 2.1537 10.8443C2.23619 11.0136 2.22767 11.2148 2.12136 11.3702L1.28249 12.5962L3.40381 14.7175L4.62985 13.8786C4.78523 13.7723 4.98645 13.7638 5.15569 13.8463C5.38884 13.9599 5.6298 14.06 5.87755 14.1456C6.05544 14.207 6.1916 14.3553 6.22628 14.5403L6.49999 16H9.49999L9.77369 14.5403C9.80837 14.3553 9.94454 14.207 10.1224 14.1456C10.3702 14.06 10.6111 13.9599 10.8443 13.8463C11.0135 13.7638 11.2147 13.7723 11.3701 13.8786L12.5962 14.7175L14.7175 12.5962L13.8786 11.3701C13.7723 11.2148 13.7638 11.0135 13.8463 10.8443C13.9599 10.6112 14.06 10.3702 14.1456 10.1224C14.207 9.94455 14.3553 9.80839 14.5402 9.7737L16 9.5V6.5L14.5402 6.2263C14.3553 6.19161 14.207 6.05545 14.1456 5.87756C14.06 5.62981 13.9599 5.38885 13.8463 5.1557C13.7638 4.98647 13.7723 4.78525 13.8786 4.62987L14.7175 3.40381L12.5962 1.28249L11.3701 2.12137C11.2148 2.22768 11.0135 2.2362 10.8443 2.15371C10.6111 2.04007 10.3702 1.93996 10.1224 1.85441C9.94454 1.79299 9.80837 1.64472 9.77369 1.45974L9.49999 0ZM8 11C9.65685 11 11 9.65685 11 8C11 6.34315 9.65685 5 8 5C6.34315 5 5 6.34315 5 8C5 9.65685 6.34315 11 8 11Z" />
                            </svg>
                          </motion.div>
                          <div className="relative flex h-[35px] items-center gap-1 rounded-[6px] border border-amber-800/50 bg-amber-950/40 pl-2.5 pr-1 text-sm">
                            <button
                              onMouseEnter={() => setWarningHovered(true)}
                              onMouseLeave={() => setWarningHovered(false)}
                              className="cursor-default border-none bg-transparent px-0 py-1 text-[13px] font-medium text-amber-400/80 underline decoration-amber-800/50 underline-offset-[5px] outline-none"
                            >
                              AI-generated
                            </button>
                            <span className="text-[0.8125rem] text-amber-600/60">— verify before sending</span>
                            <button
                              onClick={() => setShowWarning(false)}
                              className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] bg-transparent text-amber-700/50 hover:bg-amber-900/40 transition-colors"
                            >
                              <XIcon size={14} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {sendError && <p className="px-5 pb-3 text-xs text-red-400">{sendError}</p>}

                  {/* Footer / send + copy */}
                  <div className="px-5 pb-5 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                    <motion.button onClick={handleCopy}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      className="inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors">
                      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copied!" : "Copy email"}
                    </motion.button>
                    <motion.button onClick={handleSend} disabled={sending || !subject || !body}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      className={cn("inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold transition-all",
                        !sending && subject && body
                          ? "bg-white text-[#0a0a0a] shadow-lg shadow-white/10"
                          : "bg-white/[0.05] text-white/40 cursor-not-allowed")}>
                      {sending ? <><LoaderIcon className="h-4 w-4 animate-spin" /> Sending…</> : <><SendIcon className="h-4 w-4" /> Send Email</>}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* "Thinking" indicator */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div className="fixed bottom-8 left-1/2 -translate-x-1/2 backdrop-blur-2xl bg-white/[0.02] rounded-full px-4 py-2 shadow-lg border border-white/[0.05]"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
            <div className="flex items-center gap-3">
                <div className="w-8 h-7 rounded-full bg-white/[0.05] flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-orange-300" />
              </div>
              <div className="flex items-center gap-2 text-sm text-white/70">
                <span>Writing</span>
                <TypingDots />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mouse glow */}
      {inputFocused && (
        <motion.div className="fixed w-[50rem] h-[50rem] rounded-full pointer-events-none z-0 opacity-[0.03] bg-gradient-to-r from-orange-500 via-red-500 to-orange-400 blur-[96px]"
          animate={{ x: mousePosition.x - 400, y: mousePosition.y - 400 }}
          transition={{ type: "spring", damping: 25, stiffness: 150, mass: 0.5 }} />
      )}
    </div>
  );
}
