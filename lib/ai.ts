/**
 * Keyword-based transaction classification.
 * Replace this module with an ML model later — keep the same `classifyTransaction` signature.
 */

export type Category =
  | "Food"
  | "Transport"
  | "Shopping"
  | "Bills"
  | "Entertainment"
  | "Other";

const KEYWORD_MAP: { category: Category; keywords: string[] }[] = [
  {
    category: "Food",
    keywords: ["makan", "restoran", "ayam", "nasi", "food", "cafe", "kopi", "warung"],
  },
  {
    category: "Transport",
    keywords: ["gojek", "grab", "bensin", "pertamina", "shell", "taxi", "parkir", "tol"],
  },
  {
    category: "Shopping",
    keywords: ["indomaret", "alfamart", "hypermart", "supermarket", "minimarket"],
  },
  {
    category: "Bills",
    keywords: ["listrik", "internet", "pln", "telkom", "pulsa", "tagihan"],
  },
  {
    category: "Entertainment",
    keywords: ["bioskop", "netflix", "spotify", "game", "steam", "konser"],
  },
];

export function classifyTransaction(text: string): Category {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalized) return "Other";

  for (const { category, keywords } of KEYWORD_MAP) {
    for (const kw of keywords) {
      if (normalized.includes(kw)) return category;
    }
  }
  return "Other";
}
