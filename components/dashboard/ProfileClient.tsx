"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Upload, Loader2, Sparkles, Mail, CheckCircle2, AlertCircle, Check, ArrowRight, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types/database";

const YEAR_OPTIONS = ["Freshman", "Sophomore", "Junior", "Senior", "Master's", "PhD", "Other"];
const BORDER_GRADIENT =
  "conic-gradient(from 0deg at 50% 50%, #B8905A 0deg, #B86B42 90deg, #A8502D 180deg, #B89E6E 270deg, #B8905A 360deg)";

interface Props {
  profile: UserProfile | null;
  userEmail: string;
  writingSamplesCount: number;
  gmailAddress: string | null;
  gmailStatus: string | null;
}

type FocusField = "name" | "school" | "major" | "year" | "bio" | null;

function computeStrength(
  form: { name: string; school: string; major: string; year: string; bio: string },
  samplesCount: number,
) {
  const bioWords = form.bio.trim() ? form.bio.trim().split(/\s+/).length : 0;
  const items = [
    { label: "Name", done: form.name.trim().length > 0, tip: "Add your full name" },
    { label: "School & major", done: form.school.trim().length > 0 && form.major.trim().length > 0, tip: "Fill in school and major" },
    { label: "Year", done: form.year.length > 0, tip: "Select your year" },
    { label: "Research bio", done: bioWords >= 60, tip: `Bio is ${bioWords} words - aim for 60+ words` },
    { label: "Writing sample", done: samplesCount > 0, tip: "Upload a writing sample", link: "/dashboard/writing-style" },
  ];
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);
  const missing = items.filter((i) => !i.done);
  return { pct, missing };
}

const inputCls =
  "w-full bg-white/5 border border-transparent focus:border-white/20 text-white placeholder:text-white/30 h-10 rounded-lg px-3 transition-all duration-300 focus:bg-white/10";

export default function ProfileClient({ profile, userEmail, writingSamplesCount, gmailAddress, gmailStatus }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: profile?.name ?? "",
    school: profile?.school ?? "",
    major: profile?.major ?? "",
    year: profile?.year ?? "",
    bio: profile?.bio ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [cvParsing, setCvParsing] = useState(false);
  const [cvError, setCvError] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [focusedInput, setFocusedInput] = useState<FocusField>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [8, -8]);
  const rotateY = useTransform(mouseX, [-300, 300], [-8, 8]);

  const { pct, missing } = computeStrength(form, writingSamplesCount);
  const initials = form.name.trim()
    ? form.name
        .trim()
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : userEmail[0]?.toUpperCase() ?? "?";

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  async function handleCvUpload(file: File) {
    setCvError("");
    setCvParsing(true);
    setKeywords([]);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/parse-cv", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setCvError(data.error ?? "Could not parse CV");
        return;
      }
      setForm((f) => ({ ...f, bio: data.bio ?? f.bio }));
      setKeywords(data.keywords ?? []);
      setSaved(false);
    } catch {
      setCvError("Upload failed.");
    } finally {
      setCvParsing(false);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from("users")
      .upsert({ id: user.id, email: userEmail, ...form }, { onConflict: "id" });
    setSaving(false);
    if (error) setSaveError(error.message);
    else setSaved(true);
  }

  return (
    <motion.form
      onSubmit={handleSave}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative"
    >
      <motion.div
        className="relative group"
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <motion.div
          className="absolute -inset-[1px] rounded-2xl opacity-60"
          animate={{
            boxShadow: [
              "0 0 10px 2px rgba(184,107,66,0.14)",
              "0 0 16px 4px rgba(168,80,45,0.2)",
              "0 0 10px 2px rgba(184,107,66,0.14)",
            ],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="absolute -inset-[1px] rounded-2xl overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-0 left-0 h-[2px] w-[50%] bg-gradient-to-r from-transparent via-[#B8905A] to-transparent opacity-70"
            animate={{ left: ["-50%", "100%"] }}
            transition={{ duration: 2.8, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.6 }}
          />
          <motion.div
            className="absolute top-0 right-0 h-[50%] w-[2px] bg-gradient-to-b from-transparent via-[#B86B42] to-transparent opacity-70"
            animate={{ top: ["-50%", "100%"] }}
            transition={{ duration: 2.8, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.6, delay: 0.7 }}
          />
          <motion.div
            className="absolute bottom-0 right-0 h-[2px] w-[50%] bg-gradient-to-r from-transparent via-[#A8502D] to-transparent opacity-70"
            animate={{ right: ["-50%", "100%"] }}
            transition={{ duration: 2.8, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.6, delay: 1.4 }}
          />
          <motion.div
            className="absolute bottom-0 left-0 h-[50%] w-[2px] bg-gradient-to-b from-transparent via-[#B89E6E] to-transparent opacity-70"
            animate={{ bottom: ["-50%", "100%"] }}
            transition={{ duration: 2.8, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.6, delay: 2.1 }}
          />
        </div>

        <div className="relative rounded-2xl border border-white/[0.06] bg-black/45 backdrop-blur-xl p-6 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "linear-gradient(135deg, white 0.5px, transparent 0.5px)", backgroundSize: "24px 24px" }} />
          <div className="absolute inset-0 rounded-2xl p-[1px] pointer-events-none" style={{ background: BORDER_GRADIENT, WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" }} />

          <div className="relative space-y-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="h-11 w-11 rounded-full flex items-center justify-center text-sm font-semibold text-white" style={{ background: BORDER_GRADIENT }}>
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white/90 truncate">{form.name || "Your profile"}</p>
                <p className="text-xs text-white/45 truncate">{userEmail}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="h-1.5 w-24 rounded-full bg-white/[0.08] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: BORDER_GRADIENT }} />
                </div>
                <span className="text-[11px] text-white/40">{pct}%</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className={cn("relative", focusedInput === "name" && "z-10")}>
                <input className={inputCls} placeholder="Full name" value={form.name} onChange={(e) => update("name", e.target.value)} onFocus={() => setFocusedInput("name")} onBlur={() => setFocusedInput(null)} />
              </div>
              <div className={cn("relative", focusedInput === "year" && "z-10")}>
                <select className={cn(inputCls, "appearance-none cursor-pointer")} value={form.year} onChange={(e) => update("year", e.target.value)} onFocus={() => setFocusedInput("year")} onBlur={() => setFocusedInput(null)}>
                  <option value="">Year</option>
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className={cn("relative", focusedInput === "school" && "z-10")}>
                <input className={inputCls} placeholder="School" value={form.school} onChange={(e) => update("school", e.target.value)} onFocus={() => setFocusedInput("school")} onBlur={() => setFocusedInput(null)} />
              </div>
              <div className={cn("relative", focusedInput === "major" && "z-10")}>
                <input className={inputCls} placeholder="Major" value={form.major} onChange={(e) => update("major", e.target.value)} onFocus={() => setFocusedInput("major")} onBlur={() => setFocusedInput(null)} />
              </div>
            </div>

            <div className="space-y-3 border-t border-white/[0.07] pt-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-white/65">Research bio</p>
                  <p className="text-[11px] text-white/30 mt-0.5">Used for matching and email generation</p>
                </div>
                <div className="relative shrink-0">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleCvUpload(f);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={cvParsing}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50 hover:text-white/80 transition-all disabled:opacity-40"
                  >
                    {cvParsing ? <><Loader2 className="h-3 w-3 animate-spin" />Reading...</> : <><Upload className="h-3 w-3" />From CV</>}
                  </button>
                </div>
              </div>
              <textarea
                rows={5}
                className={cn(inputCls, "h-auto resize-none leading-relaxed", focusedInput === "bio" && "border-white/20 bg-white/10")}
                placeholder="Describe your research interests, skills, and academic goals."
                value={form.bio}
                onChange={(e) => update("bio", e.target.value)}
                onFocus={() => setFocusedInput("bio")}
                onBlur={() => setFocusedInput(null)}
              />
              {cvError && <p className="text-xs text-red-400/80">{cvError}</p>}
              {keywords.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-[#B8905A]" />
                    <p className="text-[11px] text-white/30">Keywords extracted from your CV</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {keywords.map((kw) => (
                      <span key={kw} className="rounded-full border px-2 py-0.5 text-[11px]" style={{ borderColor: "rgba(184,107,66,0.25)", background: "rgba(168,80,45,0.1)", color: "#B8905A" }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/[0.07] pt-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-white/65">Gmail</p>
                  {gmailAddress ? <p className="text-xs font-mono text-[#B8905A]/80 mt-1">{gmailAddress}</p> : <p className="text-[11px] text-white/30 mt-0.5">Send emails from your inbox</p>}
                </div>
                {gmailAddress ? (
                  <a href="/api/auth/google/connect" className="text-xs text-white/35 hover:text-white/60 underline">Reconnect</a>
                ) : (
                  <a href="/api/auth/google/connect" className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/55 hover:text-white/85 transition-all">
                    <Mail className="h-3.5 w-3.5" /> Connect
                  </a>
                )}
              </div>
              {gmailStatus === "connected" && <p className="flex items-center gap-1.5 text-xs text-green-400/75"><CheckCircle2 className="h-3.5 w-3.5" /> Connected successfully</p>}
              {gmailStatus === "error" && <p className="flex items-center gap-1.5 text-xs text-red-400/70"><AlertCircle className="h-3.5 w-3.5" /> Connection failed - try again</p>}
            </div>

            {missing.length > 0 && (
              <div className="border-t border-white/[0.07] pt-4">
                <p className="text-[11px] text-white/30 mb-2">Finish these for better personalization</p>
                <div className="flex flex-wrap gap-2">
                  {missing.slice(0, 3).map((item) =>
                    item.link ? (
                      <a key={item.label} href={item.link} className="text-[11px] rounded-full border border-[#B86B42]/35 bg-[#A8502D]/15 px-2.5 py-1 text-[#B8905A]">
                        {item.tip}
                      </a>
                    ) : (
                      <span key={item.label} className="text-[11px] rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-white/45">
                        {item.tip}
                      </span>
                    ),
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {saveError && <p className="mb-2 text-xs text-red-400/80">{saveError}</p>}
              <button type="submit" disabled={saving} className="w-full relative group/button">
                <div className="absolute inset-0 rounded-lg blur-md opacity-70" style={{ background: "rgba(184,107,66,0.25)" }} />
                <div className="relative h-10 rounded-lg flex items-center justify-center text-sm font-medium text-white transition-all" style={{ background: saved ? "rgba(255,255,255,0.08)" : BORDER_GRADIENT }}>
                  {saving ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</span>
                  ) : saved ? (
                    <span className="flex items-center gap-2"><Check className="h-3.5 w-3.5" /> Saved</span>
                  ) : (
                    <span className="flex items-center gap-2">Save profile <ArrowRight className="h-3.5 w-3.5" /></span>
                  )}
                </div>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full h-9 rounded-lg border border-white/[0.07] bg-white/[0.03] flex items-center justify-center gap-1.5 text-xs text-white/35 hover:text-red-400/70 hover:border-red-500/20 hover:bg-red-500/[0.05] transition-all"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.form>
  );
}
