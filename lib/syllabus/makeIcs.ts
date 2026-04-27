import { createEvents } from "ics";
import type { Deadline } from "./parseDeadlines";

export function makeIcs(deadlines: Deadline[]): string {
  const events = deadlines.map((d) => {
    const [year, month, day] = d.dateISO.split("-").map(Number);

    return {
      title: d.title || "Deadline",
      start: [year, month, day] as [number, number, number],
      duration: { hours: 1 },
      description: d.source,
    };
  });

  const { error, value } = createEvents(events);

  if (error || !value) {
    throw new Error("Failed to generate .ics calendar");
  }

  return value;
}