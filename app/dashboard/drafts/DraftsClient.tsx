"use client";

import { useState } from "react";
import Link from "next/link";
import { PenLine, Clock, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type Draft = {
  id: string;
  generated_subject: string | null;
  generated_body: string | null;
  goal_type: string | null;
  status: string;
  created_at: string;
  professor_id: string;
  professors: { name: string; school: string | null } | null;
};

export default function DraftsClient({ initialDrafts }: { initialDrafts: Draft[] }) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    setDeleting(id);
    const supabase = createClient();
    await supabase.from("email_drafts").delete().eq("id", id);
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    setDeleting(null);
  }

  if (drafts.length === 0) {
    return (
      <div className="rounded-xl border border-white/8 bg-white/3 p-10 text-center">
        <PenLine className="h-8 w-8 text-white/15 mx-auto mb-3" />
        <p className="text-sm text-white/40">No drafts yet.</p>
        <p className="text-xs text-white/25 mt-1">Generate an email to create one.</p>
        <Link
          href="/dashboard/compose"
          className="inline-block mt-4 text-xs text-violet-400 hover:text-violet-300 transition-colors"
        >
          Compose →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {drafts.map((draft) => {
        const preview = draft.generated_body?.slice(0, 120).replace(/\n/g, " ") ?? "";
        const date = new Date(draft.created_at).toLocaleDateString("en-US", {
          month: "short", day: "numeric",
        });

        return (
          <Link
            key={draft.id}
            href={`/dashboard/compose?professorId=${draft.professor_id}&draftId=${draft.id}`}
            className="block rounded-xl border border-white/8 bg-white/3 hover:bg-white/5 p-4 transition-colors group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">
                  {draft.generated_subject ?? "(no subject)"}
                </p>
                <p className="text-xs text-white/40 mt-0.5">
                  {draft.professors?.name ?? "Unknown professor"}
                  {draft.professors?.school ? ` · ${draft.professors.school}` : ""}
                </p>
                {preview && (
                  <p className="text-xs text-white/25 mt-1.5 leading-relaxed line-clamp-2">{preview}…</p>
                )}
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                      draft.status === "sent"
                        ? "border-green-500/30 bg-green-500/10 text-green-400"
                        : "border-white/10 bg-white/5 text-white/35"
                    }`}
                  >
                    {draft.status}
                  </span>
                  <button
                    onClick={(e) => handleDelete(e, draft.id)}
                    disabled={deleting === draft.id}
                    className={cn(
                      "rounded-md p-1 transition-colors",
                      deleting === draft.id
                        ? "text-white/15"
                        : "text-white/15 hover:text-red-400/70 hover:bg-red-500/8 opacity-0 group-hover:opacity-100"
                    )}
                    title="Delete draft"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1 text-white/20">
                  <Clock className="h-3 w-3" />
                  <span className="text-[10px]">{date}</span>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
