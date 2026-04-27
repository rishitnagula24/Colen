import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Mail, MailOpen, Reply } from "lucide-react";
import type { EmailThread } from "@/types/database";

const STATUS_CONFIG = {
  draft: { label: "Draft", icon: Mail, color: "text-white/30 border-white/10 bg-white/5" },
  sent: { label: "Sent", icon: MailOpen, color: "text-blue-400 border-blue-500/20 bg-blue-500/10" },
  replied: { label: "Replied", icon: Reply, color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function InboxPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: threads } = await supabase
    .from("email_threads")
    .select("*, professors(name, school, department)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">
      <div className="mb-7">
        <h1 className="text-xl font-semibold text-white">Inbox</h1>
        <p className="mt-1 text-sm text-white/40">Your sent emails and replies.</p>
      </div>

      {!threads || threads.length === 0 ? (
        <div className="rounded-xl border border-white/8 bg-white/3 py-20 text-center">
          <Mail className="mx-auto h-8 w-8 text-white/15 mb-3" />
          <p className="text-white/30 text-sm">No emails yet.</p>
          <p className="text-white/20 text-xs mt-1">
            Head to{" "}
            <Link href="/dashboard/compose" className="text-violet-400 hover:text-violet-300">
              Compose
            </Link>{" "}
            to send your first email.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden divide-y divide-white/6">
          {threads.map((thread: EmailThread & { professors?: { name: string; school: string; department: string } | null }) => {
            const cfg = STATUS_CONFIG[thread.status] ?? STATUS_CONFIG.sent;
            const StatusIcon = cfg.icon;
            return (
              <Link
                key={thread.id}
                href={`/dashboard/inbox/${thread.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors"
              >
                <StatusIcon className="h-4 w-4 text-white/25 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/80 truncate">
                    {thread.professors?.name ?? "Unknown professor"}
                  </p>
                  <p className="text-xs text-white/40 truncate mt-0.5">{thread.subject}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${cfg.color}`}
                  >
                    {cfg.label}
                  </span>
                  <span className="text-xs text-white/25">{formatDate(thread.updated_at)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
