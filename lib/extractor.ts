import { normalizeReceiptText } from "@/lib/normalizer";

export type HybridReceiptOutput = {
  merchant: string;
  total: number | null;
  date: string | null;
  confidence: number;
  editable: true;
  numbers: number[];
};

type TotalMethod = "keyword" | "fallback" | "none";

type TotalCandidate = {
  value: number;
  index: number;
  keywordHit: boolean;
};

const TOTAL_KEYWORDS = ["total", "total belanja", "grand total", "amount", "jumlah"];
const MERCHANT_NOISE_KEYWORDS = ["total", "cash", "change", "tax", "date", "time"];

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function parseNumericTokenToInt(token: string): number | null {
  const digitsOnly = token.replace(/[^\d]/g, "");
  if (!digitsOnly) return null;
  const parsed = Number.parseInt(digitsOnly, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractNumbersFromText(text: string): number[] {
  const matches = text.match(/\d[\d.,]{0,18}\d|\d/g) ?? [];
  const parsed = matches
    .map(parseNumericTokenToInt)
    .filter((n): n is number => n !== null)
    .filter((n) => n >= 100 && n <= 10_000_000);

  return Array.from(new Set(parsed));
}

function extractNumbersFromLine(line: string): number[] {
  return extractNumbersFromText(line);
}

function lineContainsTotalKeyword(line: string): boolean {
  return TOTAL_KEYWORDS.some((keyword) => line.includes(keyword));
}

function scoreTotalCandidate(
  candidate: TotalCandidate,
  maxNumber: number | null,
  lineCount: number
): number {
  let score = 0;
  if (candidate.keywordHit) score += 3;
  if (candidate.index >= Math.floor(lineCount * 0.65)) score += 2;
  if (maxNumber !== null && candidate.value === maxNumber) score += 1;
  return score;
}

function detectTotal(lines: string[], numbers: number[]): { total: number | null; method: TotalMethod } {
  const candidates: TotalCandidate[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!lineContainsTotalKeyword(line)) continue;

    const currentLineNumbers = extractNumbersFromLine(line);
    if (currentLineNumbers.length > 0) {
      for (const value of currentLineNumbers) {
        candidates.push({ value, index: i, keywordHit: true });
      }
      continue;
    }

    if (i + 1 < lines.length) {
      const nextNumbers = extractNumbersFromLine(lines[i + 1]);
      for (const value of nextNumbers) {
        candidates.push({ value, index: i + 1, keywordHit: true });
      }
    }

    if (i - 1 >= 0) {
      const prevNumbers = extractNumbersFromLine(lines[i - 1]);
      for (const value of prevNumbers) {
        candidates.push({ value, index: i - 1, keywordHit: true });
      }
    }
  }

  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : null;

  if (candidates.length === 0) {
    return { total: maxNumber, method: maxNumber !== null ? "fallback" : "none" };
  }

  candidates.sort((a, b) => {
    const scoreA = scoreTotalCandidate(a, maxNumber, lines.length);
    const scoreB = scoreTotalCandidate(b, maxNumber, lines.length);
    if (scoreB !== scoreA) return scoreB - scoreA;
    if (b.value !== a.value) return b.value - a.value;
    return b.index - a.index;
  });

  return { total: candidates[0]?.value ?? null, method: "keyword" };
}

function hasAnyNumber(line: string): boolean {
  return /\d/.test(line);
}

function isLikelyUppercase(line: string): boolean {
  const letters = line.replace(/[^a-zA-Z]/g, "");
  if (!letters) return false;
  return letters === letters.toUpperCase();
}

function countWords(line: string): number {
  return line.trim().split(/\s+/).filter(Boolean).length;
}

function detectMerchant(rawLines: string[]): { merchant: string; fromTopLine: boolean } {
  const topLines = rawLines.slice(0, 5);

  let best: { line: string; score: number } | null = null;

  for (const rawLine of topLines) {
    const line = rawLine.trim();
    if (!line) continue;

    const lower = line.toLowerCase();
    if (hasAnyNumber(line)) continue;
    if (MERCHANT_NOISE_KEYWORDS.some((kw) => lower.includes(kw))) continue;

    let score = 0;
    if (isLikelyUppercase(line)) score += 2;

    const words = countWords(line);
    if (words >= 1 && words <= 3) score += 1;
    if (!hasAnyNumber(line)) score += 1;

    if (!best || score > best.score) {
      best = { line, score };
    }
  }

  if (!best) return { merchant: "Unknown", fromTopLine: false };
  return { merchant: best.line, fromTopLine: true };
}

function toIsoDate(y: number, m: number, d: number): string | null {
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function detectDate(text: string): string | null {
  const ddmmyyyy = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b|\b(\d{1,2})-(\d{1,2})-(\d{4})\b/);
  if (ddmmyyyy) {
    const day = Number(ddmmyyyy[1] || ddmmyyyy[4]);
    const month = Number(ddmmyyyy[2] || ddmmyyyy[5]);
    const year = Number(ddmmyyyy[3] || ddmmyyyy[6]);
    const iso = toIsoDate(year, month, day);
    if (iso) return iso;
  }

  const yyyymmdd = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (yyyymmdd) {
    const year = Number(yyyymmdd[1]);
    const month = Number(yyyymmdd[2]);
    const day = Number(yyyymmdd[3]);
    const iso = toIsoDate(year, month, day);
    if (iso) return iso;
  }

  return null;
}

function computeConfidence(input: {
  totalMethod: TotalMethod;
  hasMerchantTopLine: boolean;
  hasDate: boolean;
}): number {
  let score = 0;
  if (input.totalMethod === "keyword") score += 0.4;
  if (input.totalMethod === "fallback") score += 0.2;
  if (input.hasMerchantTopLine) score += 0.3;
  if (input.hasDate) score += 0.1;
  return Math.round(clamp(score) * 100) / 100;
}

export function extractReceiptHybrid(rawText: string): HybridReceiptOutput {
  const normalized = normalizeReceiptText(rawText);
  const numbers = extractNumbersFromText(normalized.cleanText);

  const { total, method } = detectTotal(normalized.lines, numbers);
  const { merchant, fromTopLine } = detectMerchant(normalized.rawLines);
  const date = detectDate(normalized.cleanText);

  const confidence = computeConfidence({
    totalMethod: method,
    hasMerchantTopLine: fromTopLine && merchant !== "Unknown",
    hasDate: Boolean(date),
  });

  return {
    merchant,
    total,
    date,
    confidence,
    editable: true,
    numbers,
  };
}
