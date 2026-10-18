import { NextResponse } from "next/server";
import {
  enhancePromptWithGemini,
  enhancePromptFallback,
} from "@/lib/providers/metadata-analysis";

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Prompt tidak boleh kosong" },
        { status: 400 }
      );
    }

    const { prompt, apiKey } = body || {};

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt tidak boleh kosong" },
        { status: 400 }
      );
    }

    const trimmedPrompt = prompt.trim();
    const resolvedApiKey =
      (typeof apiKey === "string" && apiKey.trim()) ||
      process.env.GEMINI_API_KEY?.trim();

    if (resolvedApiKey) {
      try {
        const enhancedPrompt = await enhancePromptWithGemini(
          trimmedPrompt,
          resolvedApiKey
        );
        return NextResponse.json({
          enhancedPrompt,
          originalPrompt: trimmedPrompt,
        });
      } catch (geminiError) {
        console.warn(
          "Gemini enhance prompt failed, falling back to rule-based enhancement:",
          geminiError
        );
        const fallbackPrompt = enhancePromptFallback(trimmedPrompt);
        return NextResponse.json({
          enhancedPrompt: fallbackPrompt,
          originalPrompt: trimmedPrompt,
        });
      }
    }

    // Fallback enhancement when no API key is provided
    const fallbackPrompt = enhancePromptFallback(trimmedPrompt);
    return NextResponse.json({
      enhancedPrompt: fallbackPrompt,
      originalPrompt: trimmedPrompt,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat menyempurnakan prompt";
    return NextResponse.json(
      { error: message.replace(/—/g, "-") },
      { status: 500 }
    );
  }
}
