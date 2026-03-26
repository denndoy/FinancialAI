import { parseISO, isValid } from "date-fns";

export type ParsedReceipt = {
  total: number | null;
  date: Date | null;
  merchant: string | null;
};

/**
 * Flexible receipt parsing — heuristics only, no strict format.
 */
export function parseReceiptText(rawText: string): ParsedReceipt {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const merchant = lines[0] ?? null;

  const date = extractDate(rawText);
  const total = extractLargestAmount(rawText);

  return { total, date, merchant };
}

function extractDate(text: string): Date | null {
  const patterns = [
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/g,
    /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/g,
  ];

  for (const re of patterns) {
    let m: RegExpExecArray | null;
    const copy = new RegExp(re.source, re.flags);
    while ((m = copy.exec(text)) !== null) {
      let candidate: Date | null = null;
      if (re.source.startsWith("\\b(\\d{4})")) {
        const y = Number(m[1]);
        const mo = Number(m[2]) - 1;
        const d = Number(m[3]);
        candidate = new Date(y, mo, d);
      } else {
        const a = Number(m[1]);
        const b = Number(m[2]);
        const c = Number(m[3]);
        const year = c < 100 ? 2000 + c : c;
        if (year > 31 && a <= 12 && b <= 31) {
          candidate = new Date(year, a - 1, b);
        } else if (a <= 31 && b <= 12) {
          candidate = new Date(year, b - 1, a);
        }
      }
      if (candidate && isValid(candidate) && !Number.isNaN(candidate.getTime())) {
        return candidate;
      }
    }
  }

  const iso = text.match(/\d{4}-\d{2}-\d{2}/);
  if (iso) {
    const d = parseISO(iso[0]);
    if (isValid(d)) return d;
  }

  return null;
}

/**
 * Collect numeric tokens that look like currency amounts; pick the largest as total.
 */
function extractLargestAmount(text: string): number | null {
  const candidates: number[] = [];

  const patterns: RegExp[] = [
    /\b(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))\b/g,
    /\b(\d+[.,]\d{2})\b/g,
    /\b(\d{4,})\b/g,
  ];

  for (const re of patterns) {
    let m: RegExpExecArray | null;
    const copy = new RegExp(re.source, re.flags);
    while ((m = copy.exec(text)) !== null) {
      const n = parseMoneyToken(m[1]);
      if (n !== null && n > 0 && n < 1_000_000_000) candidates.push(n);
    }
  }

  if (candidates.length === 0) return null;
  return Math.max(...candidates);
}

function parseMoneyToken(token: string): number | null {
  const t = token.trim();
  if (!t) return null;

  if (/^\d{4,}$/.test(t.replace(/[.,]/g, ""))) {
    const digits = t.replace(/\D/g, "");
    if (digits.length >= 4) {
      const asInt = parseInt(digits, 10);
      if (!Number.isNaN(asInt)) return asInt;
    }
  }

  const lastComma = t.lastIndexOf(",");
  const lastDot = t.lastIndexOf(".");
  let normalized = t;

  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      normalized = t.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = t.replace(/,/g, "");
    }
  } else if (lastComma > -1 && t.split(",").length === 2) {
    normalized = t.replace(",", ".");
  } else if (lastDot > -1 && t.split(".").length > 2) {
    normalized = t.replace(/\./g, "");
  }

  const n = parseFloat(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}
