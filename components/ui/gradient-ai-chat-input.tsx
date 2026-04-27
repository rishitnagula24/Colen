"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Typewriter } from "@/components/ui/typewriter";

const PLACEHOLDER_TEXTS = [
  "Who do you want to email?",
  "Create me a cold email to a professor",
  "Find professors in machine learning",
  "Write a research inquiry for a lab position",
  "I need a mentorship email to Prof. Johnson",
  "Email a CS professor about their NLP research",
];

// Conic gradient string for the border
const BORDER_GRADIENT =
  "conic-gradient(from 0deg at 50% 50%, #B8905A 0deg, #B86B42 90deg, #A8502D 180deg, #B89E6E 270deg, #B8905A 360deg)";

interface GradientAIChatInputProps {
  onSend?: (message: string) => void;
  className?: string;
  disabled?: boolean;
}

export function GradientAIChatInput({ onSend, className, disabled = false }: GradientAIChatInputProps) {
  const [message, setMessage] = useState("");
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function submit() {
    if (!message.trim() || disabled) return;
    onSend?.(message.trim());
    setMessage("");
    if (textareaRef.current) textareaRef.current.style.height = "40px";
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  }

  const showTypewriter = !message && !focused;

  return (
    <motion.div
      className={cn("relative w-full", className)}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Gradient border — uses background-clip trick so corners are always correct */}
      <div
        className="relative rounded-[20px] p-[2px]"
        style={{ background: BORDER_GRADIENT }}
      >
        {/* Inner card */}
        <div className="relative rounded-[18px] bg-[#0a0a0a] overflow-hidden">

          {/* Subtle inner glow along top edge */}
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#B8905A]/30 to-transparent pointer-events-none" />

          <div className="p-4">
            <div className="relative flex items-start gap-3">

              {/* Typewriter placeholder overlay */}
              {showTypewriter && (
                <div className="absolute left-0 top-2 pointer-events-none select-none">
                  <Typewriter
                    text={PLACEHOLDER_TEXTS}
                    speed={45}
                    deleteSpeed={22}
                    waitTime={2000}
                    cursorChar="..."
                    className="text-sm text-white/25"
                    cursorClassName="ml-0.5 text-white/20"
                    cursorAnimationVariants={{
                      initial: { opacity: 0 },
                      animate: {
                        opacity: [0, 1, 0],
                        transition: {
                          duration: 1.6,
                          repeat: Infinity,
                          ease: "easeInOut",
                        },
                      },
                    }}
                  />
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={message}
                onChange={e => {
                  setMessage(e.target.value);
                  const t = e.target;
                  t.style.height = "40px";
                  t.style.height = Math.min(t.scrollHeight, 120) + "px";
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                disabled={disabled}
                rows={1}
                className={cn(
                  "flex-1 resize-none border-0 bg-transparent text-white/85",
                  "text-sm leading-6 py-2 px-0 focus:outline-none focus:ring-0",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
                style={{ minHeight: "40px", maxHeight: "120px" }}
              />

              <motion.button
                type="button"
                onClick={submit}
                disabled={disabled || !message.trim()}
                className={cn(
                  "flex items-center justify-center w-8 h-8 mt-1 rounded-lg transition-colors shrink-0",
                  message.trim() && !disabled
                    ? "text-orange-400 hover:text-orange-300"
                    : "text-white/20 cursor-not-allowed"
                )}
                whileHover={message.trim() ? { scale: 1.1 } : {}}
                whileTap={message.trim() ? { scale: 0.9 } : {}}
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </div>

            <p className="text-[10px] text-white/20 mt-2">
              Press Enter to continue · Shift+Enter for new line
            </p>
          </div>

          {/* Subtle inner glow along bottom edge */}
          <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#A8502D]/20 to-transparent pointer-events-none" />
        </div>
      </div>

      {/* Outer glow shadow */}
      <div
        className="absolute -bottom-4 left-8 right-8 h-6 rounded-full blur-lg pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(184,107,66,0.15) 0%, transparent 70%)" }}
      />
    </motion.div>
  );
}
