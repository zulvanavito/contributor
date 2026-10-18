import { MetadataAnalysisProvider, StockMetadata } from "../types";

export const METADATA_ANALYSIS_PROMPT = `You are an expert microstock contributor and metadata specialist for Adobe Stock, Shutterstock, and Getty Images.
Analyze the provided image and generate optimal, highly commercial stock metadata.

Strict Requirements:
1. Title: A concise, descriptive, and commercially appealing title in English (50-100 characters).
2. Description: A detailed, clear description in English describing the subject, background, lighting, and composition (100-200 characters).
3. Category: The most relevant microstock category (e.g., Business, Technology, Nature, People, Food & Drink, Architecture, Lifestyle, Travel, Abstract).
4. Keywords: 30 to 50 relevant commercial tags in English.
   - Order hierarchically: primary subject, actions/context, environment/location, lighting/mood, commercial concepts (e.g. "copy space", "no people", "horizontal").
   - Strictly NO registered trademarks, brand names, company names, or copyrighted characters.
   - Single words or common 2-word commercial phrases only.
   - All lowercase, no duplicates.

Output MUST be a single valid JSON object with the following schema:
{
  "title": "string",
  "description": "string",
  "category": "string",
  "keywords": ["tag1", "tag2", ...]
}`;

export function parseMetadataResponse(responseText: string): StockMetadata {
  if (!responseText || typeof responseText !== "string") {
    throw new Error("Failed to parse metadata JSON: Empty or invalid response text");
  }

  let cleaned = responseText.trim();

  // Strip markdown code fences if present (e.g. ```json ... ``` or ``` ... ```)
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  } else {
    // If surrounded by preamble or postscript commentary, extract text between first { and last }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Failed to parse metadata JSON: ${(err as Error).message}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Failed to parse metadata JSON: Result is not a JSON object");
  }

  const obj = parsed as Record<string, unknown>;

  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  const description = typeof obj.description === "string" ? obj.description.trim() : "";
  const category = typeof obj.category === "string" ? obj.category.trim() : "Commercial";

  // Process keywords: normalize, split commas, trim, lowercase, deduplicate
  let rawKeywords: string[] = [];
  if (Array.isArray(obj.keywords)) {
    for (const item of obj.keywords) {
      if (typeof item === "string") {
        const parts = item.split(",").map((p) => p.trim());
        rawKeywords.push(...parts);
      }
    }
  } else if (typeof obj.keywords === "string") {
    rawKeywords = obj.keywords.split(",").map((p) => p.trim());
  }

  const normalizedKeywords: string[] = [];
  const seen = new Set<string>();

  for (const kw of rawKeywords) {
    const clean = kw.toLowerCase().trim().replace(/^["']|["']$/g, "");
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      normalizedKeywords.push(clean);
    }
  }

  return {
    title,
    description,
    category,
    keywords: normalizedKeywords,
  };
}

export class GeminiFlashProvider implements MetadataAnalysisProvider {
  public readonly id = "gemini-flash";
  public readonly name = "Gemini Flash Vision (Google AI Studio)";

  private model: string;

  constructor(model: string = "gemini-1.5-flash") {
    this.model = model;
  }

  async analyzeMetadata(imageBase64: string, apiKey: string): Promise<StockMetadata> {
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      throw new Error("Gemini API key is required");
    }

    if (!imageBase64 || typeof imageBase64 !== "string") {
      throw new Error("imageBase64 is required");
    }

    // Extract mime type and base64 content
    let mimeType = "image/jpeg";
    let base64Data = imageBase64;

    const dataUrlMatch = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (dataUrlMatch) {
      mimeType = dataUrlMatch[1];
      base64Data = dataUrlMatch[2];
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${encodeURIComponent(cleanKey)}`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: METADATA_ANALYSIS_PROMPT },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.2,
      },
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData?.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch {
        // use default HTTP error
      }
      throw new Error(`Gemini API error: ${errorMessage}`);
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error("No text response received from Gemini API");
    }

    return parseMetadataResponse(candidateText);
  }
}

export const ENHANCE_PROMPT_SYSTEM_PROMPT = `You are a professional commercial stock photography prompt engineer.
Your task is to transform the user's input prompt into a highly detailed, professional, commercial stock photography prompt in English.

Strict Requirements:
1. Language: If the input prompt is in Indonesian or any other language, translate it accurately to natural English.
2. Subject & Context: Expand with precise visual details of the subject, environment, materials, textures, and context.
3. Lighting: Specify commercial lighting (e.g., "soft studio lighting", "natural golden hour sunlight", "clean high-key commercial lighting").
4. Composition & Camera: Include professional photographic composition tags (e.g., "shallow depth of field", "sharp focus", "clean background", "copy space", "shot on 85mm lens", "8k resolution").
5. Commercial Safety: Strictly DO NOT include any trademarked brand names, company names, logos, or copyrighted characters.
6. Output: Return ONLY the final enhanced English prompt as plain text. Do not include markdown formatting, quotes, bullet points, introductory phrases, or explanations.`;

const INDONESIAN_TRANSLATIONS: Record<string, string> = {
  "kedai kopi": "coffee shop cafe",
  "kopi": "coffee",
  "minimalis": "minimalist",
  "sore hari": "late afternoon golden hour",
  "pagi hari": "early morning sunlight",
  "siang hari": "bright daylight",
  "malam hari": "night ambient lighting",
  "pemandangan": "scenic landscape",
  "pegunungan": "mountain ranges",
  "gunung": "mountain",
  "pantai": "tropical beach",
  "laut": "ocean",
  "hutan": "lush forest",
  "orang": "person",
  "wanita": "woman",
  "pria": "man",
  "anak": "child",
  "keluarga": "family",
  "kantor": "modern corporate office",
  "bisnis": "business corporate",
  "makanan": "gourmet food cuisine",
  "minuman": "refreshing beverage drink",
  "arsitektur": "modern architecture",
  "teknologi": "modern technology",
  "alam": "nature",
  "segar": "fresh",
  "meja makan": "dining table",
  "meja kerja": "work desk",
  "meja kayu": "wooden table",
};

export function enhancePromptFallback(prompt: string): string {
  if (!prompt || typeof prompt !== "string") {
    return "commercial stock photography, professional studio lighting, sharp focus, clean composition, copy space, 8k resolution";
  }

  let text = prompt.trim();
  // Antislop R-02: remove any em dash
  text = text.replace(/—/g, ", ");

  let translated = text;
  // Apply Indonesian word substitutions if present
  for (const [idTerm, enTerm] of Object.entries(INDONESIAN_TRANSLATIONS)) {
    const regex = new RegExp(`\\b${idTerm}\\b`, "gi");
    translated = translated.replace(regex, enTerm);
  }

  // Base photography descriptors
  const commercialTags = [
    "commercial stock photography",
    "professional lighting",
    "sharp focus",
    "clean composition",
    "copy space",
    "8k resolution",
    "photorealistic",
  ];

  let result = translated;
  if (!result.toLowerCase().includes("commercial stock photography")) {
    result = `${result}, ${commercialTags.join(", ")}`;
  }

  // Ensure no em dashes
  return result.replace(/—/g, ", ");
}

export async function enhancePromptWithGemini(
  prompt: string,
  apiKey: string,
  model: string = "gemini-1.5-flash"
): Promise<string> {
  const cleanPrompt = prompt ? prompt.trim() : "";
  if (!cleanPrompt) {
    throw new Error("Prompt is required and must not be empty");
  }

  const cleanKey = apiKey ? apiKey.trim() : "";
  if (!cleanKey) {
    throw new Error("Gemini API key is required");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cleanKey)}`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: `${ENHANCE_PROMPT_SYSTEM_PROMPT}\n\nOriginal prompt to enhance:\n${cleanPrompt}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.4,
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData?.error?.message) {
        errorMessage = errorData.error.message;
      }
    } catch {
      // use default HTTP error
    }
    throw new Error(`Gemini API error: ${errorMessage}`);
  }

  const data = await response.json();
  const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!candidateText || typeof candidateText !== "string") {
    throw new Error("No text response received from Gemini API");
  }

  let cleaned = candidateText.trim();
  // Strip surrounding quotes if returned
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Antislop R-02: replace any em dash character
  cleaned = cleaned.replace(/—/g, ", ");

  return cleaned;
}

