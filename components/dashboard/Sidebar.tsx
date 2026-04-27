"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, PenLine, Inbox, User, LogOut, Sparkles, FileText, FilePen } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

const NAV = [
  { href: "/dashboard/compose", label: "Compose", icon: PenLine },
  { href: "/professors", label: "Find Match", icon: Sparkles, exact: true },
  { href: "/dashboard/professors", label: "Professors", icon: BookOpen },
  { href: "/dashboard/writing-style", label: "Writing Style", icon: FileText },
  { href: "/dashboard/drafts", label: "Drafts", icon: FilePen },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

interface Props {
  userName: string | null;
  userEmail: string;
  platformEmail: string | null;
}

function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side="right"
            sideOffset={10}
            className="z-50 rounded-md border border-white/10 bg-[#1a1a1a] px-3 py-1.5 text-xs text-white shadow-xl animate-in fade-in-0 zoom-in-95"
          >
            {label}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export default function DashboardSidebar({ userName, userEmail }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : (userEmail?.[0] ?? "?").toUpperCase();

  return (
    <aside className="fixed left-0 top-0 h-full w-14 flex flex-col items-center border-r border-white/8 bg-[#0d0d0d] z-40 py-3">
      {/* Logo mark — links back to home */}
      <Link href="/dashboard" className="flex items-center justify-center w-9 h-9 mb-4 opacity-70 hover:opacity-100 transition-opacity">
        <span className="inline-flex items-center font-mono text-base leading-none tracking-tight text-white">
          <span>(</span>
          <span className="flex flex-col items-center gap-[3px] px-[2px]">
            <span className="h-[3px] w-[3px] rounded-full bg-white/90 shrink-0" />
            <span className="h-[3px] w-[3px] rounded-full bg-white/90 shrink-0" />
            <span className="h-[3px] w-[3px] rounded-full bg-white/90 shrink-0" />
          </span>
          <span>)</span>
        </span>
      </Link>

      {/* Nav icons */}
      <nav className="flex-1 flex flex-col items-center gap-1 w-full px-2">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Tip key={href} label={label}>
              <Link
                href={href}
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-xl transition-colors",
                  active
                    ? "bg-violet-500/20 text-violet-300"
                    : "text-white/35 hover:bg-white/6 hover:text-white/70"
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
              </Link>
            </Tip>
          );
        })}
      </nav>

      {/* Avatar + sign out */}
      <div className="flex flex-col items-center gap-2 pb-1">
        <Tip label={userName ?? userEmail}>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-semibold text-white/60 cursor-default">
            {initials}
          </div>
        </Tip>
        <Tip label="Sign out">
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center w-10 h-10 rounded-xl text-white/25 hover:bg-white/6 hover:text-white/60 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </Tip>
      </div>
    </aside>
  );
}
