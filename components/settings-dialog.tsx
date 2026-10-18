"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getStoredSettings,
  saveStoredSettings,
  clearStoredSettings,
  isValidGeminiApiKey,
  DEFAULT_SETTINGS,
  AppSettings,
} from "@/lib/storage";
import {
  ASPECT_RATIOS,
  STYLE_PRESETS,
  AspectRatioKey,
  StylePresetKey,
} from "@/lib/types";
import {
  Eye,
  EyeOff,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RotateCcw,
  Sparkles,
  KeyRound,
  Layers,
  Ratio,
  Palette,
} from "lucide-react";
import { toast } from "sonner";

export interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
}

type TestStatus = "idle" | "testing" | "success" | "warning" | "error";

export function SettingsDialog({
  open,
  onOpenChange,
  trigger,
}: SettingsDialogProps) {
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [imageProvider, setImageProvider] = useState<"pollinations" | "imagen">("pollinations");
  const [aspectRatio, setAspectRatio] = useState<AspectRatioKey>("16:9");
  const [stylePreset, setStylePreset] = useState<StylePresetKey>("commercial-photo");

  // Connection test state
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testMessage, setTestMessage] = useState("");

  // Populate from localStorage whenever dialog opens
  useEffect(() => {
    if (open) {
      const stored = getStoredSettings();
      setApiKey(stored.geminiApiKey || "");
      setImageProvider(stored.imageProvider || "pollinations");
      setAspectRatio(stored.defaultAspectRatio || "16:9");
      setStylePreset(stored.defaultStyle || "commercial-photo");
      setTestStatus("idle");
      setTestMessage("");
    }
  }, [open]);

  const handleTestConnection = async () => {
    const trimmedKey = apiKey.trim();

    if (!trimmedKey) {
      setTestStatus("error");
      setTestMessage("Masukkan Gemini API Key terlebih dahulu.");
      return;
    }

    if (!isValidGeminiApiKey(trimmedKey)) {
      setTestStatus("error");
      setTestMessage("Format API Key tidak valid. Kunci harus diawali 'AIzaSy' (35-45 karakter).");
      return;
    }

    setTestStatus("testing");
    setTestMessage("Menguji koneksi ke Google AI Studio...");

    try {
      const response = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "test commercial stock photo",
          apiKey: trimmedKey,
        }),
      });

      if (response.ok) {
        setTestStatus("success");
        setTestMessage("Koneksi berhasil. Gemini API Key aktif dan siap digunakan.");
      } else {
        let errDesc = `Galat HTTP ${response.status}`;
        try {
          const errData = await response.json();
          if (errData?.error) {
            errDesc = String(errData.error).replace(/\u2014/g, "-");
          }
        } catch {
          // use default
        }
        setTestStatus("error");
        setTestMessage(`Koneksi gagal: ${errDesc}`);
      }
    } catch {
      // In offline / network failure environment where fetch fails
      setTestStatus("warning");
      setTestMessage(
        "Mode offline: Format API key valid, koneksi ke server tidak dapat diverifikasi."
      );
    }
  };

  const handleSave = () => {
    const updated = saveStoredSettings({
      geminiApiKey: apiKey.trim(),
      imageProvider,
      metadataProvider: "gemini",
      defaultAspectRatio: aspectRatio,
      defaultStyle: stylePreset,
    });

    toast.success("Pengaturan berhasil disimpan.");
    onOpenChange(false);
  };

  const handleReset = () => {
    clearStoredSettings();
    setApiKey(DEFAULT_SETTINGS.geminiApiKey);
    setImageProvider(DEFAULT_SETTINGS.imageProvider);
    setAspectRatio(DEFAULT_SETTINGS.defaultAspectRatio);
    setStylePreset(DEFAULT_SETTINGS.defaultStyle);
    setTestStatus("idle");
    setTestMessage("");

    toast.info("Pengaturan dikembalikan ke default.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <KeyRound className="h-5 w-5 text-primary" />
            Pengaturan Studio
          </DialogTitle>
          <DialogDescription>
            Konfigurasi API Key, preferensi model AI, dan preferensi default mikrostock.
            Semua data tersimpan privat di browser Anda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Section 1: Gemini API Key */}
          <div className="space-y-2 rounded-lg border p-4 bg-muted/20">
            <div className="flex items-center justify-between">
              <label
                htmlFor="gemini-api-key"
                className="text-sm font-semibold flex items-center gap-1.5"
              >
                <Sparkles className="h-4 w-4 text-primary" />
                Gemini API Key
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium transition-colors"
                title="Buka Google AI Studio di tab baru"
              >
                Dapatkan API Key gratis di Google AI Studio (tanpa kartu kredit)
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="relative flex items-center">
              <Input
                id="gemini-api-key"
                type={showApiKey ? "text" : "password"}
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestStatus("idle");
                  setTestMessage("");
                }}
                className="pr-10 font-mono text-sm"
                autoComplete="off"
                spellCheck={false}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setShowApiKey(!showApiKey)}
                aria-label={showApiKey ? "Sembunyikan API Key" : "Tampilkan API Key"}
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
              <p className="text-xs text-muted-foreground">
                Digunakan untuk ekstraksi metadata gambar dan penyempurnaan prompt.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={testStatus === "testing"}
                className="self-start sm:self-auto shrink-0 text-xs h-8"
              >
                {testStatus === "testing" ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Menguji...
                  </>
                ) : (
                  "Uji Koneksi"
                )}
              </Button>
            </div>

            {/* Test Status Indicator */}
            {testStatus !== "idle" && (
              <div
                className={`mt-2 flex items-start gap-2 rounded-md p-2.5 text-xs ${
                  testStatus === "success"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                    : testStatus === "warning"
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                    : testStatus === "error"
                    ? "bg-destructive/10 text-destructive border border-destructive/20"
                    : "bg-muted text-muted-foreground"
                }`}
                role="status"
              >
                {testStatus === "success" && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                )}
                {testStatus === "warning" && (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                )}
                {testStatus === "error" && (
                  <XCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                )}
                {testStatus === "testing" && (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin mt-0.5" />
                )}
                <span className="font-medium leading-relaxed">{testMessage}</span>
              </div>
            )}
          </div>

          {/* Section 2: AI Provider Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
              <Layers className="h-4 w-4 text-primary" />
              Penyedia Layanan AI
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Image Gen Provider */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Generator Gambar
                </label>
                <Select
                  value={imageProvider}
                  onValueChange={(val) =>
                    setImageProvider(val as "pollinations" | "imagen")
                  }
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Pilih provider gambar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pollinations">
                      Pollinations / Flux (Gratis)
                    </SelectItem>
                    <SelectItem value="imagen">
                      Google Imagen 3 (Perlu API Key)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {imageProvider === "pollinations"
                    ? "Default: 100% gratis tanpa API Key atau kartu kredit."
                    : "Memerlukan Gemini API Key yang mendukung Imagen 3."}
                </p>
              </div>

              {/* Metadata Provider */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Ekstraksi Metadata
                </label>
                <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-muted/40 px-3 py-2 text-xs font-medium">
                  <span>Gemini Flash Vision</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Gratis
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Model cepat berbiaya 0 melalui kuota Google AI Studio.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Default Studio Preferences */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
              <Palette className="h-4 w-4 text-primary" />
              Preferensi Bawaan Studio
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Default Aspect Ratio */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium flex items-center gap-1 text-foreground">
                  <Ratio className="h-3.5 w-3.5 text-muted-foreground" />
                  Rasio Aspek Awal
                </label>
                <Select
                  value={aspectRatio}
                  onValueChange={(val) => setAspectRatio(val as AspectRatioKey)}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Pilih rasio aspek" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASPECT_RATIOS.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Format aspek rasio otomatis saat pertama membuka studio.
                </p>
              </div>

              {/* Default Style Preset */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium flex items-center gap-1 text-foreground">
                  <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                  Gaya Gambar Awal
                </label>
                <Select
                  value={stylePreset}
                  onValueChange={(val) => setStylePreset(val as StylePresetKey)}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Pilih preset gaya" />
                  </SelectTrigger>
                  <SelectContent>
                    {STYLE_PRESETS.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Preset gaya komersial standar untuk prompt gambar.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-muted-foreground hover:text-destructive flex items-center gap-1.5 text-xs h-9 justify-center"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset ke Default
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="flex-1 sm:flex-initial text-xs h-9"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleSave}
              className="flex-1 sm:flex-initial text-xs h-9 font-medium"
            >
              Simpan Pengaturan
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
