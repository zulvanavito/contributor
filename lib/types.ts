export type AspectRatio =
  | "1:1"
  | "16:9"
  | "9:16"
  | "3:2"
  | "2:3"
  | "4:3"
  | "3:4";

export type AspectRatioKey = AspectRatio;

export type StylePresetKey =
  | "commercial-photo"
  | "3d-render"
  | "vector-illustration"
  | "minimalist"
  | "watercolor"
  | "none";

export interface StylePreset {
  id: StylePresetKey;
  label: string;
  description: string;
  promptModifier: string;
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "commercial-photo",
    label: "Commercial Photography",
    description: "Studio lighting, clean focus, professional commercial look",
    promptModifier:
      "commercial stock photography, studio lighting, professional color grading, high resolution, clean focus",
  },
  {
    id: "3d-render",
    label: "3D Render",
    description: "Modern 3D octane render with glossy shaders and soft shadows",
    promptModifier:
      "3d render, octane render, modern digital art, clean lighting, sharp details, commercial 3d asset",
  },
  {
    id: "vector-illustration",
    label: "Vector Illustration",
    description: "Flat graphic design, vector art with clean paths and solid fills",
    promptModifier:
      "vector illustration, flat design, clean lines, scalable commercial vector graphics, adobe illustrator style",
  },
  {
    id: "minimalist",
    label: "Minimalist",
    description: "Generous negative space, restrained color palette, subtle elegance",
    promptModifier:
      "minimalist aesthetic, clean composition, simple elegance, ample copy space, soft ambient light",
  },
  {
    id: "watercolor",
    label: "Watercolor",
    description: "Hand-painted artistic style with soft paper texture and pigment washes",
    promptModifier:
      "artistic watercolor painting, delicate pigment washes, handcrafted paper texture, elegant illustration",
  },
  {
    id: "none",
    label: "None / Custom Prompt",
    description: "Use prompt as typed without preset styling additions",
    promptModifier: "",
  },
];

export interface AspectRatioOption {
  id: AspectRatioKey;
  label: string;
  description: string;
}

export const ASPECT_RATIOS: AspectRatioOption[] = [
  { id: "16:9", label: "16:9 Landscape", description: "Standard widescreen landscape" },
  { id: "3:2", label: "3:2 Foto", description: "Classic 35mm DSLR photo format" },
  { id: "1:1", label: "1:1 Persegi", description: "Square format for social & avatars" },
  { id: "9:16", label: "9:16 Potret", description: "Vertical mobile and story format" },
  { id: "4:3", label: "4:3 Standar", description: "Traditional photo ratio" },
  { id: "3:4", label: "3:4 Potret", description: "Vertical commercial portrait" },
  { id: "2:3", label: "2:3 Potret", description: "Vertical 35mm camera portrait" },
];

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
