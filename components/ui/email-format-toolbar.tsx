"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Bold, Italic, Underline, Strikethrough,
  Link2, Heading2, Quote, Highlighter,
  AlignLeft, AlignCenter, AlignRight,
} from "lucide-react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

function ToolbarBtn({
  label, icon: Icon, isActive, onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  onClick: () => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <button
        onMouseDown={(e) => { e.preventDefault(); onClick(); }}
        aria-label={label}
        className={cn(
          "h-7 w-7 flex items-center justify-center rounded-md transition-colors text-white/50 hover:text-white hover:bg-white/10",
          isActive && "bg-orange-500/20 text-orange-300"
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-9 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-white/10 text-white text-[10px] font-medium rounded px-1.5 py-0.5 whitespace-nowrap z-50 pointer-events-none"
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const DIVIDER = <div className="w-px h-5 bg-white/10 mx-0.5 shrink-0" />;

type Align = "left" | "center" | "right";

interface EmailFormatToolbarProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
}

export function EmailFormatToolbar({ editorRef }: EmailFormatToolbarProps) {
  const [align, setAlign] = useState<Align>("left");
  const [active, setActive] = useState<Set<string>>(new Set());

  const exec = useCallback((cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
  }, [editorRef]);

  const toggle = useCallback((key: string, cmd: string, value?: string) => {
    exec(cmd, value);
    setActive((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, [exec]);

  const setAlignment = useCallback((dir: Align) => {
    const cmdMap: Record<Align, string> = { left: "justifyLeft", center: "justifyCenter", right: "justifyRight" };
    exec(cmdMap[dir]);
    setAlign(dir);
  }, [exec]);

  return (
    <div className="flex items-center gap-0.5 px-1 py-1 rounded-lg bg-white/[0.03] border border-white/[0.07] flex-wrap">
      <ToolbarBtn label="Bold"          icon={Bold}          isActive={active.has("bold")}          onClick={() => toggle("bold", "bold")} />
      <ToolbarBtn label="Italic"        icon={Italic}        isActive={active.has("italic")}        onClick={() => toggle("italic", "italic")} />
      <ToolbarBtn label="Underline"     icon={Underline}     isActive={active.has("underline")}     onClick={() => toggle("underline", "underline")} />
      <ToolbarBtn label="Strikethrough" icon={Strikethrough} isActive={active.has("strike")}        onClick={() => toggle("strike", "strikeThrough")} />
      {DIVIDER}
      <ToolbarBtn label="Heading"       icon={Heading2}      isActive={active.has("heading")}       onClick={() => toggle("heading", "formatBlock", active.has("heading") ? "div" : "h2")} />
      <ToolbarBtn label="Quote"         icon={Quote}         isActive={active.has("quote")}         onClick={() => toggle("quote", "formatBlock", active.has("quote") ? "div" : "blockquote")} />
      <ToolbarBtn label="Link"          icon={Link2}         isActive={active.has("link")}          onClick={() => {
        const url = window.prompt("Enter URL:");
        if (url) { exec("createLink", url); setActive((p) => new Set([...p, "link"])); }
      }} />
      <ToolbarBtn label="Highlight"     icon={Highlighter}   isActive={active.has("highlight")}    onClick={() => {
        exec("backColor", active.has("highlight") ? "transparent" : "#854d0e");
        setActive((p) => { const n = new Set(p); n.has("highlight") ? n.delete("highlight") : n.add("highlight"); return n; });
      }} />
      {DIVIDER}
      <ToolbarBtn label="Align Left"    icon={AlignLeft}     isActive={align === "left"}            onClick={() => setAlignment("left")} />
      <ToolbarBtn label="Align Center"  icon={AlignCenter}   isActive={align === "center"}          onClick={() => setAlignment("center")} />
      <ToolbarBtn label="Align Right"   icon={AlignRight}    isActive={align === "right"}           onClick={() => setAlignment("right")} />
    </div>
  );
}
