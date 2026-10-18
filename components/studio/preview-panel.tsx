"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StockMetadata } from "@/lib/types";
import { injectIptcMetadata } from "@/lib/iptc-writer";
import { MetadataCard } from "./metadata-card";
import {
  Download,
  FileDown,
  RotateCcw,
  AlertCircle,
  Image as ImageIcon,
  ExternalLink,
  Loader2,
  Sparkles,
  Info,
} from "lucide-react";
import { toast } from "sonner";

export interface PreviewPanelProps {
  imageUrl: string | null;
  imageFile: File | null;
  metadata: StockMetadata | null;
  isLoading: boolean;
  loadingStep?: string;
  error: string | null;
  onRetry?: () => void;
  onChangeMetadata?: (metadata: StockMetadata) => void;
  className?: string;
}

export function PreviewPanel({
  imageUrl,
  imageFile,
  metadata,
  isLoading,
  loadingStep,
  error,
  onRetry,
  onChangeMetadata,
  className = "",
}: PreviewPanelProps) {
  const [isDownloadingIptc, setIsDownloadingIptc] = useState(false);
  const [isDownloadingRaw, setIsDownloadingRaw] = useState(false);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  // Manage object URL lifecycle for uploaded imageFile to avoid leaks and re-render flicker
  useEffect(() => {
    if (!imageFile) {
      setFilePreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(imageFile);
    setFilePreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  const displayUrl = imageUrl || filePreviewUrl;

  // Helper to generate a clean filename from title
  const getDownloadFilename = (extension: string = "jpg"): string => {
    const rawTitle = metadata?.title || "stock-photo";
    const slug = rawTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);
    return `${slug || "microstock-image"}.${extension}`;
  };

  // Helper to retrieve image as Blob
  const getImageBlob = async (): Promise<Blob> => {
    if (imageFile) {
      return imageFile;
    }
    if (imageUrl) {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error("Gagal mengambil file gambar untuk diproses.");
      }
      return await response.blob();
    }
    throw new Error("Tidak ada gambar yang tersedia.");
  };

  // Primary Action: Download JPEG with embedded IPTC
  const handleDownloadIptc = async () => {
    if (!imageUrl && !imageFile) {
      toast.error("Tidak ada gambar yang aktif untuk diunduh.");
      return;
    }

    setIsDownloadingIptc(true);
    const toastId = toast.loading("Menyiapkan dan menanamkan metadata IPTC...");

    try {
      const originalBlob = await getImageBlob();

      const defaultMetadata: StockMetadata = {
        title: metadata?.title || "Commercial Stock Photo",
        description: metadata?.description || "High quality commercial stock image",
        category: metadata?.category || "Commercial",
        keywords: metadata?.keywords || ["stock", "commercial", "photo"],
      };

      const finalBlob = await injectIptcMetadata(originalBlob, defaultMetadata);

      const downloadUrl = URL.createObjectURL(finalBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = getDownloadFilename("jpg");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Revoke after timeout to guarantee download completion across all browsers
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

      toast.success("Gambar dengan IPTC tertanam berhasil diunduh!", {
        id: toastId,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal menanamkan metadata IPTC";
      toast.error(message, { id: toastId });
    } finally {
      setIsDownloadingIptc(false);
    }
  };

  // Secondary Action: Download Raw Image
  const handleDownloadRaw = async () => {
    if (!imageUrl && !imageFile) {
      toast.error("Tidak ada gambar yang aktif untuk diunduh.");
      return;
    }

    setIsDownloadingRaw(true);
    try {
      const blob = await getImageBlob();
      const ext = imageFile
        ? imageFile.name.split(".").pop() || "jpg"
        : "jpg";

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `raw-${getDownloadFilename(ext)}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Revoke after timeout to guarantee download completion across all browsers
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

      toast.success("Gambar mentah berhasil diunduh!");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal mengunduh gambar mentah";
      toast.error(message);
    } finally {
      setIsDownloadingRaw(false);
    }
  };

  // Open full size in new tab (works for both generated imageUrl and uploaded imageFile)
  const handleOpenFullSize = () => {
    if (displayUrl) {
      window.open(displayUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. LOADING STATE */}
      {isLoading && (
        <Card className="border shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{loadingStep || "Sedang memproses permintaan Anda..."}</span>
          </div>

          {/* Skeleton for Image Container */}
          <Skeleton className="w-full aspect-video rounded-lg" />

          {/* Skeletons for Metadata Section */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-16 w-full" />
            <div className="flex flex-wrap gap-2 pt-2">
              {Array.from({ length: 8 }).map((_, idx) => (
                <Skeleton key={idx} className="h-6 w-16 rounded-full" />
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* 2. ERROR STATE */}
      {!isLoading && error && (
        <Card className="border-destructive/40 bg-destructive/5 shadow-sm p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-destructive">
                Gagal Memproses Permintaan
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {error}
              </p>
            </div>
          </div>

          {onRetry && (
            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="gap-1.5 text-xs font-medium"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Coba Lagi</span>
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* 3. EMPTY STATE */}
      {!isLoading && !error && !imageUrl && !imageFile && (
        <Card className="border shadow-sm bg-card p-8 text-center flex flex-col items-center justify-center min-h-[420px]">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <ImageIcon className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            Pratinjau Gambar & Metadata
          </h3>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-md leading-relaxed">
            Gambar komersial yang Anda hasilkan atau unggah akan tampil di sini
            bersama metadata lengkap (Judul, Deskripsi, Kategori, Kata Kunci).
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left w-full max-w-md">
            <div className="p-3 border rounded-lg bg-muted/20 text-xs space-y-1">
              <div className="font-medium text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>AI Generator</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Gunakan tab "Buat Gambar Baru" untuk membuat stok foto dengan prompt cerdas.
              </p>
            </div>

            <div className="p-3 border rounded-lg bg-muted/20 text-xs space-y-1">
              <div className="font-medium text-foreground flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-primary" />
                <span>IPTC Injection</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Metadata langsung ditanam ke file JPEG saat Anda menekan tombol unduh.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 4. ACTIVE PREVIEW STATE */}
      {!isLoading && !error && (imageUrl || imageFile) && (
        <div className="space-y-4">
          {/* Image Display Card */}
          <Card className="border shadow-sm overflow-hidden bg-card">
            <div className="relative group bg-muted/30 flex items-center justify-center min-h-[280px] max-h-[460px] p-2">
              <img
                src={displayUrl || ""}
                alt={metadata?.title || "Pratinjau Microstock"}
                className="max-h-[440px] w-auto max-w-full object-contain rounded border shadow-sm"
              />

              {displayUrl && (
                <button
                  type="button"
                  onClick={handleOpenFullSize}
                  className="absolute top-4 right-4 p-2 rounded-full bg-background/80 hover:bg-background text-foreground shadow-md transition-opacity opacity-80 hover:opacity-100 focus:opacity-100 focus:outline-none"
                  title="Buka ukuran penuh di tab baru"
                  aria-label="Buka gambar ukuran penuh di tab baru"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Action Bar for Downloads */}
            <div className="p-3 bg-card border-t flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                Format: JPEG (RGB)
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadRaw}
                  disabled={isDownloadingRaw || isDownloadingIptc}
                  className="h-8 gap-1.5 text-xs font-medium"
                >
                  {isDownloadingRaw ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileDown className="h-3.5 w-3.5" />
                  )}
                  <span>Unduh Mentah</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleDownloadIptc}
                  disabled={isDownloadingIptc || isDownloadingRaw}
                  className="h-8 gap-1.5 text-xs font-semibold shadow-sm"
                >
                  {isDownloadingIptc ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Menanamkan IPTC...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5" />
                      <span>Unduh JPEG (IPTC Tertanam)</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Metadata Display Card */}
          {metadata && (
            <MetadataCard
              metadata={metadata}
              onChangeMetadata={onChangeMetadata}
              isLoading={isLoading}
            />
          )}
        </div>
      )}
    </div>
  );
}
