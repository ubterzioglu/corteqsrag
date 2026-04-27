import "server-only";

import { createEmbedding } from "@/lib/gemini";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type RagMatch = {
  id: string;
  title: string | null;
  content: string;
  source: string | null;
  similarity: number;
};

function toVectorLiteral(values: number[]) {
  return `[${values.join(",")}]`;
}

export async function retrieveContext(
  question: string,
  matchCount = 5,
): Promise<string> {
  const normalizedQuestion = question.trim();

  if (!normalizedQuestion) {
    throw new Error("Question cannot be empty.");
  }

  const embedding = await createEmbedding(normalizedQuestion);
  const supabase = getSupabaseAdminClient();
  const safeMatchCount = Math.min(Math.max(Math.floor(matchCount), 1), 10);

  const { data, error } = await supabase.rpc("match_rag_documents", {
    query_embedding: toVectorLiteral(embedding),
    match_count: safeMatchCount,
  });

  if (error) {
    throw new Error("Supabase retrieval failed.");
  }

  const matches = (data ?? []) as RagMatch[];

  if (matches.length === 0) {
    return "";
  }

  return matches
    .map((match, index) => {
      const title = match.title?.trim() || `Document ${index + 1}`;
      const source = match.source?.trim() || "Unknown source";

      return [
        `Source ${index + 1}: ${title}`,
        `Origin: ${source}`,
        `Similarity: ${match.similarity.toFixed(4)}`,
        match.content.trim(),
      ].join("\n");
    })
    .join("\n\n---\n\n");
}
