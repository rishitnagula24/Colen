"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  House, PenLine, Sparkles, BookOpen, FileText, FilePen, Inbox, User,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { LimelightNav, type NavItem } from "@/components/ui/limelight-nav";

const NAV_ITEMS: NavItem[] = [
  { id: "home",          href: "/dashboard",               icon: <House />,    label: "Home",          exact: true },
  { id: "compose",       href: "/dashboard/compose",       icon: <PenLine />,  label: "Compose",       exact: true },
  { id: "match",         href: "/dashboard/match",         icon: <Sparkles />, label: "Find Match",    exact: true },
  { id: "professors",    href: "/dashboard/professors",    icon: <BookOpen />, label: "Professors" },
  { id: "writing-style", href: "/dashboard/writing-style", icon: <FileText />, label: "Writing Style" },
  { id: "drafts",        href: "/dashboard/drafts",        icon: <FilePen />,  label: "Drafts" },
  { id: "inbox",         href: "/dashboard/inbox",         icon: <Inbox />,    label: "Inbox" },
  { id: "profile",       href: "/dashboard/profile",       icon: <User />,     label: "Profile" },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Floating nav pill that still feels like part of the dashboard */}
      <header className="sticky top-3 z-50 px-4">
        <div className="mx-auto w-full max-w-6xl flex justify-center">
          <LimelightNav
            items={NAV_ITEMS}
            className="!h-15 !rounded-2xl !border-white/12 !bg-[#0d0d0d]/78 !backdrop-blur-xl px-2 shadow-[0_10px_35px_rgba(0,0,0,0.45)]"
          />
        </div>
      </header>

      <main className="relative overflow-x-hidden pt-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
