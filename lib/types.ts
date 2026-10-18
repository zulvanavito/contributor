export type AspectRatio =
  | "1:1"
  | "16:9"
  | "9:16"
  | "3:2"
  | "2:3"
  | "4:3"
  | "3:4";

export interface StockMetadata {
  title: string;
  description: string;
  category: string;
  keywords: string[];
}

export interface ImageGenOptions {
  aspectRatio?: AspectRatio;
  style?: string;
  seed?: number;
  width?: number;
  height?: number;
  model?: string;
}

export interface ImageGenResult {
  imageUrl: string;
  width: number;
  height: number;
}

export interface ImageGenProvider {
  id: string;
  name: string;
  generateImage(prompt: string, options?: ImageGenOptions): Promise<ImageGenResult>;
}

export interface MetadataAnalysisProvider {
  id: string;
  name: string;
  analyzeMetadata(imageBase64: string, apiKey: string): Promise<StockMetadata>;
}
