import * as chrono from "chrono-node";

export type Deadline = {
  title: string;
  dateISO: string; // YYYY-MM-DD
  source: string;  // snippet around the match
};

type ChronoResult = {
  text: string;
  index: number;
  start?: {
    date: () => Date;
  };
};

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function cleanSpaces(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function makeSnippet(text: string, index: number, length: number): string {
  const start = Math.max(0, index - length);
  const end = Math.min(text.length, index + length);
  return cleanSpaces(text.slice(start, end));
}

/**
 * MVP deadline parser:
 * - finds dates in the syllabus text using chrono
 * - pulls a nearby snippet for context
 * - uses a simple heuristic for a "title" from the snippet
 */
export function parseDeadlines(text: string): Deadline[] {
  const results = chrono.parse(text) as unknown as ChronoResult[];

  const deadlines: Deadline[] = results
    .map((r) => {
      const dateObj = r.start?.date();
      if (!dateObj) return null;

      const snippet = makeSnippet(text, r.index, 80);

      // Heuristic: title is the text right before the date mention, if possible.
      // Example snippet: "Exam 1 will be held on Feb 10 in class"
      // chrono match text might be "Feb 10" — we want something more meaningful.
      const matchText = r.text;
      const before = snippet.split(matchText)[0] ?? "";
      const titleCandidate = cleanSpaces(before).slice(-40); // last ~40 chars before the date
      const title =
        titleCandidate.length >= 6 ? titleCandidate : `Deadline (${matchText})`;

      return {
        title,
        dateISO: toISODate(dateObj),
        source: snippet,
      };
    })
    .filter((x): x is Deadline => x !== null);

  // De-duplicate
  const seen = new Set<string>();
  const unique = deadlines.filter((d) => {
    const key = `${d.dateISO}::${d.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by date ascending
  unique.sort((a, b) => (a.dateISO < b.dateISO ? -1 : a.dateISO > b.dateISO ? 1 : 0));

  return unique;
}
