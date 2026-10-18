"use client";

import * as React from "react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Plus, X, Check, Tags } from "lucide-react";
import { toast } from "sonner";

export interface KeywordChipsProps {
  keywords: string[];
  onChangeKeywords?: (newKeywords: string[]) => void;
  maxKeywords?: number;
  minKeywords?: number;
  readOnly?: boolean;
  className?: string;
}

export function KeywordChips({
  keywords = [],
  onChangeKeywords,
  maxKeywords = 50,
  minKeywords = 30,
  readOnly = false,
  className = "",
}: KeywordChipsProps) {
  const [newKeywordInput, setNewKeywordInput] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const count = keywords.length;
  const isOptimalCount = count >= minKeywords && count <= maxKeywords;
  const isOverMax = count > maxKeywords;

  // Add keyword handler (supports single or comma-separated pasting)
  const handleAddKeyword = () => {
    if (readOnly || !newKeywordInput.trim()) return;

    // Split by comma in case user pastes multiple tags
    const rawItems = newKeywordInput.split(",");
    const toAdd: string[] = [];

    for (const item of rawItems) {
      const clean = item.trim().toLowerCase();
      if (clean && !keywords.includes(clean) && !toAdd.includes(clean)) {
        toAdd.push(clean);
      }
    }

    if (toAdd.length > 0) {
      const updated = [...keywords, ...toAdd];
      onChangeKeywords?.(updated);
      setNewKeywordInput("");
      if (toAdd.length === 1) {
        toast.success(`Kata kunci "${toAdd[0]}" ditambahkan`);
      } else {
        toast.success(`${toAdd.length} kata kunci ditambahkan`);
      }
    } else {
      toast.info("Kata kunci sudah ada atau tidak valid");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  // Remove keyword handler
  const handleRemoveKeyword = (indexToRemove: number) => {
    if (readOnly) return;
    const removedItem = keywords[indexToRemove];
    const updated = keywords.filter((_, idx) => idx !== indexToRemove);
    onChangeKeywords?.(updated);
    toast.info(`Kata kunci "${removedItem}" dihapus`);
  };

  // Copy single keyword to clipboard
  const handleCopySingle = (kw: string, index: number) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(kw);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
      toast.success(`Kata kunci "${kw}" disalin`);
    }
  };

  // Copy all keywords comma-separated
  const handleCopyAll = () => {
    if (keywords.length === 0) {
      toast.info("Tidak ada kata kunci untuk disalin");
      return;
    }

    const commaSeparated = keywords.join(", ");
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(commaSeparated);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
      toast.success(`${keywords.length} kata kunci disalin ke clipboard`);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header with counter badge and Copy All button */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Tags className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Kata Kunci (Keywords)
          </span>
          <Badge
            variant={
              isOverMax
                ? "destructive"
                : isOptimalCount
                ? "default"
                : "secondary"
            }
            className="text-xs font-semibold"
          >
            {`${count} / ${maxKeywords}`}
          </Badge>
          {!isOptimalCount && !isOverMax && count > 0 && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              (Disarankan {minKeywords}-{maxKeywords} kata kunci)
            </span>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopyAll}
          disabled={keywords.length === 0}
          className="h-8 gap-1.5 text-xs font-medium"
        >
          {copiedAll ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              <span>Tersalin!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Salin Semua ({count})</span>
            </>
          )}
        </Button>
      </div>

      {/* Add new keyword input bar */}
      {!readOnly && (
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Tambah kata kunci baru (bisa dipisah koma)..."
            value={newKeywordInput}
            onChange={(e) => setNewKeywordInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 text-xs"
            aria-label="Input kata kunci baru"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleAddKeyword}
            disabled={!newKeywordInput.trim()}
            className="h-8 px-3 gap-1 text-xs shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tambah</span>
          </Button>
        </div>
      )}

      {/* Chips container */}
      <div className="flex flex-wrap gap-1.5 min-h-[48px] max-h-56 overflow-y-auto p-2 border rounded-md bg-muted/20">
        {keywords.length === 0 ? (
          <div className="w-full flex items-center justify-center py-3 text-xs text-muted-foreground">
            Belum ada kata kunci. Tambahkan manual atau generate gambar/metadata.
          </div>
        ) : (
          keywords.map((kw, index) => {
            const isJustCopied = copiedIndex === index;
            return (
              <Badge
                key={`${kw}-${index}`}
                variant="secondary"
                className="group flex items-center gap-1 px-2.5 py-1 text-xs font-normal border bg-background hover:bg-accent transition-colors"
              >
                <button
                  type="button"
                  onClick={() => handleCopySingle(kw, index)}
                  className="flex items-center gap-1 hover:text-primary focus:outline-none focus:underline"
                  title="Klik untuk menyalin kata kunci"
                  aria-label={`Salin kata kunci ${kw}`}
                >
                  {isJustCopied ? (
                    <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                  ) : (
                    <span>{kw}</span>
                  )}
                </button>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveKeyword(index);
                    }}
                    className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    title={`Hapus kata kunci ${kw}`}
                    aria-label={`Hapus kata kunci ${kw}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            );
          })
        )}
      </div>
    </div>
  );
}
