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
    keywords: [
      "makan",
      "restoran",
      "restaurant",
      "ayam",
      "nasi",
      "food",
      "cafe",
      "kopi",
      "warung",
      "bakery",
      "roti",
      "starbucks",
      "kopi kenangan",
      "tomoro",
      "fore coffee",
      "mixue",
      "kfc",
      "mcd",
      "mcdonald",
      "burger king",
      "hokben",
      "solaria",
      "pizza hut",
      "sate",
      "bakso",
    ],
  },
  {
    category: "Transport",
    keywords: [
      "gojek",
      "grab",
      "gocar",
      "goride",
      "grabbike",
      "grabcar",
      "bensin",
      "pertamina",
      "shell",
      "bp akr",
      "vivo",
      "spbu",
      "taxi",
      "parkir",
      "tol",
      "transjakarta",
      "mrt",
      "krl",
      "kereta",
      "commuter",
    ],
  },
  {
    category: "Shopping",
    keywords: [
      "indomaret",
      "alfamart",
      "alfamidi",
      "lawson",
      "circle k",
      "familymart",
      "supermarket",
      "minimarket",
      "hypermart",
      "transmart",
      "carrefour",
      "super indo",
      "lotte mart",
      "ranch market",
      "hero",
      "foodhall",
      "giant",
      "ramayana",
      "matahari",
      "mr diy",
      "gramedia",
      "ace hardware",
      "ikea",
      "tokopedia",
      "shopee",
      "lazada",
      "blibli",
      "bukalapak",
    ],
  },
  {
    category: "Bills",
    keywords: [
      "listrik",
      "internet",
      "wifi",
      "pln",
      "telkom",
      "indihome",
      "biznet",
      "first media",
      "pulsa",
      "paket data",
      "bpjs",
      "tagihan",
      "bill",
      "air pdam",
      "pdam",
      "token listrik",
    ],
  },
  {
    category: "Entertainment",
    keywords: [
      "bioskop",
      "cinema",
      "xxi",
      "cgv",
      "cinepolis",
      "netflix",
      "spotify",
      "disney",
      "youtube premium",
      "game",
      "steam",
      "playstation",
      "nintendo",
      "xbox",
      "konser",
      "karaoke",
      "timezone",
    ],
  },
];

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function classifyTransaction(text: string): Category {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalized) return "Other";

  for (const { category, keywords } of KEYWORD_MAP) {
    for (const kw of keywords) {
      const pattern = new RegExp(`(^|\\b)${escapeRegex(kw)}(\\b|$)`, "i");
      if (pattern.test(normalized)) return category;
    }
  }
  return "Other";
}
