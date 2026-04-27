import { readFile } from "node:fs/promises";
import path from "node:path";

import { loadEnvConfig } from "@next/env";

import { createEmbedding } from "@/lib/gemini-core";
import { getSupabaseAdminClient } from "@/lib/supabase-admin-core";

const SOURCE_NAME = "corteqs.md";

loadEnvConfig(process.cwd());

type SeedChunk = {
  title: string;
  content: string;
};

function parseMarkdownSections(markdown: string): SeedChunk[] {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    return [];
  }

  const sections = normalized.split(/\n(?=#\s+)/g);

  return sections
    .map((section) => {
      const [firstLine, ...bodyLines] = section.trim().split("\n");
      const title = firstLine.replace(/^#\s+/, "").trim();
      const content = bodyLines.join("\n").trim();

      return {
        title,
        content,
      };
    })
    .filter((chunk) => chunk.title && chunk.content);
}

async function deleteExistingSeedRows() {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("rag_documents")
    .delete()
    .eq("source", SOURCE_NAME)
    .contains("metadata", { type: "seed" });

  if (error) {
    throw new Error("Failed to clear existing seed data.");
  }
}

async function insertChunk(chunk: SeedChunk) {
  const supabase = getSupabaseAdminClient();
  const embedding = await createEmbedding(chunk.content);

  const { error } = await supabase.from("rag_documents").insert({
    title: chunk.title,
    content: chunk.content,
    source: SOURCE_NAME,
    metadata: { type: "seed" },
    embedding: `[${embedding.join(",")}]`,
  });

  if (error) {
    throw new Error(`Failed to insert chunk "${chunk.title}": ${error.message}`);
  }
}

async function main() {
  const filePath = path.join(process.cwd(), "data", SOURCE_NAME);
  const markdown = await readFile(filePath, "utf8");
  const chunks = parseMarkdownSections(markdown);

  if (chunks.length === 0) {
    throw new Error("No valid chunks found in data/corteqs.md.");
  }

  console.log(`Found ${chunks.length} chunks in ${SOURCE_NAME}.`);

  await deleteExistingSeedRows();

  let insertedCount = 0;

  for (const chunk of chunks) {
    await insertChunk(chunk);
    insertedCount += 1;
    console.log(`Inserted chunk: ${chunk.title}`);
  }

  console.log(`Inserted ${insertedCount} chunks into rag_documents.`);
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown ingestion error.";
  console.error(`Ingestion failed: ${message}`);
  process.exit(1);
});
