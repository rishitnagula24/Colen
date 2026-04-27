"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ChevronDown, Loader2, RefreshCw, Save, Send, Upload, Zap, Search, Shield, Scissors, X, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Professor, GoalType, ScrapedPapers, MoodType, EmailAnnotation } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

interface Props {
  professor: Professor | null;
  initialDraftId?: string | null;
  initialSubject?: string | null;
  initialBody?: string | null;
}

type Phase = "input" | "review";

const GOALS: { value: GoalType; label: string; desc: string }[] = [
  { value: "research", label: "Research opportunity", desc: "Join the lab or contribute to a project" },
  { value: "mentorship", label: "Mentorship", desc: "Guidance and advice in the field" },
  { value: "referral", label: "Referral / recommendation", desc: "Letter of rec or referral" },
];

const MOODS: { value: MoodType; label: string; desc: string; icon: React.FC<{ className?: string }> }[] = [
  { value: "direct", label: "Direct", desc: "No fluff — first sentence is the point", icon: Zap },
  { value: "curious", label: "Curious", desc: "Leads with a real question about their work", icon: Search },
  { value: "confident", label: "Confident", desc: "Writes as a peer, proposes not begs", icon: Shield },
  { value: "concise", label: "Concise", desc: "70–100 words max, nothing extra", icon: Scissors },
];

function wordCount(s: string) {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

function WordCounter({ text, min }: { text: string; min: number }) {
  const count = wordCount(text);
  return (
    <span className={cn("text-xs", count >= min ? "text-green-400" : "text-red-400")}>
      {count} / {min} words
    </span>
  );
}

// Inline annotated email view
function AnnotatedBody({ body, annotations }: { body: string; annotations: EmailAnnotation[] }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  type Seg =
    | { kind: "text"; text: string }
    | { kind: "ann"; text: string; annotation: EmailAnnotation; idx: number };

  const segments: Seg[] = [];
  let remaining = body;

  const sorted = [...annotations]
    .map((a, i) => ({ ...a, origIdx: i, pos: body.indexOf(a.quote) }))
    .filter((a) => a.pos >= 0)
    .sort((a, b) => a.pos - b.pos);

  for (const ann of sorted) {
    const localPos = remaining.indexOf(ann.quote);
    if (localPos < 0) continue;
    if (localPos > 0) segments.push({ kind: "text", text: remaining.slice(0, localPos) });
    segments.push({ kind: "ann", text: ann.quote, annotation: ann, idx: ann.origIdx });
    remaining = remaining.slice(localPos + ann.quote.length);
  }
  if (remaining) segments.push({ kind: "text", text: remaining });

  return (
    <div className="relative">
      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-white/80 break-words">
        {segments.map((seg, i) => {
          if (seg.kind === "text") return <span key={i}>{seg.text}</span>;
          const isGood = seg.annotation.type === "good";
          const isActive = activeIdx === seg.idx;
          return (
            <span key={i} className="relative inline">
              <mark
                onClick={() => setActiveIdx(isActive ? null : seg.idx)}
                className={cn(
                  "rounded px-0.5 cursor-pointer transition-all duration-150",
                  isGood
                    ? "bg-green-500/25 text-green-200 hover:bg-green-500/40"
                    : "bg-amber-500/25 text-amber-200 hover:bg-amber-500/40"
                )}
              >
                {seg.text}
              </mark>
              {isActive && (
                <span
                  className={cn(
                    "absolute z-30 bottom-full left-0 mb-2 w-64 rounded-lg border px-3 py-2.5 text-xs shadow-2xl",
                    isGood
                      ? "border-green-500/30 bg-[#0a1a0f] text-green-200"
                      : "border-amber-500/30 bg-[#1a120a] text-amber-200"
                  )}
                >
                  <span className="block font-semibold mb-1 text-[10px] uppercase tracking-wider opacity-50">
                    {isGood ? "✓ what's working" : "⚠ professor's note"}
                  </span>
                  {seg.annotation.comment}
                </span>
              )}
            </span>
          );
        })}
      </pre>
    </div>
  );
}

// Writing style warning banner
function NoSamplesWarning({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mb-6 rounded-xl border border-amber-500/25 bg-amber-500/8 p-4 flex items-start gap-3">
      <div className="mt-0.5 h-5 w-5 rounded-full border border-amber-500/40 bg-amber-500/15 flex items-center justify-center shrink-0">
        <span className="text-amber-400 text-xs font-bold">!</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-300">Your email might sound like AI</p>
        <p className="text-xs text-amber-300/60 mt-0.5 leading-relaxed">
          You haven't uploaded any writing samples yet. Without them, the email is generated from scratch and may not sound like you — it could flag as AI-written.{" "}
          <a href="/dashboard/writing-style" className="underline hover:text-amber-300/90 transition-colors">
            Add your writing style →
          </a>
        </p>
      </div>
      <button onClick={onDismiss} className="text-amber-400/40 hover:text-amber-400/80 transition-colors shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

type ScoreResult = {
  opening: number; specificity: number; voice: number; ask: number;
  length: number; credibility: number; deductions: number;
  notes: Record<string, string>; overall: string;
};

type AnnotationResult = {
  overall_impression: string;
  likelihood_to_reply: string;
  annotations: EmailAnnotation[];
};

export default function EmailNewClient({ professor, initialDraftId, initialSubject, initialBody }: Props) {
  const [phase, setPhase] = useState<Phase>(initialBody ? "review" : "input");
  const [goalType, setGoalType] = useState<GoalType>("research");
  const [mood, setMood] = useState<MoodType>("direct");
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const [q3, setQ3] = useState("");
  const [questionsStarted, setQuestionsStarted] = useState(false);

  const [cvText, setCvText] = useState("");
  const [paperUrl, setPaperUrl] = useState("");
  const [cvUploading, setCvUploading] = useState(false);
  const [cvError, setCvError] = useState("");

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [hasSamples, setHasSamples] = useState<boolean | null>(null);
  const [warningDismissed, setWarningDismissed] = useState(false);

  const [draftId, setDraftId] = useState<string | null>(initialDraftId ?? null);
  const [subject, setSubject] = useState(initialSubject ?? "");
  const [body, setBody] = useState(initialBody ?? "");
  const [bodyEdited, setBodyEdited] = useState(false);
  const [score, setScore] = useState<ScoreResult | null>(null);

  const [annotating, setAnnotating] = useState(false);
  const [annotationResult, setAnnotationResult] = useState<AnnotationResult | null>(null);
  const [showAnnotations, setShowAnnotations] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const q1Ref = useRef<HTMLTextAreaElement>(null);
  const q2Ref = useRef<HTMLTextAreaElement>(null);
  const q3Ref = useRef<HTMLTextAreaElement>(null);
  const cvFileRef = useRef<HTMLInputElement>(null);

  // Check writing samples on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("writing_samples")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .then(({ count }) => setHasSamples((count ?? 0) > 0));
    });
  }, []);

  const questionsRequired = questionsStarted && questionsOpen;
  const q1Valid = wordCount(q1) >= 20;
  const q2Valid = wordCount(q2) >= 20;
  const q3Valid = wordCount(q3) >= 20;
  const canGenerate = !questionsRequired || (q1Valid && q2Valid && q3Valid);

  function handleQChange(setter: (v: string) => void, value: string) {
    setQuestionsStarted(true);
    setter(value);
  }

  async function handleCvUpload(file: File) {
    setCvUploading(true);
    setCvError("");
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/professors/extract-cv", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Extraction failed");
      setCvText(data.text);
    } catch (e: unknown) {
      setCvError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setCvUploading(false);
    }
  }

  const shakeField = useCallback((ref: React.RefObject<HTMLTextAreaElement | null>) => {
    if (!ref.current) return;
    ref.current.classList.add("animate-shake");
    ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => ref.current?.classList.remove("animate-shake"), 600);
  }, []);

  async function handleGenerate() {
    if (!professor) return;
    if (questionsStarted && questionsOpen) {
      if (!q1Valid) { shakeField(q1Ref); return; }
      if (!q2Valid) { shakeField(q2Ref); return; }
      if (!q3Valid) { shakeField(q3Ref); return; }
    }

    setGenerating(true);
    setGenerateError("");
    setBodyEdited(false);
    setAnnotationResult(null);
    setShowAnnotations(false);

    try {
      const res = await fetch("/api/email/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professorId: professor.id, goalType, mood, researchAnswers: { q1, q2, q3 }, cvText: cvText || undefined, paperUrl: paperUrl || undefined, draftId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");

      setSubject(data.email.subject);
      setBody(data.email.body);
      setScore(data.score ?? null);
      if (data.draftId) setDraftId(data.draftId);
      if (typeof data.hasSamples === "boolean") setHasSamples(data.hasSamples);
      setPhase("review");
    } catch (e: unknown) {
      setGenerateError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleGetProfessorGrade() {
    setAnnotating(true);
    setShowAnnotations(false);
    try {
      const res = await fetch("/api/email/annotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnnotationResult(data);
      setShowAnnotations(true);
      setBodyEdited(false);
    } catch {
      // silently fail
    } finally {
      setAnnotating(false);
    }
  }

  async function handleSend() {
    if (!professor?.email) { setSendError("No email address on file for this professor."); return; }
    if (!draftId) return;
    setSending(true);
    setSendError("");
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, subject, body, professorEmail: professor.email }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "NO_GMAIL") {
          setSendError("Gmail not connected. Connect it in your Profile.");
        } else {
          setSendError(data.error ?? "Send failed");
        }
        return;
      }
      setSaveMsg("Sent!");
    } catch {
      setSendError("Send failed. Try again.");
    } finally {
      setSending(false);
    }
  }

  async function handleSaveDraft() {
    if (!draftId) return;
    setSaving(true);
    setSaveMsg("");
    const supabase = createClient();
    const { error } = await supabase
      .from("email_drafts")
      .update({ generated_subject: subject, generated_body: body, status: "draft" })
      .eq("id", draftId);
    setSaving(false);
    setSaveMsg(error ? "Save failed" : "Saved");
    setTimeout(() => setSaveMsg(""), 2000);
  }

  const scraped = professor?.scraped_papers as ScrapedPapers | null;
  const researchSummary = professor?.research_summary ?? scraped?.summary ?? professor?.research_interests?.join(", ") ?? "";

  // ── REVIEW PHASE ──────────────────────────────────────────────
  if (phase === "review") {
    const dimensions = score ? [
      { key: "opening", label: "Opening line", max: 20, value: score.opening },
      { key: "specificity", label: "Research specificity", max: 25, value: score.specificity },
      { key: "voice", label: "Authentic voice", max: 20, value: score.voice },
      { key: "ask", label: "Clarity of ask", max: 15, value: score.ask },
      { key: "length", label: "Length", max: 10, value: score.length },
      { key: "credibility", label: "Credibility", max: 10, value: score.credibility },
    ] : [];

    const rawTotal = score
      ? score.opening + score.specificity + score.voice + score.ask + score.length + score.credibility
      : null;
    const deductions = score?.deductions ?? 0;
    const totalScore = rawTotal != null ? Math.max(0, rawTotal - deductions) : null;

    const scoreColor =
      totalScore == null ? "" : totalScore >= 70 ? "text-green-400" : totalScore >= 50 ? "text-amber-400" : "text-red-400";
    const scoreBg =
      totalScore == null ? "" :
      totalScore >= 70 ? "border-green-500/20 bg-green-500/5" :
      totalScore >= 50 ? "border-amber-500/20 bg-amber-500/5" :
      "border-red-500/20 bg-red-500/5";
    const canSend = totalScore != null && totalScore >= 65;

    const likelihoodColor: Record<string, string> = {
      low: "bg-red-500/20 text-red-400 border-red-500/30",
      medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      high: "bg-green-500/20 text-green-400 border-green-500/30",
    };

    return (
      <div className="px-8 py-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-white">Review your email</h1>
          <p className="text-sm text-white/40 mt-0.5">To {professor?.name} · {professor?.school}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
          {/* Left: email */}
          <div className="space-y-3">
            <div className="rounded-xl border border-white/8 bg-white/3 p-6 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-white/40 text-xs">Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="font-medium" />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-white/40 text-xs">Body</Label>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/25">{wordCount(body)} words</span>
                    {showAnnotations && !bodyEdited && (
                      <button
                        onClick={() => setBodyEdited(true)}
                        className="text-[10px] text-white/30 hover:text-white/60 underline transition-colors"
                      >
                        edit
                      </button>
                    )}
                    {bodyEdited && showAnnotations && (
                      <button
                        onClick={() => setBodyEdited(false)}
                        className="text-[10px] text-white/30 hover:text-white/60 underline transition-colors"
                      >
                        show annotations
                      </button>
                    )}
                  </div>
                </div>

                {showAnnotations && !bodyEdited && annotationResult?.annotations?.length ? (
                  <div className="rounded-md border border-white/8 bg-white/3 px-3 py-3 min-h-[14rem]">
                    <AnnotatedBody body={body} annotations={annotationResult.annotations} />
                  </div>
                ) : (
                  <Textarea
                    value={body}
                    onChange={(e) => { setBody(e.target.value); setBodyEdited(true); setShowAnnotations(false); }}
                    rows={14}
                    className="text-sm leading-relaxed"
                  />
                )}
              </div>
            </div>

            {/* Professor grade button / result */}
            {!showAnnotations ? (
              <button
                onClick={handleGetProfessorGrade}
                disabled={annotating}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/3 hover:bg-white/6 py-3 text-sm font-medium text-white/60 hover:text-white/80 transition-all disabled:opacity-50"
              >
                {annotating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Reading as a professor…</>
                ) : (
                  <><GraduationCap className="h-4 w-4" />Get professor's grade</>
                )}
              </button>
            ) : annotationResult && (
              <div className="rounded-xl border border-white/8 bg-white/3 px-5 py-3.5 flex items-center justify-between gap-4">
                <p className="text-sm text-white/55 leading-relaxed">{annotationResult.overall_impression}</p>
                <span className={cn("shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border", likelihoodColor[annotationResult.likelihood_to_reply] ?? likelihoodColor.medium)}>
                  {annotationResult.likelihood_to_reply} chance
                </span>
              </div>
            )}

            {showAnnotations && (
              <div className="flex items-center gap-4 text-xs text-white/30 px-1">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-green-500/30 border border-green-500/40" />Working</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500/30 border border-amber-500/40" />Needs work</span>
                <span>Click any highlight to see the professor's note.</span>
              </div>
            )}
          </div>

          {/* Right: score */}
          <div className="space-y-4">
            {score && (
              <div className={cn("rounded-xl border p-5 space-y-4", scoreBg)}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Email score</p>
                  <span className={cn("text-2xl font-bold tabular-nums", scoreColor)}>
                    {totalScore}<span className="text-sm text-white/30 font-normal">/100</span>
                  </span>
                </div>

                <div className="space-y-3">
                  {dimensions.map(({ key, label, max, value }) => {
                    const pct = Math.round((value / max) * 100);
                    const barColor = pct >= 80 ? "bg-green-500" : pct >= 52 ? "bg-amber-500" : "bg-red-500";
                    const note = score.notes?.[key] ?? "";
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/60">{label}</span>
                          <span className="text-xs text-white/35 tabular-nums">{value}/{max}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all duration-500", barColor)} style={{ width: `${pct}%` }} />
                        </div>
                        {note && <p className="text-[11px] text-white/30 leading-relaxed">{note}</p>}
                      </div>
                    );
                  })}
                </div>

                {deductions > 0 && (
                  <p className="text-[11px] text-red-400/70 border-t border-white/8 pt-2">
                    −{deductions} pts: template phrases detected
                  </p>
                )}

                {score.overall && (
                  <p className="text-xs text-white/40 border-t border-white/8 pt-3 leading-relaxed italic">
                    "{score.overall}"
                  </p>
                )}

                {!canSend && (
                  <p className="text-xs text-white/35 border-t border-white/8 pt-2">
                    Score 65+ to unlock sending.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 mt-5">
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Regenerate
            </Button>
            <Button variant="secondary" onClick={handleSaveDraft} disabled={saving || !draftId}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {saveMsg || "Save draft"}
            </Button>
            <Button
              onClick={handleSend}
              disabled={!canSend || sending}
              className={cn(!canSend && "opacity-40 cursor-not-allowed")}
              title={canSend ? "Send email" : `Score must be 65+ to send (currently ${totalScore ?? 0})`}
            >
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {sending ? "Sending…" : "Send email"}
            </Button>
            {!canSend && totalScore != null && (
              <span className="text-xs text-white/30">Need 65 to send — currently {totalScore}</span>
            )}
          </div>
          {sendError && (
            <p className="text-xs text-red-400">
              {sendError}{" "}
              {sendError.includes("Profile") && (
                <a href="/dashboard/profile" className="underline hover:text-red-300 transition-colors">Go to Profile →</a>
              )}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── INPUT PHASE ───────────────────────────────────────────────
  return (
    <div className="px-8 py-8 max-w-3xl mx-auto">
      {/* Writing style warning */}
      {hasSamples === false && !warningDismissed && (
        <NoSamplesWarning onDismiss={() => setWarningDismissed(true)} />
      )}

      <div className="mb-7">
        <h1 className="text-xl font-semibold text-white">New email</h1>
        {professor ? (
          <div className="mt-3 rounded-xl border border-white/8 bg-white/3 p-4">
            <p className="text-sm font-semibold text-white">{professor.name}</p>
            <p className="text-xs text-white/40">{professor.title} · {professor.school}</p>
            {researchSummary && (
              <p className="text-xs text-white/30 leading-relaxed pt-1">{researchSummary}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-red-400 mt-1">No professor selected.</p>
        )}
      </div>

      <div className="space-y-6">
        {/* Goal */}
        <div>
          <Label className="text-white/70 mb-2 block">Goal</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {GOALS.map((g) => (
              <button
                key={g.value}
                onClick={() => setGoalType(g.value)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  goalType === g.value ? "border-violet-500/50 bg-violet-500/10" : "border-white/8 bg-white/3 hover:border-white/15"
                )}
              >
                <p className="text-xs font-semibold text-white">{g.label}</p>
                <p className="text-xs text-white/35 mt-0.5">{g.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Mood/Tone */}
        <div>
          <Label className="text-white/70 mb-2 block">Tone</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MOODS.map(({ value, label, desc, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setMood(value)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  mood === value ? "border-violet-500/50 bg-violet-500/10" : "border-white/8 bg-white/3 hover:border-white/15"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5 mb-1.5", mood === value ? "text-violet-400" : "text-white/30")} />
                <p className="text-xs font-semibold text-white">{label}</p>
                <p className="text-xs text-white/35 mt-0.5 leading-tight">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Optional focus questions */}
        <div className="rounded-xl border border-white/8 overflow-hidden">
          <button
            onClick={() => { setQuestionsOpen(!questionsOpen); }}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white/70 hover:bg-white/3 transition-colors"
          >
            <span>Make my email more focused <span className="text-white/30 font-normal">— recommended</span></span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", questionsOpen && "rotate-180")} />
          </button>

          {questionsOpen && (
            <div className="px-4 pb-4 space-y-4 border-t border-white/8 pt-4">
              {[
                { label: "What specific research or publication of this professor have you reviewed?", ref: q1Ref, value: q1, setter: setQ1, placeholder: "e.g. I read your 2023 paper on neural plasticity and found the methodology around synaptic tagging particularly interesting." },
                { label: "What finding or idea from their work genuinely interests you and why?", ref: q2Ref, value: q2, setter: setQ2, placeholder: "Describe what specifically caught your attention and why it connects to something you care about." },
                { label: "How does their research connect to your own academic work or goals?", ref: q3Ref, value: q3, setter: setQ3, placeholder: "Explain the link between what they study and what you are trying to do or learn." },
              ].map(({ label, ref, value, setter, placeholder }) => (
                <div key={label} className="space-y-1.5">
                  <Label className="text-white/60 text-xs">{label}</Label>
                  <Textarea ref={ref} rows={3} placeholder={placeholder} value={value}
                    onChange={(e) => handleQChange(setter, e.target.value)} />
                  <div className="flex justify-end"><WordCounter text={value} min={20} /></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Professor context */}
        <div className="rounded-xl border border-white/8 p-4 space-y-3">
          <p className="text-sm font-medium text-white/60">
            Add professor context{" "}
            <span className="text-white/30 font-normal">— optional, improves personalization</span>
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={() => cvFileRef.current?.click()} disabled={cvUploading}>
              {cvUploading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
              {cvText ? "CV uploaded ✓" : "Upload professor CV"}
            </Button>
            <input ref={cvFileRef} type="file" accept=".pdf" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCvUpload(f); }} />
          </div>
          {cvError && <p className="text-xs text-red-400">{cvError}</p>}
          <div className="space-y-1">
            <Label className="text-white/40 text-xs">Or paste a link to one of their papers</Label>
            <Input placeholder="https://arxiv.org/abs/..." value={paperUrl} onChange={(e) => setPaperUrl(e.target.value)} />
          </div>
        </div>

        {generateError && <p className="text-sm text-red-400">{generateError}</p>}

        <Button className="w-full" onClick={handleGenerate} disabled={!professor || generating || !canGenerate}>
          {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</> : "Generate email"}
        </Button>
      </div>
    </div>
  );
}
