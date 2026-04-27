import { readFile } from "node:fs/promises";
import path from "node:path";

import { loadEnvConfig } from "@next/env";

import { createEmbedding } from "@/lib/gemini-core";
import { getSupabaseAdminClient } from "@/lib/supabase-admin-core";

loadEnvConfig(process.cwd());

type SeedChunk = {
  title: string;
  content: string;
  source: string;
  section: string;
};

type SeedSource = {
  filePath: string;
  source: string;
  cleanArtifacts?: boolean;
};

const MAX_CHUNK_LENGTH = 3000;

const SEED_SOURCES: SeedSource[] = [
  {
    filePath: path.join(process.cwd(), "data", "corteqs.md"),
    source: "corteqs.md",
  },
  {
    filePath: path.join(process.cwd(), "rag_database_v1.md"),
    source: "rag_database_v1.md",
    cleanArtifacts: true,
  },
];

function normalizeMarkdown(markdown: string) {
  return markdown.replace(/\r\n/g, "\n").trim();
}

function cleanCitationArtifacts(markdown: string) {
  return markdown
    .replace(/(?:filecite|cite)[^]*/g, "")
    .replace(/[]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitLargeSection(title: string, content: string, source: string) {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (content.length <= MAX_CHUNK_LENGTH || paragraphs.length <= 1) {
    return [
      {
        title,
        content,
        source,
        section: title,
      },
    ];
  }

  const parts: string[] = [];
  let currentPart = "";

  for (const paragraph of paragraphs) {
    const candidate = currentPart
      ? `${currentPart}\n\n${paragraph}`
      : paragraph;

    if (candidate.length > MAX_CHUNK_LENGTH && currentPart) {
      parts.push(currentPart);
      currentPart = paragraph;
    } else {
      currentPart = candidate;
    }
  }

  if (currentPart) {
    parts.push(currentPart);
  }

  return parts.map((part, index) => ({
    title: `${title} (${index + 1}/${parts.length})`,
    content: part,
    source,
    section: title,
  }));
}

function parseMarkdownSections(markdown: string, source: string): SeedChunk[] {
  const normalized = normalizeMarkdown(markdown);

  if (!normalized) {
    return [];
  }

  const sections = normalized.split(/\n(?=#\s+)/g);

  return sections
    .flatMap((section) => {
      const [firstLine, ...bodyLines] = section.trim().split("\n");
      const title = firstLine.replace(/^#\s+/, "").trim();
      const content = bodyLines.join("\n").trim();

      if (!title || !content) {
        return [];
      }

      return splitLargeSection(title, content, source);
    })
    .filter((chunk) => chunk.title && chunk.content);
}

async function deleteExistingSeedRows(source: string) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("rag_documents")
    .delete()
    .eq("source", source)
    .contains("metadata", { type: "seed" });

  if (error) {
    throw new Error(`Failed to clear existing seed data for ${source}.`);
  }
}

async function insertChunk(chunk: SeedChunk) {
  const supabase = getSupabaseAdminClient();
  const embedding = await createEmbedding(chunk.content);

  const { error } = await supabase.from("rag_documents").insert({
    title: chunk.title,
    content: chunk.content,
    source: chunk.source,
    metadata: {
      type: "seed",
      file: chunk.source,
      section: chunk.section,
    },
    embedding: `[${embedding.join(",")}]`,
  });

  if (error) {
    throw new Error(`Failed to insert chunk "${chunk.title}": ${error.message}`);
  }
}

async function processSource(seedSource: SeedSource) {
  const rawMarkdown = await readFile(seedSource.filePath, "utf8");
  const markdown = seedSource.cleanArtifacts
    ? cleanCitationArtifacts(rawMarkdown)
    : rawMarkdown;
  const normalizedMarkdown = normalizeMarkdown(markdown);
  const sectionCount = normalizedMarkdown
    ? normalizedMarkdown.split(/\n(?=#\s+)/g).length
    : 0;
  const chunks = parseMarkdownSections(normalizedMarkdown, seedSource.source);

  if (chunks.length === 0) {
    throw new Error(`No valid chunks found in ${seedSource.source}.`);
  }

  console.log(
    `Found ${sectionCount} sections and produced ${chunks.length} chunks in ${seedSource.source}.`,
  );

  await deleteExistingSeedRows(seedSource.source);

  let insertedCount = 0;

  for (const chunk of chunks) {
    await insertChunk(chunk);
    insertedCount += 1;
    console.log(`Inserted chunk: ${chunk.title} [${seedSource.source}]`);
  }

  console.log(
    `Inserted ${insertedCount} chunks into rag_documents for ${seedSource.source}.`,
  );

  return insertedCount;
}

async function main() {
  let totalInsertedCount = 0;

  for (const seedSource of SEED_SOURCES) {
    totalInsertedCount += await processSource(seedSource);
  }

  console.log(`Inserted ${totalInsertedCount} total chunks into rag_documents.`);
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown ingestion error.";
  console.error(`Ingestion failed: ${message}`);
  process.exit(1);
});
