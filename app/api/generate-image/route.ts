import { NextResponse } from "next/server";
import { PollinationsProvider } from "@/lib/providers/image-gen";
import { AspectRatio } from "@/lib/types";

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
    const { prompt, aspectRatio, style } = body || {};

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is required and must not be empty" },
        { status: 400 }
      );
    }

    if (prompt.length > 1000) {
      return NextResponse.json(
        { error: "Prompt maksimal 1000 karakter" },
        { status: 400 }
      );
    }

    const provider = new PollinationsProvider();
    const result = await provider.generateImage(prompt, {
      aspectRatio: aspectRatio as AspectRatio,
      style: typeof style === "string" ? style : undefined,
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
