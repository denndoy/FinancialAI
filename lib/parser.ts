import { parseISO, isValid } from "date-fns";
import { INDONESIAN_RECEIPT_PARSER_CONFIG as CFG } from "@/lib/receipt-parser-config";

export type ParsedReceipt = {
  total: number | null;
  date: Date | null;
  merchant: string | null;
  products: string[];
};

/**
 * Flexible receipt parsing — heuristics only, no strict format.
 */
export function parseReceiptText(rawText: string): ParsedReceipt {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const merchant = extractMerchant(lines, rawText);
  const products = extractProductDescriptions(lines);
  const date = extractDate(rawText);
  const total = extractReceiptTotal(lines, rawText);

  return { total, date, merchant, products };
}

function extractMerchant(lines: string[], rawText: string): string | null {
  const brand = detectStoreBrand(rawText);
  if (brand) return brand;

  const addressLine = extractAddressLine(lines);
  if (addressLine) return addressLine;

  // Filter out product lines and find a clean merchant name
  for (const line of lines.slice(0, 12)) {
    const normalized = line.toLowerCase();
    
    // Skip short lines or lines with excessive numbers (likely product codes)
    if (normalized.length < 3) continue;
    if (/\d{2,}/.test(normalized)) continue;
    
    // Skip lines with merchant noise tokens
    if (CFG.merchantNoiseTokens.some((token) => normalized.includes(token))) continue;
    
    // Skip lines that match merchant line rejection patterns
    if (CFG.merchantLineRejectPatterns.some((re) => re.test(line))) continue;
    
    // Skip lines that look like product/item lines
    if (CFG.productLinePatterns.some((re) => re.test(line))) continue;
    
    // Skip lines that are mostly pricing or quantities
    if (/(^|\s)\d+[.,]\d{2,}\s*(x|qty|pcs|pry|pri|sub)/i.test(line)) continue;
    
    return line;
  }

  return lines[0] ?? null;
}

function detectStoreBrand(text: string): string | null {
  for (const brand of CFG.storeBrands) {
    if (brand.patterns.some((pattern) => pattern.test(text))) {
      return brand.name;
    }
  }

  return null;
}

/**
 * Extract product descriptions from receipt lines.
 * Identifies lines that likely represent items purchased.
 */
function extractProductDescriptions(lines: string[]): string[] {
  const products: string[] = [];
  let inProductSection = false;
  let lastWasProductLine = false;

  for (const line of lines) {
    const normalized = line.toLowerCase();
    
    // Skip very short lines
    if (line.length < 3) continue;
    
    // Skip known total/footer lines
    if (CFG.explicitTotalLabels.some((label) => normalized.includes(label.toLowerCase()))) {
      inProductSection = false;
      lastWasProductLine = false;
      break;
    }
    
    // Skip merchant lines (brand, address, header info)
    if (CFG.addressHints.some((re) => re.test(line))) continue;
    if (CFG.merchantLineRejectPatterns.some((re) => re.test(line))) continue;
    if (CFG.storeBrands.some((b) => b.patterns.some((p) => p.test(line)))) continue;
    
    // Skip cash/change/payment lines
    if (CFG.cashLabels.some((label) => normalized.includes(label.toLowerCase()))) continue;
    if (CFG.changeLabels.some((label) => normalized.includes(label.toLowerCase()))) continue;
    
    // Skip date/time lines
    if (/\d{1,2}[:\/\-]\d{1,2}[:\/\-]\d{2,4}/i.test(line)) continue;
    
    // Skip lines that are purely numbers (likely amounts)
    if (/^[\d.,\s]+$/.test(line)) continue;
    
    // Detect product lines: contain product name followed by quantity/price info
    const isProductLine = /qty|qt|pcs|x\s*\d/i.test(line) ||
                          /\bpri?\b.*\d|\bsub\b/i.test(line) ||
                          CFG.productLinePatterns.some((re) => re.test(line));
    
    if (isProductLine) {
      // Extract just the product name (before qty/price markers)
      const productName = line
        .replace(/\s*(qty|qt|q:|pcs|pry:|pri:|sub:|x\s*\d+).*/i, '')
        .replace(/\s*\d+[.,]\d{2,}.*$/i, '')
        .trim();
      
      if (productName && productName.length > 2 && !products.includes(productName)) {
        products.push(productName);
      }
      
      inProductSection = true;
      lastWasProductLine = true;
    } else if (inProductSection && lastWasProductLine && line.length < 30) {
      // Lines that follow product lines might be quantity/price info
      lastWasProductLine = false;
    } else if (!inProductSection && line.length < 50) {
      // Could be a product name without quantity marker yet
      // Look ahead for typical product patterns
      lastWasProductLine = false;
    }
  }

  return products;
}

function extractAddressLine(lines: string[]): string | null {
  for (const line of lines) {
    if (CFG.addressHints.some((re) => re.test(line))) {
      return line;
    }
  }
  return null;
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
  const candidates = extractAmounts(text);
  if (candidates.length === 0) return null;
  return Math.max(...candidates);
}

function extractReceiptTotal(lines: string[], rawText: string): number | null {
  // Focus on footer section only (last 15 lines where total/cash/change always appear)
  const footerStart = Math.max(0, lines.length - 15);
  const footerLines = lines.slice(footerStart);
  const footerText = footerLines.join('\n');

  // Strategy 1: Explicit label extraction from footer only
  const labeled = extractAmountAfterLabels(footerText, CFG.explicitTotalLabels);
  if (labeled !== null) {
    return labeled;
  }

  // Strategy 2: If cash and change are available, derive payable total
  const cash = findAmountByTokens(footerLines, CFG.cashLabels, CFG.changeLabels);
  const change = findAmountByTokens(footerLines, CFG.changeLabels, []);
  if (cash !== null && change !== null && cash > change) {
    const inferred = cash - change;
    if (inferred > 0) return inferred;
  }

  // Strategy 3: Find by total keywords in footer
  const byTotalKeyword = findAmountByTokens(footerLines, CFG.totalIncludeLabels, CFG.totalExcludeLabels);
  if (byTotalKeyword !== null) {
    return byTotalKeyword;
  }

  // Strategy 4: Extract all amounts from footer and use heuristics
  const amounts = extractAmounts(footerText)
    .map((n) => Math.round(n * 100) / 100)
    .sort((a, b) => b - a);
  if (amounts.length === 0) return null;

  // Infer payable total from pair differences among footer amounts
  const inferredFromPairs = inferTotalFromAmountDifferences(amounts);
  if (inferredFromPairs !== null) {
    return inferredFromPairs;
  }

  // If highest amount looks like cash, use next largest as total
  if (cash !== null && Math.abs(amounts[0] - cash) < 1 && amounts.length > 1) {
    return amounts[1];
  }

  // Prefer amounts under 100K to avoid picking huge cash amounts
  const underHundredK = amounts.filter((n) => n <= 100_000);
  if (underHundredK.length > 0) {
    return underHundredK[underHundredK.length - 1] > 0
      ? underHundredK[underHundredK.length - 1]
      : underHundredK[0];
  }

  // Last resort: use largest amount from footer
  return amounts[amounts.length - 1] ?? amounts[0];
}

function extractAmounts(text: string): number[] {
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
      if (n !== null && n >= CFG.minAmount && n < CFG.maxAmount) candidates.push(n);
    }
  }

  return candidates;
}

function findAmountByTokens(
  lines: string[],
  includeTokens: string[],
  excludeTokens: string[]
): number | null {
  for (let i = 0; i < lines.length; i += 1) {
    const normalized = lines[i].toLowerCase();
    if (!includeTokens.some((token) => normalized.includes(token))) continue;
    if (excludeTokens.some((token) => normalized.includes(token))) continue;

    const fromCurrent = extractLargestAmount(lines[i]);
    if (fromCurrent !== null) return fromCurrent;

    // Some OCR outputs place label and nominal on separate lines.
    if (i + 1 < lines.length) {
      const fromNext = extractLargestAmount(lines[i + 1]);
      if (fromNext !== null) return fromNext;
    }
  }
  return null;
}

function extractAmountAfterLabels(text: string, labels: string[]): number | null {
  const escaped = labels.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const labelPattern = escaped.join("|");
  const re = new RegExp(
    `(?:${labelPattern})\\s*[:=\\-]?\\s*([0-9][0-9.,]{0,20})`,
    "gi"
  );

  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const parsed = parseMoneyToken(m[1]);
    if (parsed !== null && parsed >= CFG.minAmount) return parsed;
  }

  return null;
}

function inferTotalFromAmountDifferences(amountsDesc: number[]): number | null {
  if (amountsDesc.length < 3) return null;

  const rounded = Array.from(new Set(amountsDesc.map((n) => Math.round(n)))).sort((a, b) => b - a);
  const score = new Map<number, number>();

  for (let i = 0; i < rounded.length; i += 1) {
    for (let j = i + 1; j < rounded.length; j += 1) {
      const diff = rounded[i] - rounded[j];
      if (diff <= 0) continue;
      if (!rounded.includes(diff)) continue;
      score.set(diff, (score.get(diff) ?? 0) + 1);
    }
  }

  if (score.size === 0) return null;

  const sorted = Array.from(score.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0] - b[0];
  });

  return sorted[0]?.[0] ?? null;
}

function parseMoneyToken(token: string): number | null {
  const t = token.trim();
  if (!t) return null;

  const clean = t.replace(/[^\d.,-]/g, "");
  if (!clean) return null;

  let normalized = clean;

  const hasComma = clean.includes(",");
  const hasDot = clean.includes(".");

  if (hasComma && hasDot) {
    const lastComma = clean.lastIndexOf(",");
    const lastDot = clean.lastIndexOf(".");
    if (lastComma > lastDot) {
      normalized = clean.replace(/\./g, "").replace(/,/g, ".");
    } else {
      normalized = clean.replace(/,/g, "");
    }
  } else if (hasDot) {
    if (/^\d{1,3}(?:\.\d{3})+$/.test(clean)) {
      normalized = clean.replace(/\./g, "");
    } else if (/^\d+\.\d{1,2}$/.test(clean)) {
      normalized = clean;
    } else {
      normalized = clean.replace(/\./g, "");
    }
  } else if (hasComma) {
    if (/^\d{1,3}(?:,\d{3})+$/.test(clean)) {
      normalized = clean.replace(/,/g, "");
    } else if (/^\d+,\d{1,2}$/.test(clean)) {
      normalized = clean.replace(/,/g, ".");
    } else {
      normalized = clean.replace(/,/g, "");
    }
  }

  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}
