"use client";

import {
  useState,
  useRef,
  useEffect,
  type FC,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { motion, AnimatePresence } from "motion/react";

import { BiSolidPencil } from "react-icons/bi";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditableChipProps {
  defaultLabel?: string;
  showThemeToggle?: boolean;
  onChange?: (value: string) => void;
  /** Merged onto the pill container for layout/theming */
  className?: string;
}

export const EditableChip: FC<EditableChipProps> = ({
  defaultLabel = "Watchlist",
  onChange,
  className,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState<string>(defaultLabel);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isEditing]);

  const handleSave = (e: MouseEvent | KeyboardEvent) => {
    e.stopPropagation();
    const finalValue = label.trim() === "" ? "Untitled" : label;
    setLabel(finalValue);
    setIsEditing(false);
    onChange?.(finalValue);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  return (
    <motion.div layout className={className}>
      <div
        className={cn(
          "relative flex cursor-pointer select-none items-center justify-center gap-2 overflow-hidden rounded-full border border-zinc-200 py-1 pr-1 transition-all duration-300 ease-in-out dark:border-zinc-700 dark:bg-zinc-900",
          isEditing && "gap-8 ring-2 ring-black dark:ring-white",
        )}
      >
        <motion.input
          layout="position"
          key="input"
          ref={inputRef}
          type="text"
          value={label}
          readOnly={!isEditing}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setLabel(e.target.value)
          }
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) =>
            e.key === "Enter" && handleSave(e)
          }
          onClick={(e: MouseEvent) => e.stopPropagation()}
          className="ml-4 w-32 border-none bg-transparent text-lg font-medium capitalize text-[#262626] outline-none selection:bg-[#B6B6B6] dark:text-zinc-100 dark:selection:bg-zinc-700"
        />

        <AnimatePresence mode="popLayout">
          {isEditing ? (
            <motion.button
              key="done"
              type="button"
              initial={{ opacity: 0, filter: "blur(4px)", scale: 0 }}
              animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
              exit={{ opacity: 0, filter: "blur(4px)", scale: 0 }}
              layout="position"
              onClick={handleSave}
              transition={{
                type: "spring",
                bounce: 0,
                duration: 0.4,
              }}
              className="rounded-full bg-black p-1 text-white transition-colors dark:bg-zinc-100 dark:text-zinc-950"
            >
              <Check size={26} />
            </motion.button>
          ) : (
            <motion.button
              key="edit"
              type="button"
              initial={{ opacity: 0, filter: "blur(4px)", scale: 0 }}
              animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
              exit={{ opacity: 0, filter: "blur(4px)", scale: 0 }}
              layout="position"
              onClick={handleEdit}
              transition={{
                type: "spring",
                bounce: 0,
                duration: 0.4,
              }}
              className="rounded-full bg-[#F0EFF6] p-1 text-[#696871] transition-colors hover:dark:bg-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
            >
              <BiSolidPencil size={26} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
