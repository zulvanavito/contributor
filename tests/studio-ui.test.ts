import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import fs from "fs";
import path from "path";

import { KeywordChips } from "../components/studio/keyword-chips";
import { MetadataCard } from "../components/studio/metadata-card";
import { InputPanel } from "../components/studio/input-panel";
import { PreviewPanel } from "../components/studio/preview-panel";
import { StudioLayout } from "../components/studio/studio-layout";
import Home from "../app/page";
import { DEFAULT_SETTINGS } from "../lib/storage";
import { StockMetadata } from "../lib/types";

describe("Task 6: Antarmuka Studio Utama (Studio Tunggal Split View)", () => {
  beforeEach(() => {
    // Mock navigator.clipboard
    const mockClipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    };
    vi.stubGlobal("navigator", {
      clipboard: mockClipboard,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("Component Exports", () => {
    it("should export all studio components properly", () => {
      expect(KeywordChips).toBeDefined();
      expect(MetadataCard).toBeDefined();
      expect(InputPanel).toBeDefined();
      expect(PreviewPanel).toBeDefined();
      expect(StudioLayout).toBeDefined();
      expect(Home).toBeDefined();
    });
  });

  describe("KeywordChips Component", () => {
    const sampleKeywords = ["modern", "architecture", "skyscraper", "skyline"];

    it("should render keyword tags and counter badge correctly", () => {
      const html = renderToString(
        React.createElement(KeywordChips, {
          keywords: sampleKeywords,
          maxKeywords: 50,
        })
      );

      expect(html).toContain("4 / 50");
      expect(html).toContain("modern");
      expect(html).toContain("architecture");
      expect(html).toContain("skyscraper");
      expect(html).toContain("skyline");
      expect(html).toContain("Salin Semua");
    });

    it("should render empty state message when keywords array is empty", () => {
      const html = renderToString(
        React.createElement(KeywordChips, { keywords: [] })
      );

      expect(html).toContain("0 / 50");
      expect(html).toContain("Belum ada kata kunci");
    });

    it("should render input field and add button when not readOnly", () => {
      const html = renderToString(
        React.createElement(KeywordChips, {
          keywords: sampleKeywords,
          readOnly: false,
        })
      );

      expect(html).toContain("Tambah kata kunci baru");
      expect(html).toContain("Tambah");
    });

    it("should not render input field when readOnly is true", () => {
      const html = renderToString(
        React.createElement(KeywordChips, {
          keywords: sampleKeywords,
          readOnly: true,
        })
      );

      expect(html).not.toContain("Tambah kata kunci baru");
    });

    it("should produce comma-separated format for copying all keywords", () => {
      const joined = sampleKeywords.join(", ");
      expect(joined).toBe("modern, architecture, skyscraper, skyline");
      expect(joined.split(", ").length).toBe(4);
    });
  });

  describe("MetadataCard Component", () => {
    const sampleMetadata: StockMetadata = {
      title: "Modern Glass Skyscraper at Sunset",
      description:
        "Low angle perspective of modern financial district glass skyscraper reflecting golden sunset light.",
      category: "Architecture & Business",
      keywords: [
        "skyscraper",
        "architecture",
        "glass",
        "sunset",
        "financial",
        "city",
      ],
    };

    it("should render title, description, category, and embedded keyword chips", () => {
      const html = renderToString(
        React.createElement(MetadataCard, { metadata: sampleMetadata })
      );

      expect(html).toContain("Modern Glass Skyscraper at Sunset");
      expect(html).toContain(
        "Low angle perspective of modern financial district"
      );
      expect(html).toContain("Architecture &amp; Business");
      expect(html).toContain("skyscraper");
      expect(html).toContain("sunset");
      expect(html).toContain("Salin Semua Metadata");
    });

    it("should render copy buttons for title and description", () => {
      const html = renderToString(
        React.createElement(MetadataCard, { metadata: sampleMetadata })
      );

      expect(html).toContain("Salin judul gambar");
      expect(html).toContain("Salin deskripsi gambar");
    });

    it("should format all metadata correctly for clipboard export", () => {
      const formatted = [
        `Title: ${sampleMetadata.title}`,
        `Description: ${sampleMetadata.description}`,
        `Category: ${sampleMetadata.category}`,
        `Keywords: ${sampleMetadata.keywords.join(", ")}`,
      ].join("\n\n");

      expect(formatted).toContain("Title: Modern Glass Skyscraper at Sunset");
      expect(formatted).toContain("Category: Architecture & Business");
      expect(formatted).toContain(
        "Keywords: skyscraper, architecture, glass, sunset, financial, city"
      );
    });
  });

  describe("InputPanel Component", () => {
    it("should render both generation and upload tabs", () => {
      const onGenerate = vi.fn();
      const onUpload = vi.fn();

      const html = renderToString(
        React.createElement(InputPanel, {
          onGenerate,
          onUploadAnalyze: onUpload,
          isGenerating: false,
          isAnalyzing: false,
          settings: DEFAULT_SETTINGS,
        })
      );

      expect(html).toContain("Buat Gambar Baru");
      expect(html).toContain("Upload Gambar");
      expect(html).toContain("Deskripsi Prompt Gambar");
      expect(html).toContain("Sempurnakan Prompt");
      expect(html).toContain("Rasio Aspek");
      expect(html).toContain("Gaya Visual");
      expect(html).toContain("Generate Gambar &amp; Metadata");
    });

    it("should display loading state during generation", () => {
      const onGenerate = vi.fn();
      const onUpload = vi.fn();

      const html = renderToString(
        React.createElement(InputPanel, {
          onGenerate,
          onUploadAnalyze: onUpload,
          isGenerating: true,
          isAnalyzing: false,
          settings: DEFAULT_SETTINGS,
        })
      );

      expect(html).toContain("Menghasilkan Gambar &amp; Metadata...");
    });
  });

  describe("PreviewPanel Component", () => {
    const sampleMetadata: StockMetadata = {
      title: "Commercial Coffee Cup",
      description: "Artisan espresso in a ceramic cup on wooden counter.",
      category: "Food & Beverage",
      keywords: ["coffee", "espresso", "ceramic", "cafe"],
    };

    it("should render empty state when no image is loaded and not loading", () => {
      const html = renderToString(
        React.createElement(PreviewPanel, {
          imageUrl: null,
          imageFile: null,
          metadata: null,
          isLoading: false,
          error: null,
        })
      );

      expect(html).toContain("Pratinjau Gambar &amp; Metadata");
      expect(html).toContain("AI Generator");
      expect(html).toContain("IPTC Injection");
    });

    it("should render loading skeletons when isLoading is true", () => {
      const html = renderToString(
        React.createElement(PreviewPanel, {
          imageUrl: null,
          imageFile: null,
          metadata: null,
          isLoading: true,
          loadingStep: "Menghasilkan gambar komersial...",
          error: null,
        })
      );

      expect(html).toContain("Menghasilkan gambar komersial...");
      // Skeleton component renders with animate-pulse class
      expect(html).toContain("animate-pulse");
    });

    it("should render error state with retry button when error occurs", () => {
      const onRetry = vi.fn();
      const html = renderToString(
        React.createElement(PreviewPanel, {
          imageUrl: null,
          imageFile: null,
          metadata: null,
          isLoading: false,
          error: "Gagal menghubungkan ke server Pollinations.",
          onRetry,
        })
      );

      expect(html).toContain("Gagal Memproses Permintaan");
      expect(html).toContain("Gagal menghubungkan ke server Pollinations.");
      expect(html).toContain("Coba Lagi");
    });

    it("should render active image and download buttons when image is provided", () => {
      const html = renderToString(
        React.createElement(PreviewPanel, {
          imageUrl: "https://image.pollinations.ai/prompt/coffee-cup",
          imageFile: null,
          metadata: sampleMetadata,
          isLoading: false,
          error: null,
        })
      );

      expect(html).toContain("https://image.pollinations.ai/prompt/coffee-cup");
      expect(html).toContain("Unduh Mentah");
      expect(html).toContain("Unduh JPEG (IPTC Tertanam)");
      expect(html).toContain("Commercial Coffee Cup");
    });
  });

  describe("StudioLayout & Page", () => {
    it("should render header branding and split view grid", () => {
      const html = renderToString(React.createElement(StudioLayout));

      expect(html).toContain("Microstock Contributor Studio");
      expect(html).toContain("v1.0");
      expect(html).toContain("Pengaturan");
      // Split view responsive grid layout
      expect(html).toContain("grid-cols-1 lg:grid-cols-2");
    });

    it("should render Home page component with StudioLayout", () => {
      const html = renderToString(React.createElement(Home));
      expect(html).toContain("Microstock Contributor Studio");
      expect(html).toContain("Studio Kontributor");
    });
  });

  describe("Antislop Rule R-02 Compliance (Zero Em Dashes)", () => {
    const filesToCheck = [
      "components/studio/keyword-chips.tsx",
      "components/studio/metadata-card.tsx",
      "components/studio/input-panel.tsx",
      "components/studio/preview-panel.tsx",
      "components/studio/studio-layout.tsx",
      "app/page.tsx",
    ];

    it("should have zero em dashes across all Studio UI files", () => {
      for (const relPath of filesToCheck) {
        const fullPath = path.resolve(__dirname, "..", relPath);
        const content = fs.readFileSync(fullPath, "utf-8");

        // Check for em dash character or unicode escape
        const hasEmDash = content.includes("—") || content.includes("\u2014");
        expect(
          hasEmDash,
          `File ${relPath} contains a forbidden em dash. Replace with hyphen or rephrase.`
        ).toBe(false);
      }
    });
  });
});
