import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import type { EmailMessage } from "@/types/database";

interface ThreadRow {
  id: string;
  subject: string;
  status: string;
  professors: { name: string; title: string; school: string; department: string } | null;
}

interface PageProps {
  params: Promise<{ threadId: string }>;
}

export default async function ThreadPage({ params }: PageProps) {
  const { threadId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: rawThread } = await supabase
    .from("email_threads")
    .select("*, professors(name, title, school, department)")
    .eq("id", threadId)
    .eq("user_id", user.id)
    .single();

  if (!rawThread) notFound();

  const thread = rawThread as unknown as ThreadRow;

  const { data: rawMessages } = await supabase
    .from("email_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  const messages = (rawMessages ?? []) as EmailMessage[];
  const prof = thread.professors;

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto">
      <Link
        href="/dashboard/inbox"
        className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to inbox
      </Link>

      <div className="mb-6 rounded-xl border border-white/8 bg-white/3 p-5">
        <h1 className="font-semibold text-white text-base leading-tight">{thread.subject}</h1>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/40">
          <span>To: {prof?.name}</span>
          {prof?.department && <span>{prof.department}</span>}
          {prof?.school && <span>{prof.school}</span>}
        </div>
      </div>

      <div className="space-y-4">
        {messages.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-8">No messages in this thread yet.</p>
        ) : (
          messages.map((msg: EmailMessage) => (
            <div
              key={msg.id}
              className={`rounded-xl border p-5 ${
                msg.direction === "outbound"
                  ? "border-violet-500/20 bg-violet-500/5 ml-0 mr-6"
                  : "border-white/10 bg-white/3 ml-6 mr-0"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-white/50">
                  {msg.direction === "outbound" ? "You" : prof?.name ?? "Professor"}
                </span>
                {msg.sent_at && (
                  <span className="text-xs text-white/25">
                    {new Date(msg.sent_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
              <p className="text-sm text-white/75 whitespace-pre-wrap leading-relaxed">{msg.body}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
