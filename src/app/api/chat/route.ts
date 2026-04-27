import { NextResponse } from "next/server";

import { askGemini } from "@/lib/gemini";
import { retrieveContext } from "@/lib/rag";

export const runtime = "nodejs";

type ChatRequest = {
  question?: unknown;
};

function toSafeErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Internal server error.";
  }

  if (
    error.message.startsWith("Missing required environment variable:") ||
    error.message === "Question cannot be empty." ||
    error.message === "Embedding text cannot be empty."
  ) {
    return error.message;
  }

  return "Internal server error.";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;
    const question =
      typeof body.question === "string" ? body.question.trim() : "";

    if (!question) {
      return NextResponse.json(
        { error: "The `question` field is required." },
        { status: 400 },
      );
    }

    const context = await retrieveContext(question);
    const answer = await askGemini(question, context);

    return NextResponse.json({
      answer,
      hasContext: Boolean(context),
    });
  } catch (error) {
    return NextResponse.json(
      { error: toSafeErrorMessage(error) },
      { status: 500 },
    );
  }
}
