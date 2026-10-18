"use client";

import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { useTheme } from "next-themes";
import { useSettings } from "@/lib/storage";
import { StockMetadata, AspectRatioKey, StylePresetKey } from "@/lib/types";
import { InputPanel } from "./input-panel";
import { PreviewPanel } from "./preview-panel";
import { SettingsDialog } from "@/components/settings-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Sun,
  Moon,
  Sparkles,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export function StudioLayout() {
  const { settings } = useSettings();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Settings dialog state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Studio core state
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [activeImageFile, setActiveImageFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<StockMetadata | null>(null);

  // Loading & error states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Track last action for retry
  const [lastAction, setLastAction] = useState<
    | { type: "generate"; prompt: string; ratio: AspectRatioKey; style: StylePresetKey }
    | { type: "analyze"; file: File }
    | null
  >(null);

  // Avoid SSR hydration mismatch for theme icon
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Convert image URL to Base64 in browser
  const convertUrlToBase64 = async (url: string): Promise<string> => {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Convert File to Base64 in browser
  const convertFileToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Generate Image and auto-extract metadata
  const handleGenerate = useCallback(
    async (
      prompt: string,
      aspectRatio: AspectRatioKey,
      style: StylePresetKey
    ) => {
      setIsGenerating(true);
      setError(null);
      setLoadingStep("Menghasilkan gambar komersial dengan AI...");
      setLastAction({ type: "generate", prompt, ratio: aspectRatio, style });

      try {
        // 1. Call Generate Image endpoint
        const genResponse = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            aspectRatio,
            style,
          }),
        });

        const genData = await genResponse.json();
        if (!genResponse.ok) {
          throw new Error(genData.error || "Gagal membuat gambar");
        }

        const generatedUrl = genData.imageUrl;
        setActiveImageUrl(generatedUrl);
        setActiveImageFile(null);

        // 2. Auto-extract Metadata if Gemini API Key is configured
        if (settings.geminiApiKey) {
          setLoadingStep("Menganalisis metadata IPTC dengan AI Gemini...");
          try {
            const base64Data = await convertUrlToBase64(generatedUrl);
            const metaResponse = await fetch("/api/analyze-metadata", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imageBase64: base64Data,
                apiKey: settings.geminiApiKey,
              }),
            });

            const metaData = await metaResponse.json();
            if (metaResponse.ok && metaData.metadata) {
              setMetadata(metaData.metadata);
              toast.success("Gambar dan metadata IPTC berhasil dibuat!");
            } else {
              // Graceful fallback to prompt-derived metadata
              setMetadata({
                title: prompt.slice(0, 80),
                description: `${prompt}. High quality commercial photography.`,
                category: "Commercial Photography",
                keywords: Array.from(
                  new Set([
                    ...prompt.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter((w) => w.length > 3),
                    "commercial",
                    "photography",
                    "stock photo",
                    "high resolution",
                  ])
                ),
              });
              toast.info(
                "Gambar berhasil dibuat. Metadata dasar diterapkan dari prompt."
              );
            }
          } catch (metaErr) {
            console.warn("Auto metadata extraction failed:", metaErr);
            // Apply prompt-derived metadata fallback
            setMetadata({
              title: prompt.slice(0, 80),
              description: `${prompt}. High quality commercial photography.`,
              category: "Commercial Photography",
              keywords: ["commercial", "photography", "stock photo"],
            });
            toast.info("Gambar berhasil dibuat.");
          }
        } else {
          // No Gemini API key: fallback metadata from prompt
          setMetadata({
            title: prompt.slice(0, 80),
            description: `${prompt}. High quality commercial stock photo.`,
            category: "Commercial",
            keywords: Array.from(
              new Set([
                ...prompt.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter((w) => w.length > 3),
                "commercial",
                "stock",
                "photo",
              ])
            ),
          });
          toast.success("Gambar berhasil dibuat!");
          toast.info(
            "Tambahkan Gemini API Key di Pengaturan untuk analisis metadata 50 kata kunci otomatis."
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
        setError(msg);
        toast.error(msg);
      } finally {
        setIsGenerating(false);
        setLoadingStep("");
      }
    },
    [settings.geminiApiKey]
  );

  // Upload and analyze existing image
  const handleUploadAnalyze = useCallback(
    async (file: File) => {
      if (!settings.geminiApiKey) {
        toast.error(
          "Gemini API Key diperlukan untuk menganalisis metadata gambar. Silakan atur di Pengaturan."
        );
        setIsSettingsOpen(true);
        return;
      }

      setIsAnalyzing(true);
      setError(null);
      setLoadingStep("Membaca gambar dan menganalisis metadata...");
      setLastAction({ type: "analyze", file });

      setActiveImageFile(file);
      setActiveImageUrl(null);

      try {
        const base64Data = await convertFileToBase64(file);
        const response = await fetch("/api/analyze-metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64Data,
            apiKey: settings.geminiApiKey,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Gagal menganalisis metadata gambar");
        }

        if (data.metadata) {
          setMetadata(data.metadata);
          toast.success("Metadata gambar berhasil dianalisis!");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
        setError(msg);
        toast.error(msg);
      } finally {
        setIsAnalyzing(false);
        setLoadingStep("");
      }
    },
    [settings.geminiApiKey]
  );

  // Retry last action
  const handleRetry = useCallback(() => {
    if (!lastAction) return;

    if (lastAction.type === "generate") {
      handleGenerate(lastAction.prompt, lastAction.ratio, lastAction.style);
    } else if (lastAction.type === "analyze") {
      handleUploadAnalyze(lastAction.file);
    }
  }, [lastAction, handleGenerate, handleUploadAnalyze]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Studio Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-7xl">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-base shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                  Microstock Contributor Studio
                </h1>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium">
                  v1.0
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Generator Gambar Komersial AI dan Ekstraktor Metadata IPTC
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className="h-8 w-8 p-0"
              title="Ganti Tema"
              aria-label="Ganti Tema Tampilan"
            >
              {mounted && theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {/* Settings Dialog Trigger Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              className="h-8 gap-1.5 text-xs font-medium"
              aria-label="Buka Pengaturan"
            >
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Pengaturan</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Split-View Studio Workspace */}
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Panel: Input Panel */}
          <div className="w-full">
            <InputPanel
              onGenerate={handleGenerate}
              onUploadAnalyze={handleUploadAnalyze}
              isGenerating={isGenerating}
              isAnalyzing={isAnalyzing}
              settings={settings}
            />
          </div>

          {/* Right Panel: Preview Panel */}
          <div className="w-full">
            <PreviewPanel
              imageUrl={activeImageUrl}
              imageFile={activeImageFile}
              metadata={metadata}
              isLoading={isGenerating || isAnalyzing}
              loadingStep={loadingStep}
              error={error}
              onRetry={handleRetry}
              onChangeMetadata={setMetadata}
            />
          </div>
        </div>
      </main>

      {/* Settings Dialog */}
      <SettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </div>
  );
}
