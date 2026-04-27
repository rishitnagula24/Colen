"use client";

import { useState, useRef } from "react";
import { Upload, Trash2, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WritingSample } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

interface Props {
  initialSamples: WritingSample[];
}

export default function WritingStyleClient({ initialSamples }: Props) {
  const [samples, setSamples] = useState<WritingSample[]>(initialSamples);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const plan = samples[0]?.plan ?? "free";
  const atLimit = plan === "free" && samples.length >= 3;

  async function handleFile(file: File) {
    if (atLimit) return;
    setUploading(true);
    setError("");

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/writing-samples/extract", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setSamples((prev) => [data.sample, ...prev]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("writing_samples").delete().eq("id", id);
    setSamples((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto">
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-xl font-semibold text-white">Your writing style</h1>
          <p className="mt-1 text-sm text-white/40">
            Upload samples of your own writing — essays, emails, class papers, anything. The more you
            add, the more your generated emails will sound like you.
          </p>
        </div>
        <span className="text-xs text-white/30 mt-1 shrink-0 ml-4">
          {samples.length} of 3 samples used
        </span>
      </div>

      <div
        className={cn(
          "rounded-xl border-2 border-dashed transition-colors mb-6",
          atLimit
            ? "border-white/5 opacity-50"
            : "border-white/10 hover:border-white/20 cursor-pointer"
        )}
        onClick={() => { if (!atLimit && !uploading) fileRef.current?.click(); }}
      >
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          {uploading ? (
            <Loader2 className="h-7 w-7 text-violet-400 animate-spin" />
          ) : (
            <Upload className="h-7 w-7 text-white/20" />
          )}
          <p className="text-sm text-white/40">
            {uploading ? "Extracting text…" : "Drop a .txt, .pdf, or .docx file here"}
          </p>
          {atLimit && (
            <div className="text-center space-y-2">
              <p className="text-xs text-amber-400">
                You&apos;ve reached the free plan limit of 3 writing samples.
              </p>
              <Button size="sm" disabled variant="secondary">
                Upgrade
              </Button>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.pdf,.docx"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 mb-5">
          {error}
        </div>
      )}

      {samples.length === 0 ? (
        <p className="text-sm text-white/25 text-center py-8">No samples yet. Upload one above.</p>
      ) : (
        <div className="grid gap-3">
          {samples.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-white/8 bg-white/3 p-4 flex items-start gap-3"
            >
              <FileText className="h-4 w-4 text-white/30 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white/80 truncate">{s.file_name}</p>
                  <span className="text-xs text-white/25 shrink-0">
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-white/30 mt-1 leading-relaxed line-clamp-2 [mask-image:linear-gradient(to_bottom,black_60%,transparent)]">
                  {s.content?.slice(0, 120)}
                </p>
              </div>
              <button
                onClick={() => handleDelete(s.id)}
                className="shrink-0 text-white/20 hover:text-red-400 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
