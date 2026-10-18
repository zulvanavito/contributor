import { AspectRatio, ImageGenOptions, ImageGenProvider, ImageGenResult } from "../types";

export const ASPECT_RATIO_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  "1:1": { width: 2048, height: 2048 }, // 4.19 MP
  "16:9": { width: 2688, height: 1512 }, // 4.06 MP
  "9:16": { width: 1512, height: 2688 }, // 4.06 MP
  "3:2": { width: 2592, height: 1728 }, // 4.48 MP
  "2:3": { width: 1728, height: 2592 }, // 4.48 MP
  "4:3": { width: 2400, height: 1800 }, // 4.32 MP
  "3:4": { width: 1800, height: 2400 }, // 4.32 MP
};

export function calculateDimensions(aspectRatio?: AspectRatio): { width: number; height: number } {
  if (!aspectRatio || !ASPECT_RATIO_DIMENSIONS[aspectRatio]) {
    return ASPECT_RATIO_DIMENSIONS["1:1"];
  }
  return ASPECT_RATIO_DIMENSIONS[aspectRatio];
}

export class PollinationsProvider implements ImageGenProvider {
  public readonly id = "pollinations";
  public readonly name = "Pollinations Flux (Free)";

  async generateImage(prompt: string, options?: ImageGenOptions): Promise<ImageGenResult> {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      throw new Error("Prompt cannot be empty");
    }

    const finalPrompt = options?.style ? `${trimmedPrompt}, ${options.style.trim()}` : trimmedPrompt;

    const dimensions = options?.width && options?.height
      ? { width: options.width, height: options.height }
      : calculateDimensions(options?.aspectRatio);

    const seed = options?.seed !== undefined ? options.seed : Math.floor(Math.random() * 10000000);
    const model = options?.model || "flux";

    const encodedPrompt = encodeURIComponent(finalPrompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${dimensions.width}&height=${dimensions.height}&seed=${seed}&nologo=true&model=${model}`;

    return {
      imageUrl,
      width: dimensions.width,
      height: dimensions.height,
    };
  }
}
