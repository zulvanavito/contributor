"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ASPECT_RATIOS,
  STYLE_PRESETS,
  AspectRatioKey,
  StylePresetKey,
} from "@/lib/types";
import { AppSettings } from "@/lib/storage";
import {
  Sparkles,
  UploadCloud,
  Wand2,
  Image as ImageIcon,
  Loader2,
  FileCheck,
  X,
  AlertCircle,
  Ratio,
  Palette,
} from "lucide-react";
import { toast } from "sonner";

export interface InputPanelProps {
  onGenerate: (
    prompt: string,
    aspectRatio: AspectRatioKey,
    style: StylePresetKey
  ) => Promise<void>;
  onUploadAnalyze: (file: File) => Promise<void>;
  isGenerating: boolean;
  isAnalyzing: boolean;
  settings: AppSettings;
  className?: string;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function InputPanel({
  onGenerate,
  onUploadAnalyze,
  isGenerating,
  isAnalyzing,
  settings,
  className = "",
}: InputPanelProps) {
  // Generation state
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatioKey>(
    settings.defaultAspectRatio || "16:9"
  );
  const [stylePreset, setStylePreset] = useState<StylePresetKey>(
    settings.defaultStyle || "commercial-photo"
  );
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update default aspect ratio and style when settings change
  useEffect(() => {
    if (settings.defaultAspectRatio) {
      setAspectRatio((prev) => prev || settings.defaultAspectRatio);
    }
  }, [settings.defaultAspectRatio]);

  useEffect(() => {
    if (settings.defaultStyle) {
      setStylePreset((prev) => prev || settings.defaultStyle);
    }
  }, [settings.defaultStyle]);

  // Clean up thumbnail object URL
  useEffect(() => {
    return () => {
      if (previewThumbnail && previewThumbnail.startsWith("blob:")) {
        URL.revokeObjectURL(previewThumbnail);
      }
    };
  }, [previewThumbnail]);

  // Prompt enhancement handler
  const handleEnhancePrompt = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      toast.error("Tuliskan prompt terlebih dahulu sebelum disempurnakan.");
      return;
    }

    setIsEnhancing(true);
    try {
      const response = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          apiKey: settings.geminiApiKey || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal menyempurnakan prompt");
      }

      if (data.enhancedPrompt) {
        setPrompt(data.enhancedPrompt);
        toast.success("Prompt berhasil disempurnakan!");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(msg);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Generate Image & Metadata submission
  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed) {
      toast.error("Masukkan deskripsi prompt gambar terlebih dahulu.");
      return;
    }

    await onGenerate(trimmed, aspectRatio, stylePreset);
  };

  // File validation helper
  const validateAndSetFile = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Format file tidak didukung. Harap pilih JPEG, PNG, atau WebP.");
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Ukuran file melebihi batas maksimum 25MB.");
      return false;
    }

    if (previewThumbnail && previewThumbnail.startsWith("blob:")) {
      URL.revokeObjectURL(previewThumbnail);
    }

    const objectUrl = URL.createObjectURL(file);
    setUploadedFile(file);
    setPreviewThumbnail(objectUrl);
    toast.success(`Gambar "${file.name}" siap dianalisis.`);
    return true;
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleClearUploadedFile = () => {
    if (previewThumbnail && previewThumbnail.startsWith("blob:")) {
      URL.revokeObjectURL(previewThumbnail);
    }
    setUploadedFile(null);
    setPreviewThumbnail(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAnalyzeSubmit = async () => {
    if (!uploadedFile) {
      toast.error("Silakan pilih file gambar terlebih dahulu.");
      return;
    }
    await onUploadAnalyze(uploadedFile);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isBusy = isGenerating || isAnalyzing || isEnhancing;

  return (
    <Card className={`border shadow-sm bg-card ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold tracking-tight">
          Studio Kontributor
        </CardTitle>
        <CardDescription className="text-xs">
          Buat gambar komersial baru atau unggah gambar untuk analisis metadata IPTC otomatis.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger
              value="generate"
              className="flex items-center gap-1.5 text-xs font-medium"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Buat Gambar Baru</span>
            </TabsTrigger>
            <TabsTrigger
              value="upload"
              className="flex items-center gap-1.5 text-xs font-medium"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              <span>Upload Gambar</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Buat Gambar Baru */}
          <TabsContent value="generate" className="space-y-4 m-0">
            <form onSubmit={handleGenerateSubmit} className="space-y-4">
              {/* Prompt Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="prompt-input"
                    className="text-xs font-medium text-foreground"
                  >
                    Deskripsi Prompt Gambar
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleEnhancePrompt}
                    disabled={isBusy || !prompt.trim()}
                    className="h-7 px-2 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10 gap-1.5"
                    title="Sempurnakan prompt dengan AI"
                  >
                    {isEnhancing ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Menyempurnakan...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-3 w-3" />
                        <span>Sempurnakan Prompt</span>
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  id="prompt-input"
                  placeholder="Contoh: Modern minimalist coffee shop interior in Tokyo, natural morning sunlight streaming through large glass window, baristas working in background, highly detailed commercial photo..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isBusy}
                  rows={4}
                  className="text-xs resize-y min-h-[90px]"
                />
              </div>

              {/* Aspect Ratio & Style Presets Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Aspect Ratio Select */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="aspect-ratio-select"
                    className="flex items-center gap-1 text-xs font-medium text-foreground"
                  >
                    <Ratio className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Rasio Aspek</span>
                  </label>
                  <Select
                    value={aspectRatio}
                    onValueChange={(val) => setAspectRatio(val as AspectRatioKey)}
                    disabled={isBusy}
                  >
                    <SelectTrigger
                      id="aspect-ratio-select"
                      className="h-9 text-xs"
                      aria-label="Pilih Rasio Aspek"
                    >
                      <SelectValue placeholder="Pilih rasio" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASPECT_RATIOS.map((ratio) => (
                        <SelectItem
                          key={ratio.id}
                          value={ratio.id}
                          className="text-xs"
                        >
                          <span className="font-medium">{ratio.label}</span>
                          <span className="text-[11px] text-muted-foreground ml-1.5 hidden sm:inline">
                            ({ratio.description})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Style Preset Select */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="style-preset-select"
                    className="flex items-center gap-1 text-xs font-medium text-foreground"
                  >
                    <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Gaya Visual</span>
                  </label>
                  <Select
                    value={stylePreset}
                    onValueChange={(val) => setStylePreset(val as StylePresetKey)}
                    disabled={isBusy}
                  >
                    <SelectTrigger
                      id="style-preset-select"
                      className="h-9 text-xs"
                      aria-label="Pilih Gaya Visual"
                    >
                      <SelectValue placeholder="Pilih gaya" />
                    </SelectTrigger>
                    <SelectContent>
                      {STYLE_PRESETS.map((preset) => (
                        <SelectItem
                          key={preset.id}
                          value={preset.id}
                          className="text-xs"
                        >
                          <span className="font-medium">{preset.label}</span>
                          <span className="text-[11px] text-muted-foreground ml-1.5 hidden sm:inline">
                            ({preset.description})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Generate Button */}
              <Button
                type="submit"
                disabled={isBusy || !prompt.trim()}
                className="w-full h-10 gap-2 text-xs font-semibold shadow-sm"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Menghasilkan Gambar & Metadata...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Generate Gambar & Metadata</span>
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          {/* TAB 2: Upload Gambar */}
          <TabsContent value="upload" className="space-y-4 m-0">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              aria-label="Upload gambar microstock"
            />

            {!uploadedFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors text-center ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/20"
                }`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                aria-label="Pilih atau tarik file gambar ke area ini"
              >
                <UploadCloud className="h-10 w-10 text-muted-foreground mb-2.5 animate-pulse" />
                <p className="text-xs font-medium text-foreground">
                  Klik untuk memilih gambar atau tarik file ke sini
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Mendukung JPEG, PNG, dan WebP (Maksimal 25MB)
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Uploaded File Preview Card */}
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20 relative">
                  {previewThumbnail && (
                    <img
                      src={previewThumbnail}
                      alt={uploadedFile.name}
                      className="h-16 w-16 object-cover rounded border bg-background shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {uploadedFile.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatFileSize(uploadedFile.size)} - {uploadedFile.type}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400 font-medium">
                      <FileCheck className="h-3 w-3" />
                      <span>File valid dan siap dianalisis</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearUploadedFile}
                    disabled={isBusy}
                    className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                    title="Ganti gambar"
                    aria-label="Hapus dan ganti gambar"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Analyze Metadata Button */}
                <Button
                  type="button"
                  onClick={handleAnalyzeSubmit}
                  disabled={isBusy || !uploadedFile}
                  className="w-full h-10 gap-2 text-xs font-semibold"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Menganalisis Metadata Gambar...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      <span>Analisis Metadata Gambar</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
