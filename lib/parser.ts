import { extractReceiptHybrid } from "@/lib/extractor";

export type ParsedReceipt = {
  total: number | null;
  date: Date | null;
  merchant: string | null;
  products: string[];
  confidence: number;
  editable: boolean;
};

/**
 * Hybrid receipt parser: normalization + scoring heuristics + fallbacks.
 */
export function parseReceiptText(rawText: string): ParsedReceipt {
  const extracted = extractReceiptHybrid(rawText || "");

  return {
    total: extracted.total,
    date: extracted.date ? new Date(extracted.date) : null,
    merchant: extracted.merchant,
    // Product extraction intentionally empty in this revision.
    products: [],
    confidence: extracted.confidence,
    editable: extracted.editable,
  };
}
