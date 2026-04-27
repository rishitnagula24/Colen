"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Search } from "lucide-react";

const SCHOOLS = ["All schools", "MIT", "Stanford", "UC Berkeley"];
const DEPARTMENTS = [
  "All departments",
  "Computer Science",
  "Electrical Engineering",
  "Biology",
  "Physics",
  "Earth Sciences",
  "Bioengineering",
  "Economics",
  "Psychology",
  "Chemistry",
  "EECS",
  "Statistics",
  "Neuroscience",
  "Materials Science",
  "Public Health",
];

export default function ProfessorFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || value.startsWith("All")) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
        <Input
          placeholder="Search by name or research…"
          className="pl-9"
          defaultValue={searchParams.get("q") ?? ""}
          onChange={(e) => setParam("q", e.target.value)}
        />
      </div>
      <Select
        className="w-44"
        defaultValue={searchParams.get("school") ?? ""}
        onChange={(e) => setParam("school", e.target.value)}
      >
        {SCHOOLS.map((s) => (
          <option key={s} value={s.startsWith("All") ? "" : s}>
            {s}
          </option>
        ))}
      </Select>
      <Select
        className="w-52"
        defaultValue={searchParams.get("dept") ?? ""}
        onChange={(e) => setParam("dept", e.target.value)}
      >
        {DEPARTMENTS.map((d) => (
          <option key={d} value={d.startsWith("All") ? "" : d}>
            {d}
          </option>
        ))}
      </Select>
    </div>
  );
}
