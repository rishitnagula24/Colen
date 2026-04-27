"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Send, RefreshCw, Save, Loader2,
  GraduationCap, Eye, EyeOff, BookOpen, Users,
  MessageSquare, Zap, Copy, Check, X as XIcon,
  Star, AlignLeft, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Professor, UserProfile, GoalType, ToneType } from "@/types/database";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Annotation {
  quote: string;
  type: "good" | "fix";
  comment: string;
}

interface Feedback {
  likelihood_to_reply: "low" | "medium" | "high";
  overall_impression: string;
  annotations: Annotation[];
}

interface Props {
  professors: Professor[];
  initialProfessorId: string | null;
  userProfile: UserProfile | null;
  writingSamplesCount: number;
  starredProfessorIds: string[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TONES: { value: ToneType; label: string; description: string; bestFor: string; icon: React.ReactNode }[] = [
  {
    value: "scholarly",
    label: "Scholarly",
    description: "Formal, structured paragraphs. Cites specific research with correct terminology.",
    bestFor: "Competitive labs & formal institutions",
    icon: <BookOpen className="h-3.5 w-3.5" />,
  },
  {
    value: "personal",
    label: "Personal",
    description: "Warm, genuine first-person voice. Sounds like a real person, not a template.",
    bestFor: "Approachable professors, mentorship asks",
    icon: <MessageSquare className="h-3.5 w-3.5" />,
  },
  {
    value: "bold",
    label: "Bold",
    description: "Opens with your strongest credential. Frames the email as mutual value.",
    bestFor: "Strong backgrounds, follow-up emails",
    icon: <Zap className="h-3.5 w-3.5" />,
  },
  {
    value: "brief",
    label: "Brief",
    description: "Under 100 words, no filler. Respects their inbox like nothing else.",
    bestFor: "Busy or famous professors",
    icon: <AlignLeft className="h-3.5 w-3.5" />,
  },
];

const GOALS: { value: GoalType; label: string; icon: React.ReactNode }[] = [
  { value: "research", label: "Research opp", icon: <BookOpen className="h-4 w-4" /> },
  { value: "mentorship", label: "Mentorship", icon: <GraduationCap className="h-4 w-4" /> },
  { value: "referral", label: "Referral / rec", icon: <Users className="h-4 w-4" /> },
];

const GEAR_PATH = "M9.49999 0H6.49999L6.22628 1.45975C6.1916 1.64472 6.05544 1.79299 5.87755 1.85441C5.6298 1.93996 5.38883 2.04007 5.15568 2.15371C4.98644 2.2362 4.78522 2.22767 4.62984 2.12136L3.40379 1.28249L1.28247 3.40381L2.12135 4.62986C2.22766 4.78524 2.23619 4.98646 2.1537 5.15569C2.04005 5.38885 1.93995 5.62981 1.8544 5.87756C1.79297 6.05545 1.6447 6.19162 1.45973 6.2263L0 6.5V9.5L1.45973 9.7737C1.6447 9.80838 1.79297 9.94455 1.8544 10.1224C1.93995 10.3702 2.04006 10.6112 2.1537 10.8443C2.23619 11.0136 2.22767 11.2148 2.12136 11.3702L1.28249 12.5962L3.40381 14.7175L4.62985 13.8786C4.78523 13.7723 4.98645 13.7638 5.15569 13.8463C5.38884 13.9599 5.6298 14.06 5.87755 14.1456C6.05544 14.207 6.1916 14.3553 6.22628 14.5403L6.49999 16H9.49999L9.77369 14.5403C9.80837 14.3553 9.94454 14.207 10.1224 14.1456C10.3702 14.06 10.6111 13.9599 10.8443 13.8463C11.0135 13.7638 11.2147 13.7723 11.3701 13.8786L12.5962 14.7175L14.7175 12.5962L13.8786 11.3701C13.7723 11.2148 13.7638 11.0135 13.8463 10.8443C13.9599 10.6112 14.06 10.3702 14.1456 10.1224C14.207 9.94455 14.3553 9.80839 14.5402 9.7737L16 9.5V6.5L14.5402 6.2263C14.3553 6.19161 14.207 6.05545 14.1456 5.87756C14.06 5.62981 13.9599 5.38885 13.8463 5.1557C13.7638 4.98647 13.7723 4.78525 13.8786 4.62987L14.7175 3.40381L12.5962 1.28249L11.3701 2.12137C11.2148 2.22768 11.0135 2.2362 10.8443 2.15371C10.6111 2.04007 10.3702 1.93996 10.1224 1.85441C9.94454 1.79299 9.80837 1.64472 9.77369 1.45974L9.49999 0ZM8 11C9.65685 11 11 9.65685 11 8C11 6.34315 9.65685 5 8 5C6.34315 5 5 6.34315 5 8C5 9.65685 6.34315 11 8 11Z";

const REPLY_CONFIG = {
  low: { label: "Low reply chance", dot: "bg-red-400", text: "text-red-400", ring: "border-red-500/30 bg-red-500/8" },
  medium: { label: "Medium reply chance", dot: "bg-amber-400", text: "text-amber-400", ring: "border-amber-500/30 bg-amber-500/8" },
  high: { label: "High reply chance", dot: "bg-emerald-400", text: "text-emerald-400", ring: "border-emerald-500/30 bg-emerald-500/8" },
};

const DRAFT_KEY = "colen_compose_draft";

// ── Annotated body renderer ───────────────────────────────────────────────────

type Segment = { text: string; annIdx: number | null; type: "good" | "fix" | null };

function buildSegments(body: string, annotations: Annotation[]): Segment[] {
  const hits: { start: number; end: number; idx: number; type: "good" | "fix" }[] = [];

  annotations.forEach((ann, idx) => {
    const pos = body.indexOf(ann.quote);
    if (pos !== -1) hits.push({ start: pos, end: pos + ann.quote.length, idx, type: ann.type });
  });

  hits.sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const h of hits) {
    if (h.start < cursor) continue;
    if (h.start > cursor) segments.push({ text: body.slice(cursor, h.start), annIdx: null, type: null });
    segments.push({ text: body.slice(h.start, h.end), annIdx: h.idx, type: h.type });
    cursor = h.end;
  }
  if (cursor < body.length) segments.push({ text: body.slice(cursor), annIdx: null, type: null });
  return segments;
}

function AnnotatedBody({
  body,
  annotations,
  hovered,
  onHover,
}: {
  body: string;
  annotations: Annotation[];
  hovered: number | null;
  onHover: (i: number | null) => void;
}) {
  const segments = buildSegments(body, annotations);
  const foundIdxs = [...new Set(segments.filter(s => s.annIdx !== null).map(s => s.annIdx!))]
    .sort((a, b) => a - b);
  const displayNum = (idx: number) => foundIdxs.indexOf(idx) + 1;

  return (
    <p className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap">
      {segments.map((seg, i) => {
        if (seg.annIdx === null) return <span key={i}>{seg.text}</span>;
        const ann = annotations[seg.annIdx];
        const isGood = seg.type === "good";
        const isHovered = hovered === seg.annIdx;
        const num = displayNum(seg.annIdx);
        return (
          <span key={i} className="relative inline" onMouseEnter={() => onHover(seg.annIdx)} onMouseLeave={() => onHover(null)}>
            <span className={cn(
              "rounded-[3px] px-0.5 cursor-default transition-colors",
              isGood
                ? isHovered ? "bg-emerald-500/35 text-emerald-100" : "bg-emerald-500/15 text-emerald-200"
                : isHovered ? "bg-amber-500/35 text-amber-100" : "bg-amber-500/15 text-amber-200"
            )}>
              {seg.text}
              <sup className={cn("ml-0.5 text-[8px] font-bold leading-none", isGood ? "text-emerald-400" : "text-amber-400")}>{num}</sup>
            </span>
            {isHovered && (
              <span className={cn(
                "absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-56 rounded-lg px-3 py-2.5 text-xs leading-relaxed shadow-xl pointer-events-none",
                isGood ? "bg-emerald-950 border border-emerald-500/30 text-emerald-100" : "bg-amber-950 border border-amber-500/30 text-amber-100"
              )}>
                <span className={cn("block text-[10px] font-semibold mb-1 uppercase tracking-wider", isGood ? "text-emerald-400" : "text-amber-400")}>
                  {isGood ? "✓ Works" : "⚠ Fix this"}
                </span>
                {ann.comment}
                <span className={cn("absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent", isGood ? "border-t-emerald-500/30" : "border-t-amber-500/30")} />
              </span>
            )}
          </span>
        );
      })}
    </p>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ComposeClient({ professors, initialProfessorId, userProfile, writingSamplesCount, starredProfessorIds }: Props) {
  const router = useRouter();

  const starredSet = useMemo(() => new Set(starredProfessorIds), [starredProfessorIds]);

  const [professorId, setProfessorId] = useState(initialProfessorId ?? "");
  const [goalType, setGoalType] = useState<GoalType>("research");
  const [experience, setExperience] = useState("");
  const [specificAsk, setSpecificAsk] = useState("");
  const [tone, setTone] = useState<ToneType>("scholarly");

  // Professor typeahead
  const [profQuery, setProfQuery] = useState("");
  const [profOpen, setProfOpen] = useState(false);
  const profDropRef = useRef<HTMLDivElement>(null);
  const profInputRef = useRef<HTMLInputElement>(null);

  const [editableSubject, setEditableSubject] = useState("");
  const [editableBody, setEditableBody] = useState("");
  const [hasGenerated, setHasGenerated] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);

  const [showPOV, setShowPOV] = useState(false);
  const [hoveredAnn, setHoveredAnn] = useState<number | null>(null);
  const [showAiWarning, setShowAiWarning] = useState(true);
  const [warningHovered, setWarningHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function handleCopy() {
    navigator.clipboard.writeText(`Subject: ${editableSubject}\n\n${editableBody}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sent, setSent] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [sendError, setSendError] = useState("");

  const selectedProfessor = professors.find((p) => p.id === professorId) ?? null;

  // Professors sorted: starred first, then alphabetical
  const sortedProfessors = useMemo(() => {
    const starred = professors.filter(p => starredSet.has(p.id));
    const rest = professors.filter(p => !starredSet.has(p.id));
    return [...starred, ...rest];
  }, [professors, starredSet]);

  const filteredProfs = useMemo(() => {
    const query = profQuery.trim().toLowerCase();
    const list = query
      ? sortedProfessors.filter(p =>
          `${p.name} ${p.school ?? ""} ${p.department ?? ""}`.toLowerCase().includes(query)
        )
      : sortedProfessors;
    return list.slice(0, 14);
  }, [sortedProfessors, profQuery]);

  // Close prof dropdown on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (profDropRef.current && !profDropRef.current.contains(e.target as Node)) setProfOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Focus input when dropdown opens without a selection
  useEffect(() => {
    if (profOpen && !selectedProfessor) {
      setTimeout(() => profInputRef.current?.focus(), 0);
    }
  }, [profOpen, selectedProfessor]);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const prompt = localStorage.getItem("compose_context");
      if (prompt) {
        setExperience(prompt);
        localStorage.removeItem("compose_context");
        return;
      }
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.professorId) setProfessorId(s.professorId);
      if (s.goalType) setGoalType(s.goalType);
      if (s.experience) setExperience(s.experience);
      if (s.specificAsk) setSpecificAsk(s.specificAsk);
      if (s.tone && ["scholarly", "personal", "bold", "brief"].includes(s.tone)) setTone(s.tone);
      if (s.editableSubject) { setEditableSubject(s.editableSubject); setHasGenerated(true); }
      if (s.editableBody) { setEditableBody(s.editableBody); setHasGenerated(true); }
      if (s.feedback?.annotations) setFeedback(s.feedback);
      if (s.draftId) setDraftId(s.draftId);
    } catch {}
  }, []);

  // Auto-save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        professorId, goalType, experience, specificAsk, tone,
        editableSubject, editableBody, feedback, draftId,
      }));
    } catch {}
  }, [professorId, goalType, experience, specificAsk, tone, editableSubject, editableBody, feedback, draftId]);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [saved]);

  async function handleGenerate() {
    if (!professorId) return;
    setGenerating(true);
    setGenerateError("");
    setFeedback(null);
    setShowPOV(false);

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ professorId, goalType, experience, specificAsk, tone }),
    });

    const data = await res.json();
    if (!res.ok) {
      setGenerateError(data.error ?? "Generation failed.");
    } else {
      setEditableSubject(data.subject ?? "");
      setEditableBody(data.body ?? "");
      setHasGenerated(true);
      if (data.feedback) setFeedback(data.feedback);
      if (data.draftId) setDraftId(data.draftId);
    }
    setGenerating(false);
  }

  async function handleSaveDraft() {
    if (!editableSubject && !editableBody) return;
    setSaving(true);
    const supabase = createClient();
    if (draftId) {
      await supabase.from("email_drafts").update({ generated_subject: editableSubject, generated_body: editableBody }).eq("id", draftId);
    } else if (professorId) {
      const { data } = await supabase
        .from("email_drafts")
        .insert({ user_id: userProfile?.id, professor_id: professorId, goal_type: goalType, generated_subject: editableSubject, generated_body: editableBody, status: "draft" } as never)
        .select("id").single();
      if (data) setDraftId((data as { id: string }).id);
    }
    setSaving(false);
    setSaved(true);
  }

  async function handleSend() {
    if (!professorId || !editableSubject || !editableBody) return;
    setSending(true);
    setSendError("");
    const res = await fetch("/api/emails/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ professorId, subject: editableSubject, body: editableBody }),
    });
    if (!res.ok) {
      const data = await res.json();
      setSendError(data.error ?? "Send failed.");
      setSending(false);
    } else {
      if (draftId) {
        const supabase = createClient();
        await supabase.from("email_drafts").update({ status: "sent" }).eq("id", draftId);
      }
      localStorage.removeItem(DRAFT_KEY);
      setSent(true);
      setTimeout(() => router.push("/dashboard/inbox"), 1500);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="h-12 w-12 rounded-full bg-violet-500/20 flex items-center justify-center">
          <Send className="h-5 w-5 text-violet-400" />
        </div>
        <p className="text-white font-medium">Email sent!</p>
        <p className="text-white/40 text-sm">Redirecting to inbox…</p>
      </div>
    );
  }

  const replyConf = feedback ? REPLY_CONFIG[feedback.likelihood_to_reply] : null;
  const visibleAnnotations = (feedback?.annotations ?? []).filter(a => editableBody.includes(a.quote));

  return (
    <div className="space-y-5 max-w-2xl mx-auto">

      {/* Writing samples warning */}
      {writingSamplesCount === 0 && (
        <div className="flex justify-center">
          <div className="relative">
            {mounted && (
              <motion.div
                animate={warningHovered ? { x: -10, y: -10, opacity: 1, rotate: 360 } : { x: 0, y: 0, opacity: 0, rotate: 0 }}
                transition={{ x: { duration: 0.3 }, y: { duration: 0.3 }, opacity: { duration: 0.3 }, rotate: { duration: 1, type: "spring", stiffness: 100, damping: 10 } }}
                className="pointer-events-none absolute left-[4px] top-[2px]"
              >
                <svg height="14" viewBox="0 0 16 16" width="14" className="text-amber-500/70" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d={GEAR_PATH} />
                </svg>
              </motion.div>
            )}
            {mounted && (
              <motion.div
                animate={warningHovered ? { x: 10, y: 10, opacity: 1, rotate: 360 } : { x: 0, y: 0, opacity: 0, rotate: 0 }}
                transition={{ x: { duration: 0.3 }, y: { duration: 0.3 }, opacity: { duration: 0.3 }, rotate: { duration: 1, type: "spring", stiffness: 100, damping: 10 } }}
                className="pointer-events-none absolute bottom-[2px] left-[5rem]"
              >
                <svg height="14" viewBox="0 0 16 16" width="14" className="text-amber-500/70" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d={GEAR_PATH} />
                </svg>
              </motion.div>
            )}
            <div className="relative flex h-[35px] items-center gap-1 rounded-[6px] border border-amber-800/50 bg-amber-950/40 pl-2.5 pr-1 text-sm">
              <button onMouseEnter={() => setWarningHovered(true)} onMouseLeave={() => setWarningHovered(false)}
                className="cursor-default border-none bg-transparent px-0 py-1 text-[13px] font-medium text-amber-400/80 underline decoration-amber-800/50 underline-offset-[5px] outline-none">
                No writing samples
              </button>
              <span className="text-[0.8125rem] text-amber-600/60">— emails use a generic voice.</span>
              <Link href="/dashboard/writing-style" className="text-[0.8125rem] text-amber-500/70 underline underline-offset-2 hover:text-amber-400 ml-1">
                Add samples
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Main compose card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="flex flex-col rounded-3xl overflow-hidden bg-[#0d0d0d] text-white shadow-[11px_21px_3px_rgba(0,0,0,0.06),14px_27px_7px_rgba(0,0,0,0.10),19px_38px_14px_rgba(0,0,0,0.13),27px_54px_27px_rgba(0,0,0,0.16),39px_78px_50px_rgba(0,0,0,0.20)]"
      >
        {/* Title */}
        <div className="px-8 pt-7 pb-5">
          <h3 className="text-3xl font-bold">write an email.</h3>
          <p className="text-sm text-[#9A9AAF] mt-1">
            {userProfile?.name ? `hi ${userProfile.name.split(" ")[0]} — ` : ""}pick a professor, set goal, generate.
          </p>
        </div>

        {/* ── Professor typeahead ── */}
        <div className="border-t border-[#1c1c1c] px-8 py-4 relative" ref={profDropRef}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm text-[#9A9AAF] font-mono shrink-0">
              <GraduationCap className="h-4 w-4 text-white/25" />
              <span>to:</span>
            </div>
            {selectedProfessor ? (
              <button
                onClick={() => { setProfessorId(""); setProfQuery(""); setProfOpen(true); }}
                className="flex items-center gap-1.5 text-sm font-medium text-orange-300 hover:text-orange-200 transition-colors ml-auto"
              >
                {starredSet.has(selectedProfessor.id) && <Star className="h-3 w-3 fill-orange-400 text-orange-400" />}
                {selectedProfessor.name}
                <XIcon className="h-3.5 w-3.5 opacity-40 ml-0.5" />
              </button>
            ) : (
              <div className="flex items-center gap-1.5 ml-auto">
                <input
                  ref={profInputRef}
                  type="text"
                  value={profQuery}
                  onChange={(e) => { setProfQuery(e.target.value); setProfOpen(true); }}
                  onFocus={() => setProfOpen(true)}
                  placeholder="type a professor's name…"
                  className="bg-transparent text-sm text-white/70 text-right focus:outline-none placeholder:text-white/20 w-48"
                />
                <ChevronDown className="h-3.5 w-3.5 text-white/20 shrink-0" />
              </div>
            )}
          </div>

          {selectedProfessor && (
            <p className="text-right text-xs text-white/20 mt-0.5 font-mono">
              {[selectedProfessor.title, selectedProfessor.department, selectedProfessor.school].filter(Boolean).join(" · ")}
            </p>
          )}

          <AnimatePresence>
            {profOpen && !selectedProfessor && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.14 }}
                className="absolute z-50 top-full left-8 right-8 mt-1 rounded-2xl border border-white/10 bg-[#111]/96 backdrop-blur-xl shadow-2xl overflow-hidden"
              >
                {starredProfessorIds.length > 0 && profQuery.trim() === "" && (
                  <p className="px-4 pt-3 pb-1 text-[10px] text-white/25 uppercase tracking-widest font-mono">Starred</p>
                )}
                <div className="max-h-60 overflow-y-auto">
                  {filteredProfs.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-white/30">No professors found.</p>
                  ) : (
                    filteredProfs.map((p, i) => {
                      const isStarred = starredSet.has(p.id);
                      const prevStarred = i > 0 && starredSet.has(filteredProfs[i - 1].id);
                      const showDivider = !isStarred && prevStarred && profQuery.trim() === "";
                      return (
                        <div key={p.id}>
                          {showDivider && <div className="border-t border-white/[0.06] mx-4 my-1" />}
                          <button
                            onClick={() => { setProfessorId(p.id); setProfOpen(false); setProfQuery(""); }}
                            className="w-full text-left px-4 py-2.5 hover:bg-white/[0.06] transition-colors flex items-center gap-2.5"
                          >
                            {isStarred
                              ? <Star className="h-3 w-3 fill-orange-400 text-orange-400 shrink-0" />
                              : <span className="w-3 shrink-0" />}
                            <div className="min-w-0">
                              <p className="text-sm text-white font-medium truncate">{p.name}</p>
                              <p className="text-xs text-white/35 truncate">{[p.department, p.school].filter(Boolean).join(" · ")}</p>
                            </div>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
                {professors.length > 14 && profQuery.trim() === "" && (
                  <p className="px-4 py-2.5 text-xs text-white/20 border-t border-white/[0.06]">
                    Showing {filteredProfs.length} of {professors.length} — type to search all
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Goal — horizontal pills ── */}
        <div className="border-t border-[#1c1c1c] px-8 py-5">
          <p className="text-[10px] text-white/25 uppercase tracking-widest font-mono mb-3">goal</p>
          <div className="grid grid-cols-3 gap-2">
            {GOALS.map((g) => {
              const isActive = goalType === g.value;
              return (
                <motion.button key={g.value} onClick={() => setGoalType(g.value)}
                  whileTap={{ scale: 0.97 }}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl py-4 px-3 border transition-all text-center",
                    isActive
                      ? "border-orange-500/40 bg-orange-500/[0.10] text-white"
                      : "border-white/[0.06] bg-white/[0.02] text-white/35 hover:text-white/55 hover:bg-white/[0.04]"
                  )}>
                  <span className={cn("transition-colors", isActive ? "text-orange-400" : "text-white/20")}>
                    {g.icon}
                  </span>
                  <span className="text-xs font-medium leading-tight font-mono">{g.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ── Tone — 2×2 grid ── */}
        <div className="border-t border-[#1c1c1c] px-8 py-5">
          <p className="text-[10px] text-white/25 uppercase tracking-widest font-mono mb-3">tone</p>
          <div className="grid grid-cols-2 gap-2">
            {TONES.map((t) => {
              const isActive = tone === t.value;
              return (
                <motion.button key={t.value} onClick={() => setTone(t.value)}
                  whileTap={{ scale: 0.97 }}
                  className={cn(
                    "flex flex-col gap-1.5 rounded-2xl p-4 border transition-all text-left",
                    isActive
                      ? "border-orange-500/40 bg-orange-500/[0.10]"
                      : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                  )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("transition-colors", isActive ? "text-orange-400" : "text-white/20")}>{t.icon}</span>
                      <span className={cn("text-sm font-semibold font-mono transition-colors", isActive ? "text-white" : "text-white/45")}>{t.label}</span>
                    </div>
                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0" />}
                  </div>
                  <p className={cn("text-[11px] leading-snug transition-colors", isActive ? "text-white/50" : "text-white/20")}>
                    {t.description}
                  </p>
                  <p className={cn("text-[10px] transition-colors mt-0.5", isActive ? "text-orange-400/60" : "text-white/15")}>
                    {t.bestFor}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ── Experience textarea ── */}
        <div className="border-t border-[#1c1c1c]">
          <textarea
            rows={3}
            placeholder="Your relevant experience — courses, projects, skills…"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            className="w-full px-8 py-5 resize-none bg-transparent text-white/80 text-sm focus:outline-none placeholder:text-[#9A9AAF]/40 font-mono"
          />
        </div>

        {/* ── Specific ask ── */}
        <div className="border-t border-[#1c1c1c]">
          <input
            placeholder="Specific ask — e.g. a 15-min intro call"
            value={specificAsk}
            onChange={(e) => setSpecificAsk(e.target.value)}
            className="w-full px-8 py-4 bg-transparent text-white/80 text-sm focus:outline-none placeholder:text-[#9A9AAF]/40 font-mono"
          />
        </div>

        {/* ── Generate bar ── */}
        <div className="border-t border-[#1c1c1c] px-8 py-4 flex items-center justify-between">
          <div>
            {generateError && <p className="text-xs text-red-400 font-mono">{generateError}</p>}
          </div>
          <motion.button onClick={handleGenerate} disabled={!professorId || generating}
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
            className={cn("px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all",
              professorId && !generating ? "bg-white text-black" : "bg-white/[0.05] text-white/25 cursor-not-allowed")}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? "Generating…" : "Generate"}
          </motion.button>
        </div>
      </motion.div>

      {/* ── Generated email card ── */}
      <AnimatePresence>
        {hasGenerated && (
          <motion.div key="email"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex flex-col rounded-3xl overflow-hidden bg-[#0d0d0d] text-white shadow-[11px_21px_3px_rgba(0,0,0,0.06),14px_27px_7px_rgba(0,0,0,0.10),19px_38px_14px_rgba(0,0,0,0.13),27px_54px_27px_rgba(0,0,0,0.16)]"
          >
            {/* Card header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-[#1c1c1c]">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-300 text-xs font-bold shrink-0">
                  {selectedProfessor ? selectedProfessor.name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase() : "?"}
                </div>
                <div>
                  <p className="font-semibold text-white/90 text-sm leading-tight">{selectedProfessor?.name ?? "Professor"}</p>
                  <p className="text-white/35 text-xs">{selectedProfessor?.school ?? ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {feedback && (
                  <button onClick={() => setShowPOV(p => !p)}
                    className={cn("flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all",
                      showPOV ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-white/8 bg-white/[0.03] text-white/35 hover:text-white/60")}>
                    <GraduationCap className="h-3.5 w-3.5" />
                    Prof POV
                    {!showPOV && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
                  </button>
                )}
                <button onClick={handleGenerate} disabled={generating}
                  className="flex items-center gap-1 text-xs text-white/20 hover:text-white/50 transition-colors">
                  <RefreshCw className="h-3 w-3" /> Regenerate
                </button>
              </div>
            </div>

            {/* Draft or POV */}
            {showPOV && feedback ? (
              <div>
                <div className="px-8 py-4 border-b border-[#1c1c1c]">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-white/40 uppercase tracking-wider">First impression</p>
                    {replyConf && (
                      <span className={cn("flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border", replyConf.ring, replyConf.text)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", replyConf.dot)} />
                        {replyConf.label}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-amber-100/80 italic leading-relaxed">&ldquo;{feedback.overall_impression}&rdquo;</p>
                </div>
                <div className="px-8 py-4 border-b border-[#1c1c1c]">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Eye className="h-3.5 w-3.5 text-white/30" />
                    <p className="text-xs text-white/40">Reading your email</p>
                    <span className="ml-auto text-[10px] text-white/20">hover for detail</span>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
                    <p className="text-[11px] text-white/30 mb-2 font-medium">{editableSubject}</p>
                    <AnnotatedBody body={editableBody} annotations={feedback.annotations ?? []} hovered={hoveredAnn} onHover={setHoveredAnn} />
                  </div>
                </div>
                {visibleAnnotations.length > 0 && (
                  <div className="px-8 py-4 space-y-2">
                    {(feedback.annotations ?? []).map((ann, i) => {
                      if (!editableBody.includes(ann.quote)) return null;
                      const isGood = ann.type === "good";
                      return (
                        <div key={i} onMouseEnter={() => setHoveredAnn(i)} onMouseLeave={() => setHoveredAnn(null)}
                          className={cn("flex items-start gap-3 rounded-lg p-3 transition-all cursor-default",
                            hoveredAnn === i ? isGood ? "bg-emerald-500/10" : "bg-amber-500/10" : "bg-white/[0.02]")}>
                          <span className={cn("text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 mt-0.5",
                            isGood ? "bg-emerald-500/25 text-emerald-300" : "bg-amber-500/25 text-amber-300")}>{i + 1}</span>
                          <p className="text-xs text-white/60 leading-relaxed">{ann.comment}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="px-8 py-3 border-t border-[#1c1c1c]">
                  <button onClick={() => setShowPOV(false)}
                    className="flex items-center gap-1.5 text-xs text-white/25 hover:text-white/60 transition-colors">
                    <EyeOff className="h-3.5 w-3.5" /> Back to editing
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-8 py-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-white/20 uppercase tracking-widest">Subject</label>
                  <input value={editableSubject} onChange={(e) => setEditableSubject(e.target.value)}
                    className="w-full bg-transparent text-white text-sm font-medium focus:outline-none border-b border-white/[0.06] pb-2 focus:border-white/20 transition-colors" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold text-white/20 uppercase tracking-widest">Body</label>
                    <span className="text-[10px] text-white/15">{editableBody.length} chars</span>
                  </div>
                  <textarea ref={bodyRef} value={editableBody} onChange={(e) => setEditableBody(e.target.value)} rows={10}
                    className="w-full bg-transparent text-white/75 text-sm leading-relaxed focus:outline-none resize-none font-mono" />
                </div>
              </div>
            )}

            {/* AI warning */}
            {!showPOV && showAiWarning && (
              <div className="flex justify-center pb-4">
                <div className="relative">
                  {mounted && (
                    <motion.div
                      animate={warningHovered ? { x: -10, y: -10, opacity: 1, rotate: 360 } : { x: 0, y: 0, opacity: 0, rotate: 0 }}
                      transition={{ x: { duration: 0.3 }, y: { duration: 0.3 }, opacity: { duration: 0.3 }, rotate: { duration: 1, type: "spring", stiffness: 100, damping: 10 } }}
                      className="pointer-events-none absolute left-[4px] top-[2px]"
                    >
                      <svg height="14" viewBox="0 0 16 16" width="14" className="text-amber-500/70" fill="currentColor">
                        <path fillRule="evenodd" clipRule="evenodd" d={GEAR_PATH} />
                      </svg>
                    </motion.div>
                  )}
                  {mounted && (
                    <motion.div
                      animate={warningHovered ? { x: 10, y: 10, opacity: 1, rotate: 360 } : { x: 0, y: 0, opacity: 0, rotate: 0 }}
                      transition={{ x: { duration: 0.3 }, y: { duration: 0.3 }, opacity: { duration: 0.3 }, rotate: { duration: 1, type: "spring", stiffness: 100, damping: 10 } }}
                      className="pointer-events-none absolute bottom-[2px] left-[5.5rem]"
                    >
                      <svg height="14" viewBox="0 0 16 16" width="14" className="text-amber-500/70" fill="currentColor">
                        <path fillRule="evenodd" clipRule="evenodd" d={GEAR_PATH} />
                      </svg>
                    </motion.div>
                  )}
                  <div className="relative flex h-[35px] items-center gap-1 rounded-[6px] border border-amber-800/50 bg-amber-950/40 pl-2.5 pr-1 text-sm">
                    <button onMouseEnter={() => setWarningHovered(true)} onMouseLeave={() => setWarningHovered(false)}
                      className="cursor-default border-none bg-transparent px-0 py-1 text-[13px] font-medium text-amber-400/80 underline decoration-amber-800/50 underline-offset-[5px] outline-none">
                      AI-generated
                    </button>
                    <span className="text-[0.8125rem] text-amber-600/60">— verify before sending</span>
                    <button onClick={() => setShowAiWarning(false)}
                      className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] bg-transparent text-amber-700/50 hover:bg-amber-900/40 transition-colors">
                      <XIcon size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {sendError && <p className="px-8 pb-3 text-xs text-red-400 font-mono">{sendError}</p>}

            {/* Footer */}
            <div className="border-t border-[#1c1c1c] px-8 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.button onClick={handleCopy} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-1.5 text-xs text-white/25 hover:text-white/55 transition-colors">
                  {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied!" : "Copy"}
                </motion.button>
                {userProfile && (
                  <span className="text-[11px] text-white/15 font-mono hidden sm:inline">
                    from {userProfile.platform_email ?? userProfile.email}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <motion.button onClick={handleSaveDraft} disabled={saving || (!editableSubject && !editableBody)}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-white/10 bg-white/[0.03] text-white/50 hover:text-white/80 transition-all disabled:opacity-30">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {saved ? "Saved!" : "Save draft"}
                </motion.button>
                <motion.button onClick={handleSend} disabled={!editableSubject || !editableBody || sending}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  className={cn("inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all",
                    !sending && editableSubject && editableBody ? "bg-white text-black" : "bg-white/[0.05] text-white/25 cursor-not-allowed")}>
                  {sending ? <><Loader2 className="h-4 w-4 animate-spin" />Sending…</> : <><Send className="h-4 w-4" />Send</>}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
