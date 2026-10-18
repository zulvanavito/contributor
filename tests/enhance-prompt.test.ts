import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  enhancePromptWithGemini,
  enhancePromptFallback,
} from "../lib/providers/metadata-analysis";
import { POST as enhancePromptRoute } from "../app/api/enhance-prompt/route";

describe("Prompt Enhancement & Translation (Task 3)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("enhancePromptFallback", () => {
    it("should enhance an English prompt with commercial stock photography attributes", () => {
      const prompt = "modern office desk with laptop and coffee";
      const enhanced = enhancePromptFallback(prompt);

      expect(enhanced).toContain(prompt);
      expect(enhanced.toLowerCase()).toContain("commercial stock photography");
      expect(enhanced.toLowerCase()).toContain("lighting");
      expect(enhanced.toLowerCase()).toContain("copy space");
      expect(enhanced).not.toContain("—");
    });

    it("should translate basic Indonesian keywords and add commercial descriptors", () => {
      const prompt = "kedai kopi minimalis sore hari";
      const enhanced = enhancePromptFallback(prompt);

      // Should translate or include translated concepts
      expect(enhanced.toLowerCase()).toMatch(/coffee|cafe|minimalist/);
      expect(enhanced.toLowerCase()).toContain("commercial stock photography");
      expect(enhanced).not.toContain("—");
    });

    it("should not contain any em dash characters (Antislop R-02)", () => {
      const prompt = "pemandangan alam pegunungan yang asri";
      const enhanced = enhancePromptFallback(prompt);

      expect(enhanced).not.toContain("—");
    });
  });

  describe("enhancePromptWithGemini", () => {
    it("should throw an error if prompt is empty or whitespace", async () => {
      await expect(enhancePromptWithGemini("", "mock-key")).rejects.toThrow(
        /prompt.*required|kosong/i
      );
      await expect(enhancePromptWithGemini("   ", "mock-key")).rejects.toThrow(
        /prompt.*required|kosong/i
      );
    });

    it("should throw an error if apiKey is empty", async () => {
      await expect(
        enhancePromptWithGemini("valid prompt", "")
      ).rejects.toThrow(/api key.*required/i);
    });

    it("should call Gemini API and return trimmed enhanced prompt without quotes or em dashes", async () => {
      const mockEnhancedText =
        '"Minimalist modern coffee shop in the late afternoon, golden hour warm lighting, clean interior with copy space, commercial stock photography, sharp focus, 8k resolution"';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: mockEnhancedText }],
              },
            },
          ],
        }),
      });
      global.fetch = mockFetch;

      const result = await enhancePromptWithGemini(
        "kedai kopi minimalis sore hari",
        "test-api-key"
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("generativelanguage.googleapis.com");
      expect(url).toContain("test-api-key");
      expect(options.method).toBe("POST");

      // Verify surrounding quotes are stripped and no em dash
      expect(result.startsWith('"')).toBe(false);
      expect(result.endsWith('"')).toBe(false);
      expect(result).not.toContain("—");
      expect(result).toContain("Minimalist modern coffee shop");
    });

    it("should replace em dashes if Gemini returns them (Antislop R-02)", async () => {
      const textWithEmDash =
        "Modern cafe interior — warm sunlight streaming in — commercial stock photo";

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: textWithEmDash }],
              },
            },
          ],
        }),
      });

      const result = await enhancePromptWithGemini("kedai kopi", "test-key");
      expect(result).not.toContain("—");
      expect(result).toContain("Modern cafe interior");
    });

    it("should throw an error if Gemini returns non-200 status", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: async () => ({
          error: { message: "Invalid API key" },
        }),
      });

      await expect(
        enhancePromptWithGemini("sunset beach", "bad-key")
      ).rejects.toThrow(/Gemini API error.*Invalid API key/);
    });

    it("should throw an error if Gemini response has no text parts", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ candidates: [] }),
      });

      await expect(
        enhancePromptWithGemini("sunset beach", "valid-key")
      ).rejects.toThrow(/No text response/i);
    });
  });

  describe("POST /api/enhance-prompt", () => {
    it("should return status 400 with { error: 'Prompt tidak boleh kosong' } when prompt is missing", async () => {
      const request = new Request("http://localhost:3000/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await enhancePromptRoute(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toBe("Prompt tidak boleh kosong");
      expect(body.error).not.toContain("—");
    });

    it("should return status 400 with { error: 'Prompt tidak boleh kosong' } when prompt is whitespace only", async () => {
      const request = new Request("http://localhost:3000/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "   \n\t  " }),
      });

      const response = await enhancePromptRoute(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toBe("Prompt tidak boleh kosong");
      expect(body.error).not.toContain("—");
    });

    it("should return status 400 when body is not valid JSON", async () => {
      const request = new Request("http://localhost:3000/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json",
      });

      const response = await enhancePromptRoute(request);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toBe("Prompt tidak boleh kosong");
    });

    it("should enhance and translate Indonesian prompt to commercial English via Gemini when apiKey is provided", async () => {
      delete process.env.GEMINI_API_KEY;
      const originalPrompt = "kedai kopi minimalis sore hari";
      const enhancedEnglish =
        "Cozy minimalist coffee shop during warm afternoon golden hour, soft natural sunlight, scandinavian wooden furniture, commercial stock photography, depth of field, copy space, 8k resolution";

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: enhancedEnglish }],
              },
            },
          ],
        }),
      });

      const request = new Request("http://localhost:3000/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: originalPrompt,
          apiKey: "custom-user-api-key",
        }),
      });

      const response = await enhancePromptRoute(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.originalPrompt).toBe(originalPrompt);
      expect(body.enhancedPrompt).toBe(enhancedEnglish);
      expect(body.enhancedPrompt).not.toContain("—");
    });

    it("should use process.env.GEMINI_API_KEY when apiKey is omitted in request body", async () => {
      process.env.GEMINI_API_KEY = "env-gemini-key";
      const originalPrompt = "robot modern di laboratorium";
      const enhancedEnglish =
        "Futuristic research robot in high-tech cleanroom laboratory, sleek design, bright commercial lighting, depth of field, sharp focus, 8k stock photo";

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: enhancedEnglish }],
              },
            },
          ],
        }),
      });
      global.fetch = mockFetch;

      const request = new Request("http://localhost:3000/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: originalPrompt,
        }),
      });

      const response = await enhancePromptRoute(request);
      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("env-gemini-key"),
        expect.any(Object)
      );

      const body = await response.json();
      expect(body.originalPrompt).toBe(originalPrompt);
      expect(body.enhancedPrompt).toBe(enhancedEnglish);
    });

    it("should fall back gracefully to rule-based enhancement when no apiKey is available", async () => {
      delete process.env.GEMINI_API_KEY;
      const originalPrompt = "kedai kopi minimalis sore hari";

      const request = new Request("http://localhost:3000/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: originalPrompt,
        }),
      });

      const response = await enhancePromptRoute(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.originalPrompt).toBe(originalPrompt);
      expect(typeof body.enhancedPrompt).toBe("string");
      expect(body.enhancedPrompt.length).toBeGreaterThan(originalPrompt.length);
      expect(body.enhancedPrompt.toLowerCase()).toContain("commercial stock photography");
      expect(body.enhancedPrompt).not.toContain("—");
    });

    it("should fall back gracefully to rule-based enhancement without crashing when Gemini call fails", async () => {
      process.env.GEMINI_API_KEY = "failing-key";
      global.fetch = vi.fn().mockRejectedValue(new Error("Network connection error"));

      const originalPrompt = "laptop di atas meja kayu modern";

      const request = new Request("http://localhost:3000/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: originalPrompt,
        }),
      });

      const response = await enhancePromptRoute(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.originalPrompt).toBe(originalPrompt);
      expect(body.enhancedPrompt).toBeTruthy();
      expect(body.enhancedPrompt.toLowerCase()).toContain("commercial stock photography");
      expect(body.enhancedPrompt).not.toContain("—");
    });

    it("should ensure no responses or error messages contain em dashes (Antislop R-02)", async () => {
      const request = new Request("http://localhost:3000/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "piring buah segar di meja makan" }),
      });

      const response = await enhancePromptRoute(request);
      const text = await response.text();
      expect(text).not.toContain("—");
    });
  });
});
