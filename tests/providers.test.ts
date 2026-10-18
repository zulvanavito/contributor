import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PollinationsProvider, calculateDimensions } from "../lib/providers/image-gen";
import { GeminiFlashProvider, parseMetadataResponse } from "../lib/providers/metadata-analysis";
import { POST as generateImageRoute } from "../app/api/generate-image/route";
import { POST as analyzeMetadataRoute } from "../app/api/analyze-metadata/route";

describe("PollinationsProvider & Image Dimensions", () => {
  const provider = new PollinationsProvider();

  describe("Aspect Ratio Resolution Calculation (>4MP & >= 2048px)", () => {
    const testRatios = [
      { ratio: "1:1", expectedMinDim: 2048, targetRatio: 1.0 },
      { ratio: "16:9", expectedMinDim: 2048, targetRatio: 16 / 9 },
      { ratio: "9:16", expectedMinDim: 2048, targetRatio: 9 / 16 },
      { ratio: "3:2", expectedMinDim: 2048, targetRatio: 3 / 2 },
      { ratio: "2:3", expectedMinDim: 2048, targetRatio: 2 / 3 },
      { ratio: "4:3", expectedMinDim: 2048, targetRatio: 4 / 3 },
      { ratio: "3:4", expectedMinDim: 2048, targetRatio: 3 / 4 },
    ] as const;

    testRatios.forEach(({ ratio, targetRatio }) => {
      it(`should generate dimensions for ${ratio} exceeding 4 Megapixels with max dimension >= 2048px`, () => {
        const { width, height } = calculateDimensions(ratio);
        const totalPixels = width * height;
        const maxDimension = Math.max(width, height);
        const actualRatio = width / height;

        expect(totalPixels).toBeGreaterThanOrEqual(4_000_000);
        expect(maxDimension).toBeGreaterThanOrEqual(2048);
        expect(actualRatio).toBeCloseTo(targetRatio, 1);
      });
    });

    it("should default to 1:1 if no aspect ratio is specified", () => {
      const { width, height } = calculateDimensions(undefined);
      expect(width * height).toBeGreaterThanOrEqual(4_000_000);
      expect(width).toBe(height);
      expect(width).toBeGreaterThanOrEqual(2048);
    });
  });

  describe("URL Generation", () => {
    it("should generate a valid Pollinations image URL with flux model and nologo", async () => {
      const prompt = "modern minimalist office with laptop and coffee";
      const result = await provider.generateImage(prompt, { aspectRatio: "16:9", seed: 42 });

      expect(result.imageUrl).toContain("https://image.pollinations.ai/prompt/");
      expect(result.imageUrl).toContain(encodeURIComponent(prompt));
      expect(result.imageUrl).toContain("nologo=true");
      expect(result.imageUrl).toContain("model=flux");
      expect(result.imageUrl).toContain("seed=42");
      expect(result.width).toBeGreaterThanOrEqual(2048);
      expect(result.width * result.height).toBeGreaterThanOrEqual(4_000_000);
    });

    it("should append style to prompt when style option is provided", async () => {
      const prompt = "vintage classic car on mountain road";
      const result = await provider.generateImage(prompt, {
        aspectRatio: "3:2",
        style: "cinematic lighting, 35mm film stock photography",
      });

      expect(result.imageUrl).toContain(
        encodeURIComponent("vintage classic car on mountain road, cinematic lighting, 35mm film stock photography")
      );
    });

    it("should use random seed when not explicitly provided", async () => {
      const result = await provider.generateImage("sunset beach");
      expect(result.imageUrl).toMatch(/seed=\d+/);
    });
  });
});

describe("Gemini Metadata Parser (parseMetadataResponse)", () => {
  const sampleValidObject = {
    title: "Modern Sustainable Solar Panel Array in Rural Landscape",
    description: "Aerial view of clean photovoltaic renewable solar energy farm under bright blue sky.",
    category: "Technology",
    keywords: [
      "solar panel", "renewable energy", "photovoltaic", "clean energy", "ecology",
      "sustainability", "power plant", "alternative energy", "electricity", "green tech",
      "environment", "aerial view", "sunlight", "blue sky", "modern",
      "outdoor", "landscape", "innovation", "conservation", "resource",
      "industry", "grid", "rural", "eco friendly", "solar farm",
      "future", "silicon", "generation", "bright", "sunny",
      "field", "station", "copyspace", "no people", "commercial"
    ]
  };

  it("should parse a pure valid JSON response", () => {
    const jsonStr = JSON.stringify(sampleValidObject);
    const parsed = parseMetadataResponse(jsonStr);

    expect(parsed.title).toBe(sampleValidObject.title);
    expect(parsed.description).toBe(sampleValidObject.description);
    expect(parsed.category).toBe(sampleValidObject.category);
    expect(parsed.keywords.length).toBe(sampleValidObject.keywords.length);
    expect(parsed.keywords).toContain("solar panel");
  });

  it("should parse JSON wrapped in markdown code fence with json identifier", () => {
    const rawResponse = `\`\`\`json\n${JSON.stringify(sampleValidObject, null, 2)}\n\`\`\``;
    const parsed = parseMetadataResponse(rawResponse);

    expect(parsed.title).toBe(sampleValidObject.title);
    expect(parsed.keywords.length).toBeGreaterThanOrEqual(30);
  });

  it("should parse JSON wrapped in plain markdown code fence without json tag", () => {
    const rawResponse = `\`\`\`\n${JSON.stringify(sampleValidObject)}\n\`\`\``;
    const parsed = parseMetadataResponse(rawResponse);

    expect(parsed.category).toBe("Technology");
  });

  it("should parse JSON with conversational preamble and postscript text", () => {
    const rawResponse = `Here is the commercial microstock metadata for your image:\n\n${JSON.stringify(sampleValidObject)}\n\nI hope this helps your microstock portfolio!`;
    const parsed = parseMetadataResponse(rawResponse);

    expect(parsed.title).toBe(sampleValidObject.title);
    expect(parsed.keywords.length).toBe(35);
  });

  it("should clean, deduplicate, and lowercase keywords", () => {
    const rawObject = {
      ...sampleValidObject,
      keywords: ["Solar Panel", "solar panel", "  RENEWABLE ENERGY  ", "clean energy, ecology", ""]
    };
    const parsed = parseMetadataResponse(JSON.stringify(rawObject));

    expect(parsed.keywords).toContain("solar panel");
    expect(parsed.keywords).toContain("renewable energy");
    expect(parsed.keywords).toContain("clean energy");
    expect(parsed.keywords).toContain("ecology");
    expect(parsed.keywords).not.toContain("");
    // Deduplicated
    const solarPanelCount = parsed.keywords.filter((k) => k === "solar panel").length;
    expect(solarPanelCount).toBe(1);
  });

  it("should throw a clear error when response is completely malformed", () => {
    expect(() => parseMetadataResponse("Not a json at all")).toThrow("Failed to parse metadata JSON");
  });
});

describe("GeminiFlashProvider", () => {
  const provider = new GeminiFlashProvider();
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("should call Gemini Flash REST endpoint and return parsed StockMetadata", async () => {
    const mockApiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  title: "Fresh Organic Vegetables and Fruits Assortment",
                  description: "Colorful assortment of fresh organic fruits and vegetables on rustic wooden table.",
                  category: "Food & Drink",
                  keywords: Array.from({ length: 32 }, (_, i) => `food-tag-${i + 1}`)
                })
              }
            ]
          }
        }
      ]
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const metadata = await provider.analyzeMetadata("data:image/jpeg;base64,ZmFrZWltYWdlZGF0YQ==", "test-api-key");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callUrl = fetchMock.mock.calls[0][0] as string;
    expect(callUrl).toContain("generativelanguage.googleapis.com");
    expect(callUrl).toContain("key=test-api-key");
    expect(metadata.title).toBe("Fresh Organic Vegetables and Fruits Assortment");
    expect(metadata.category).toBe("Food & Drink");
    expect(metadata.keywords.length).toBe(32);
  });

  it("should throw error with details when Gemini API returns an error response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          code: 400,
          message: "API key not valid. Please pass a valid API key.",
          status: "INVALID_ARGUMENT"
        }
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      provider.analyzeMetadata("fakebase64", "invalid-key")
    ).rejects.toThrow(/API key not valid/i);
  });
});

describe("API Routes Validation & Handlers", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("POST /api/generate-image", () => {
    it("should return 400 if prompt is missing or empty", async () => {
      const request = new Request("http://localhost:3000/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "" }),
      });

      const response = await generateImageRoute(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toMatch(/prompt is required/i);
    });

    it("should return 200 with imageUrl, width, and height for valid prompt", async () => {
      const request = new Request("http://localhost:3000/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Futuristic city skyline at sunset",
          aspectRatio: "16:9",
          style: "digital art, highly detailed"
        }),
      });

      const response = await generateImageRoute(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.imageUrl).toContain("https://image.pollinations.ai/prompt/");
      expect(body.width).toBeGreaterThanOrEqual(2048);
      expect(body.height).toBeGreaterThan(0);
      expect(body.width * body.height).toBeGreaterThanOrEqual(4_000_000);
    });
  });

  describe("POST /api/analyze-metadata", () => {
    it("should return 400 if imageBase64 is missing", async () => {
      delete process.env.GEMINI_API_KEY;
      const request = new Request("http://localhost:3000/api/analyze-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: "test-key" }),
      });

      const response = await analyzeMetadataRoute(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toMatch(/imageBase64 is required/i);
    });

    it("should return 400 with Settings prompt if apiKey is missing in both body and env", async () => {
      delete process.env.GEMINI_API_KEY;
      const request = new Request("http://localhost:3000/api/analyze-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: "dGVzdGltYWdl" }),
      });

      const response = await analyzeMetadataRoute(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toMatch(/Gemini API key is required.*Settings/i);
    });

    it("should use body apiKey when provided", async () => {
      delete process.env.GEMINI_API_KEY;
      const mockMetadata = {
        title: "Test Title",
        description: "Test Description",
        category: "Abstract",
        keywords: Array.from({ length: 30 }, (_, i) => `tag${i}`)
      };

      vi.spyOn(GeminiFlashProvider.prototype, "analyzeMetadata").mockResolvedValue(mockMetadata);

      const request = new Request("http://localhost:3000/api/analyze-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: "dGVzdGltYWdl",
          apiKey: "custom-user-key"
        }),
      });

      const response = await analyzeMetadataRoute(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.metadata).toEqual(mockMetadata);
    });

    it("should fallback to process.env.GEMINI_API_KEY when body apiKey is omitted", async () => {
      process.env.GEMINI_API_KEY = "env-secret-key";
      const mockMetadata = {
        title: "Env Fallback Title",
        description: "Env Fallback Description",
        category: "Nature",
        keywords: Array.from({ length: 30 }, (_, i) => `nature${i}`)
      };

      const spy = vi.spyOn(GeminiFlashProvider.prototype, "analyzeMetadata").mockResolvedValue(mockMetadata);

      const request = new Request("http://localhost:3000/api/analyze-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: "dGVzdGltYWdl"
        }),
      });

      const response = await analyzeMetadataRoute(request);
      expect(response.status).toBe(200);
      expect(spy).toHaveBeenCalledWith("dGVzdGltYWdl", "env-secret-key");

      const body = await response.json();
      expect(body.metadata).toEqual(mockMetadata);
    });
  });
});
