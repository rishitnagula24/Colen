import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase/service";

interface SSPaper {
  title?: string;
  year?: number;
  abstract?: string;
  externalIds?: { DOI?: string };
}

interface SSAuthor {
  affiliations?: Array<{ name?: string }>;
  papers?: SSPaper[];
}

export interface PaperSummary {
  title: string;
  year: number;
  abstract_preview: string;
  doi?: string;
  plain_summary: string;
}

export interface ScrapedPapersData {
  papers: PaperSummary[];
  summary: string;
  key_themes: string[];
}

export async function scrapeProfessorPapers(
  professorId: string,
  name: string,
  school: string,
): Promise<boolean> {
  try {
    const url = `https://api.semanticscholar.org/graph/v1/author/search?query=${encodeURIComponent(name)}&fields=name,affiliations,papers.title,papers.year,papers.abstract,papers.externalIds&limit=5`;
    const res = await fetch(url, { headers: { "User-Agent": "Colen/1.0" } });
    if (!res.ok) return false;

    const data = await res.json();
    const authors: SSAuthor[] = data.data || [];

    const matched = authors.find((a) =>
      a.affiliations?.some((aff) =>
        aff.name?.toLowerCase().includes(school.toLowerCase())
      )
    );
    if (!matched) return false;

    const topPapers = (matched.papers || [])
      .filter((p) => p.title && p.abstract)
      .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
      .slice(0, 3);

    if (topPapers.length === 0) return false;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const papersText = topPapers
      .map((p, i) =>
        `Paper ${i + 1}: "${p.title}" (${p.year ?? "n/a"})\nAbstract: ${(p.abstract ?? "").slice(0, 600)}`
      )
      .join("\n\n");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: `You are helping a college student understand a professor's research so they can write a genuine cold email.

Professor: ${name} from ${school}

Here are their ${topPapers.length} most recent papers:

${papersText}

Do two things:
1. For each paper, write a 1-2 sentence plain-English summary of what it's actually about — what they studied, what they found, why it matters.
2. Write a 2-3 sentence overall summary of this professor's core research themes that a student could naturally reference.
3. List 3-5 key themes as short phrases.

Return ONLY a JSON object in exactly this format with no extra text:
{
  "paper_summaries": ["1-2 sentence summary of paper 1", "1-2 sentence summary of paper 2", "1-2 sentence summary of paper 3"],
  "summary": "2-3 sentence overall summary",
  "key_themes": ["theme 1", "theme 2", "theme 3"]
}`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "{}";
    let claudeResult: { paper_summaries: string[]; summary: string; key_themes: string[] };
    try {
      claudeResult = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return false;
      claudeResult = JSON.parse(match[0]);
    }

    const papers: PaperSummary[] = topPapers.map((p, i) => ({
      title: p.title ?? "",
      year: p.year ?? 0,
      abstract_preview: (p.abstract ?? "").slice(0, 500),
      doi: p.externalIds?.DOI,
      plain_summary: claudeResult.paper_summaries?.[i] ?? "",
    }));

    const scrapedData: ScrapedPapersData = {
      papers,
      summary: claudeResult.summary ?? "",
      key_themes: claudeResult.key_themes ?? [],
    };

    const supabase = createServiceClient();
    await supabase
      .from("professors")
      .update({ scraped_papers: scrapedData, research_summary: claudeResult.summary })
      .eq("id", professorId);

    return true;
  } catch {
    return false;
  }
}
