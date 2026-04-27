import { GoogleGenAI } from "@google/genai";

import { getRequiredEnv } from "@/lib/env-core";

function getEmbeddingDimensions() {
  const value = process.env.GEMINI_EMBEDDING_DIMENSIONS?.trim();

  if (!value) {
    return 3072;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      "GEMINI_EMBEDDING_DIMENSIONS must be a positive integer when provided.",
    );
  }

  return parsed;
}

function getGeminiClient() {
  return new GoogleGenAI({
    apiKey: getRequiredEnv("GEMINI_API_KEY"),
  });
}

function getChatModel() {
  return getRequiredEnv("GEMINI_CHAT_MODEL");
}

function getEmbeddingModel() {
  return getRequiredEnv("GEMINI_EMBEDDING_MODEL");
}

export async function createEmbedding(text: string): Promise<number[]> {
  const normalizedText = text.trim();
  const embeddingDimensions = getEmbeddingDimensions();

  if (!normalizedText) {
    throw new Error("Embedding text cannot be empty.");
  }

  const ai = getGeminiClient();
  const response = await ai.models.embedContent({
    model: getEmbeddingModel(),
    contents: normalizedText,
    config: {
      outputDimensionality: embeddingDimensions,
    },
  });

  const embedding = response.embeddings?.[0]?.values;

  if (!embedding || embedding.length === 0) {
    throw new Error("Gemini did not return an embedding.");
  }

  if (embedding.length !== embeddingDimensions) {
    throw new Error(
      `Unexpected embedding length: ${embedding.length}. Expected ${embeddingDimensions}.`,
    );
  }

  return embedding;
}

export async function askGemini(
  question: string,
  context: string,
): Promise<string> {
  const normalizedQuestion = question.trim();

  if (!normalizedQuestion) {
    throw new Error("Question cannot be empty.");
  }

  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: getChatModel(),
    contents: `
You are answering questions using retrieval-augmented context.

Rules:
- Answer only from the provided context.
- Do not invent facts.
- If the context is insufficient, say that clearly.
- Keep the answer concise and useful.

Question:
${normalizedQuestion}

Context:
${context.trim() || "No relevant context was retrieved."}
`.trim(),
    config: {
      temperature: 0.2,
    },
  });

  const answer = response.text?.trim();

  if (!answer) {
    throw new Error("Gemini returned an empty answer.");
  }

  return answer;
}
