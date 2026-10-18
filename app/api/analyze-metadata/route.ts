import { NextResponse } from "next/server";
import { GeminiFlashProvider } from "@/lib/providers/metadata-analysis";

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Format data JSON tidak valid" },
      { status: 400 }
    );
  }

  try {
    const { imageBase64, apiKey } = body || {};

    if (!imageBase64 || typeof imageBase64 !== "string" || !imageBase64.trim()) {
      return NextResponse.json(
        { error: "imageBase64 is required and must not be empty" },
        { status: 400 }
      );
    }

    const resolvedApiKey = (typeof apiKey === "string" && apiKey.trim()) || process.env.GEMINI_API_KEY?.trim();

    if (!resolvedApiKey) {
      return NextResponse.json(
        {
          error: "Gemini API key is required. Please add your API key in Settings to analyze metadata.",
        },
        { status: 400 }
      );
    }

    const provider = new GeminiFlashProvider();
    const metadata = await provider.analyzeMetadata(imageBase64, resolvedApiKey);

    return NextResponse.json({ metadata });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze metadata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
