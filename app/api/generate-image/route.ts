import { NextResponse } from "next/server";
import { PollinationsProvider } from "@/lib/providers/image-gen";
import { AspectRatio } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, aspectRatio, style } = body || {};

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is required and must not be empty" },
        { status: 400 }
      );
    }

    const provider = new PollinationsProvider();
    const result = await provider.generateImage(prompt, {
      aspectRatio: aspectRatio as AspectRatio,
      style,
    });

    return NextResponse.json({
      imageUrl: result.imageUrl,
      width: result.width,
      height: result.height,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
