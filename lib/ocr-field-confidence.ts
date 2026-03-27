import type { ParsedReceipt } from "@/lib/parser";

export type FieldConfidenceLevel = "high" | "medium" | "low";

export type FieldConfidence = {
  score: number;
  level: FieldConfidenceLevel;
};

export type ReceiptFieldConfidence = {
  amount: FieldConfidence;
  date: FieldConfidence;
  merchant: FieldConfidence;
  category: FieldConfidence;
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function toLevel(score: number): FieldConfidenceLevel {
  if (score >= 0.75) return "high";
  if (score >= 0.45) return "medium";
  return "low";
}

function buildConfidence(score: number): FieldConfidence {
  const safeScore = Math.round(clamp(score) * 100) / 100;
  return {
    score: safeScore,
    level: toLevel(safeScore),
  };
}

export function estimateReceiptFieldConfidence(input: {
  parsed: ParsedReceipt;
  category: string;
  ocrText: string;
  ocrConfidence: number;
}): ReceiptFieldConfidence {
  const { parsed, category, ocrText, ocrConfidence } = input;
  const normalizedText = (ocrText || "").toLowerCase();
  const base = clamp(ocrConfidence || 0);

  const hasTotalToken = /(total|grand\s*total|jumlah|total\s*bayar|harga\s*jual|amount\s*due)/i.test(
    normalizedText
  );
  const hasDateToken = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/i.test(
    normalizedText
  );
  const merchantMentioned =
    !!parsed.merchant && normalizedText.includes(parsed.merchant.toLowerCase().trim());

  const amountScore = parsed.total !== null ? base * (hasTotalToken ? 1 : 0.72) : 0.2;
  const dateScore = parsed.date ? base * (hasDateToken ? 0.95 : 0.7) : 0.2;
  const merchantScore = parsed.merchant ? base * (merchantMentioned ? 0.95 : 0.68) : 0.2;
  const categoryScore = category && category !== "Other" ? base * 0.85 : base * 0.5;

  return {
    amount: buildConfidence(amountScore),
    date: buildConfidence(dateScore),
    merchant: buildConfidence(merchantScore),
    category: buildConfidence(categoryScore),
  };
}
