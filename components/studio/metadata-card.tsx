"use client";

import * as React from "react";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StockMetadata } from "@/lib/types";
import { KeywordChips } from "./keyword-chips";
import {
  Copy,
  Check,
  FileText,
  AlignLeft,
  Folder,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";

export interface MetadataCardProps {
  metadata: StockMetadata;
  onChangeMetadata?: (newMetadata: StockMetadata) => void;
  isLoading?: boolean;
  readOnly?: boolean;
  className?: string;
}

export function MetadataCard({
  metadata,
  onChangeMetadata,
  isLoading = false,
  readOnly = false,
  className = "",
}: MetadataCardProps) {
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const titleLength = metadata?.title?.length || 0;
  const descLength = metadata?.description?.length || 0;

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    onChangeMetadata?.({
      ...metadata,
      title: e.target.value,
    });
  };

  const handleDescChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    onChangeMetadata?.({
      ...metadata,
      description: e.target.value,
    });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    onChangeMetadata?.({
      ...metadata,
      category: e.target.value,
    });
  };

  const handleKeywordsChange = (newKeywords: string[]) => {
    if (readOnly) return;
    onChangeMetadata?.({
      ...metadata,
      keywords: newKeywords,
    });
  };

  const handleCopyTitle = () => {
    if (!metadata.title) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(metadata.title);
      setCopiedTitle(true);
      setTimeout(() => setCopiedTitle(false), 2000);
      toast.success("Judul disalin ke clipboard");
    }
  };

  const handleCopyDesc = () => {
    if (!metadata.description) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(metadata.description);
      setCopiedDesc(true);
      setTimeout(() => setCopiedDesc(false), 2000);
      toast.success("Deskripsi disalin ke clipboard");
    }
  };

  const handleCopyAllMetadata = () => {
    const formatted = [
      `Title: ${metadata.title || ""}`,
      `Description: ${metadata.description || ""}`,
      `Category: ${metadata.category || ""}`,
      `Keywords: ${(metadata.keywords || []).join(", ")}`,
    ].join("\n\n");

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(formatted);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
      toast.success("Seluruh metadata disalin ke clipboard");
    }
  };

  return (
    <Card className={`border shadow-sm bg-card ${className}`}>
      <CardHeader className="pb-3 border-b">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">
              Metadata Microstock (IPTC)
            </CardTitle>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyAllMetadata}
            disabled={isLoading || (!metadata.title && !metadata.description)}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            {copiedAll ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                <span>Semua Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Salin Semua Metadata</span>
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Category section */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="metadata-category"
              className="flex items-center gap-1.5 text-xs font-medium text-foreground"
            >
              <Folder className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Kategori Utama</span>
            </label>
            {metadata.category && (
              <Badge variant="outline" className="text-xs font-normal">
                {metadata.category}
              </Badge>
            )}
          </div>
          <Input
            id="metadata-category"
            value={metadata.category || ""}
            onChange={handleCategoryChange}
            placeholder="Kategori (misal: Business, Technology, Nature)..."
            disabled={isLoading || readOnly}
            className="h-8 text-xs"
          />
        </div>

        {/* Title Section */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="metadata-title"
              className="flex items-center gap-1.5 text-xs font-medium text-foreground"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Judul Gambar (Title)</span>
            </label>
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] ${
                  titleLength > 150
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
                }`}
              >
                {titleLength} / 200 karakter
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopyTitle}
                disabled={!metadata.title}
                className="h-6 px-1.5 text-xs"
                title="Salin judul"
                aria-label="Salin judul gambar"
              >
                {copiedTitle ? (
                  <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
          <Input
            id="metadata-title"
            value={metadata.title || ""}
            onChange={handleTitleChange}
            placeholder="Judul deskriptif untuk agensi microstock..."
            disabled={isLoading || readOnly}
            className="text-xs font-medium"
          />
        </div>

        {/* Description Section */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="metadata-description"
              className="flex items-center gap-1.5 text-xs font-medium text-foreground"
            >
              <AlignLeft className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Deskripsi Gambar (Description)</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">
                {descLength} karakter
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopyDesc}
                disabled={!metadata.description}
                className="h-6 px-1.5 text-xs"
                title="Salin deskripsi"
                aria-label="Salin deskripsi gambar"
              >
                {copiedDesc ? (
                  <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
          <Textarea
            id="metadata-description"
            value={metadata.description || ""}
            onChange={handleDescChange}
            placeholder="Deskripsi rinci mengenai objek, suasana, komposisi, dan konsep..."
            disabled={isLoading || readOnly}
            rows={3}
            className="text-xs resize-y min-h-[70px]"
          />
        </div>

        {/* Embedded Keyword Chips */}
        <div className="pt-2 border-t">
          <KeywordChips
            keywords={metadata.keywords || []}
            onChangeKeywords={handleKeywordsChange}
            readOnly={isLoading || readOnly}
          />
        </div>
      </CardContent>
    </Card>
  );
}
