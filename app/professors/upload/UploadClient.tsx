"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { Upload, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RawRow {
  name?: string;
  title?: string;
  department?: string;
  school?: string;
  email?: string;
  mail?: string;
  research_interests?: string;
  [key: string]: string | undefined;
}

interface ValidRow {
  name: string;
  title: string;
  department: string;
  school: string;
  email: string;
  research_interests: string;
}

interface InvalidRow {
  row: RawRow;
  reason: string;
  index: number;
}

type RowStatus = "pending" | "importing" | "finding-papers" | "done" | "no-papers" | "error";

interface ImportRow {
  professor: ValidRow;
  status: RowStatus;
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRows(rows: RawRow[]): { valid: ValidRow[]; invalid: InvalidRow[] } {
  const valid: ValidRow[] = [];
  const invalid: InvalidRow[] = [];

  rows.forEach((row, i) => {
    const email = row.email ?? row.mail ?? "";
    if (!row.name?.trim()) {
      invalid.push({ row, reason: "Missing name", index: i + 1 });
    } else if (!row.school?.trim()) {
      invalid.push({ row, reason: "Missing school", index: i + 1 });
    } else if (!email.trim()) {
      invalid.push({ row, reason: "Missing email", index: i + 1 });
    } else if (!EMAIL_RE.test(email.trim())) {
      invalid.push({ row, reason: "Invalid email format", index: i + 1 });
    } else {
      valid.push({
        name: row.name.trim(),
        title: row.title?.trim() ?? "",
        department: row.department?.trim() ?? "",
        school: row.school.trim(),
        email: email.trim(),
        research_interests: row.research_interests?.trim() ?? "",
      });
    }
  });

  return { valid, invalid };
}

const STATUS_LABEL: Record<RowStatus, string> = {
  pending: "Pending",
  importing: "Importing…",
  "finding-papers": "Finding papers…",
  done: "Done",
  "no-papers": "No papers found",
  error: "Error",
};

const STATUS_COLOR: Record<RowStatus, string> = {
  pending: "text-white/30",
  importing: "text-amber-400",
  "finding-papers": "text-blue-400",
  done: "text-green-400",
  "no-papers": "text-white/40",
  error: "text-red-400",
};

export default function UploadClient() {
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [valid, setValid] = useState<ValidRow[]>([]);
  const [invalid, setInvalid] = useState<InvalidRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportRow[]>([]);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    setParseError("");
    setValid([]);
    setInvalid([]);
    setDone(false);
    setProgress([]);

    if (ext === "csv") {
      Papa.parse<RawRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const { valid: v, invalid: inv } = validateRows(results.data);
          setValid(v);
          setInvalid(inv);
        },
      });
    } else if (ext === "pdf" || ext === "docx" || ext === "doc") {
      setParsing(true);
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await fetch("/api/professors/parse-doc", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Parsing failed");
        const { valid: v, invalid: inv } = validateRows(data.professors ?? []);
        setValid(v);
        setInvalid(inv);
        if (v.length === 0 && inv.length === 0) {
          setParseError("No professors found in this document.");
        }
      } catch (e: unknown) {
        setParseError(e instanceof Error ? e.message : "Failed to parse document");
      } finally {
        setParsing(false);
      }
    } else {
      setParseError("Unsupported file type. Use CSV, PDF, or DOCX.");
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleImport() {
    if (importing || valid.length === 0) return;
    setImporting(true);
    setDone(false);

    const rows: ImportRow[] = valid.map((p) => ({ professor: p, status: "pending" }));
    setProgress([...rows]);

    for (let i = 0; i < rows.length; i++) {
      rows[i] = { ...rows[i], status: "importing" };
      setProgress([...rows]);

      let professorId: string | null = null;
      try {
        const res = await fetch("/api/professors/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rows[i].professor),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Import failed");
        professorId = data.id;
      } catch (e: unknown) {
        rows[i] = { ...rows[i], status: "error", error: e instanceof Error ? e.message : "Error" };
        setProgress([...rows]);
        continue;
      }

      rows[i] = { ...rows[i], status: "finding-papers" };
      setProgress([...rows]);

      try {
        const res = await fetch("/api/professors/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            professorId,
            name: rows[i].professor.name,
            school: rows[i].professor.school,
          }),
        });
        const data = await res.json();
        rows[i] = { ...rows[i], status: data.found ? "done" : "no-papers" };
      } catch {
        rows[i] = { ...rows[i], status: "no-papers" };
      }

      setProgress([...rows]);
    }

    setImporting(false);
    setDone(true);
  }

  const successCount = progress.filter((r) => r.status === "done" || r.status === "no-papers").length;
  const errorCount = progress.filter((r) => r.status === "error").length;

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto">
      <div className="mb-7">
        <h1 className="text-xl font-semibold text-white">Import Professors</h1>
        <p className="mt-1 text-sm text-white/40">
          Upload a CSV, PDF, or Word document — Claude will extract the professor info automatically.
        </p>
      </div>

      <div
        className={cn(
          "rounded-xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center py-14 gap-3",
          dragging ? "border-violet-500/60 bg-violet-500/5" : "border-white/10 hover:border-white/20"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
      >
        {parsing ? (
          <>
            <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
            <p className="text-sm text-white/40">Reading document with AI…</p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-white/20" />
            <p className="text-sm text-white/40">Drop a file here, or click to browse</p>
            <p className="text-xs text-white/25">Supports CSV, PDF, DOC, DOCX</p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>

      {parseError && (
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {parseError}
        </div>
      )}

      {(valid.length > 0 || invalid.length > 0) && progress.length === 0 && (
        <div className="mt-6 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/60">
              <span className="text-green-400 font-medium">{valid.length} valid</span>
              {invalid.length > 0 && (
                <span className="text-red-400 font-medium ml-2">{invalid.length} invalid</span>
              )}
            </p>
            <Button onClick={handleImport} disabled={importing || valid.length === 0}>
              {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm import ({valid.length})
            </Button>
          </div>

          <div className="rounded-xl border border-white/8 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/8 bg-white/3">
                  <th className="text-left px-4 py-2.5 text-white/40 font-medium">Name</th>
                  <th className="text-left px-4 py-2.5 text-white/40 font-medium">School</th>
                  <th className="text-left px-4 py-2.5 text-white/40 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {valid.map((row, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="px-4 py-2.5 text-white/70">{row.name}</td>
                    <td className="px-4 py-2.5 text-white/40">{row.school}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1 text-green-400">
                        <CheckCircle className="h-3 w-3" /> Valid
                      </span>
                    </td>
                  </tr>
                ))}
                {invalid.map((row, i) => (
                  <tr key={`inv-${i}`} className="border-b border-white/5 bg-red-500/5">
                    <td className="px-4 py-2.5 text-white/40">{row.row.name || "—"}</td>
                    <td className="px-4 py-2.5 text-white/30">{row.row.school || "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1 text-red-400">
                        <XCircle className="h-3 w-3" /> {row.reason}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {progress.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-white/8 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/8 bg-white/3">
                  <th className="text-left px-4 py-2.5 text-white/40 font-medium">Professor</th>
                  <th className="text-left px-4 py-2.5 text-white/40 font-medium">School</th>
                  <th className="text-left px-4 py-2.5 text-white/40 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {progress.map((row, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="px-4 py-2.5 text-white/70">{row.professor.name}</td>
                    <td className="px-4 py-2.5 text-white/40">{row.professor.school}</td>
                    <td className={cn("px-4 py-2.5 font-medium", STATUS_COLOR[row.status])}>
                      <span className="flex items-center gap-1.5">
                        {(row.status === "importing" || row.status === "finding-papers") && (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        )}
                        {STATUS_LABEL[row.status]}
                        {row.error && <span className="text-white/30 font-normal">— {row.error}</span>}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {done && (
            <div className="rounded-lg border border-white/8 bg-white/3 px-4 py-3 text-sm text-white/60">
              Import complete — {successCount} imported, {errorCount} failed.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
