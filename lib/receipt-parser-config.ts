export type ReceiptParserConfig = {
  storeBrands: Array<{
    name: string;
    patterns: RegExp[];
  }>;
  merchantNoiseTokens: string[];
  merchantLineRejectPatterns: RegExp[];
  productLinePatterns: RegExp[];
  addressHints: RegExp[];
  explicitTotalLabels: string[];
  totalIncludeLabels: string[];
  totalExcludeLabels: string[];
  cashLabels: string[];
  changeLabels: string[];
  minAmount: number;
  maxAmount: number;
};

export const INDONESIAN_RECEIPT_PARSER_CONFIG: ReceiptParserConfig = {
  storeBrands: [
    {
      name: "Indomaret",
      patterns: [/indomaret/i, /indomrt/i, /indomar[e3]t/i, /indomaret\.co\.id/i],
    },
    {
      name: "Alfamart",
      patterns: [/alfamart/i, /alfa\s*mart/i],
    },
    {
      name: "Alfamidi",
      patterns: [/alfamidi/i],
    },
    {
      name: "Lawson",
      patterns: [/lawson/i],
    },
    {
      name: "Circle K",
      patterns: [/circle\s*k/i, /circlek/i],
    },
    {
      name: "FamilyMart",
      patterns: [/family\s*mart/i, /familymart/i],
    },
    {
      name: "Yomart",
      patterns: [/yomart/i],
    },
    {
      name: "Sumber Alfaria Trijaya",
      patterns: [/alfaria\s*trijaya/i],
    },
    {
      name: "Super Indo",
      patterns: [/super\s*indo/i, /superindo/i],
    },
    {
      name: "Hypermart",
      patterns: [/hypermart/i],
    },
    {
      name: "Transmart",
      patterns: [/transmart/i, /carrefour/i],
    },
    {
      name: "Lotte Mart",
      patterns: [/lotte\s*mart/i, /lottemart/i],
    },
    {
      name: "Ranch Market",
      patterns: [/ranch\s*market/i, /farmers\s*market/i],
    },
    {
      name: "Hero",
      patterns: [/hero\s*supermarket/i, /\bhero\b/i],
    },
    {
      name: "The FoodHall",
      patterns: [/food\s*hall/i, /the\s*foodhall/i],
    },
    {
      name: "Giant",
      patterns: [/\bgiant\b/i],
    },
    {
      name: "Tip Top",
      patterns: [/tip\s*top/i],
    },
    {
      name: "Hari Hari",
      patterns: [/hari\s*hari/i],
    },
    {
      name: "Ramayana",
      patterns: [/ramayana/i],
    },
    {
      name: "Matahari",
      patterns: [/matahari/i],
    },
    {
      name: "Yogya",
      patterns: [/\byogya\b/i, /yogya\s*group/i],
    },
    {
      name: "Borma",
      patterns: [/\bborma\b/i],
    },
    {
      name: "GS The Fresh",
      patterns: [/gs\s*the\s*fresh/i],
    },
    {
      name: "AEON",
      patterns: [/\baeon\b/i],
    },
    {
      name: "GrandLucky",
      patterns: [/grand\s*lucky/i, /grandlucky/i],
    },
    {
      name: "Pepito",
      patterns: [/\bpepito\b/i],
    },
    {
      name: "Nirmala",
      patterns: [/nirmala/i],
    },
    {
      name: "Pertamina",
      patterns: [/pertamina/i, /\bspbu\b/i, /mypertamina/i],
    },
    {
      name: "Shell",
      patterns: [/\bshell\b/i],
    },
    {
      name: "BP AKR",
      patterns: [/bp\s*akr/i],
    },
    {
      name: "Vivo",
      patterns: [/\bvivo\b/i],
    },
    {
      name: "AKR",
      patterns: [/\bakr\b/i],
    },
    {
      name: "Guardian",
      patterns: [/\bguardian\b/i],
    },
    {
      name: "Watsons",
      patterns: [/\bwatsons\b/i],
    },
    {
      name: "Century",
      patterns: [/century\s*healthcare/i, /\bcentury\b/i],
    },
    {
      name: "Kimia Farma",
      patterns: [/kimia\s*farma/i],
    },
    {
      name: "K24",
      patterns: [/apotek\s*k\s*24/i, /\bk\s*24\b/i],
    },
    {
      name: "Apotek Roxy",
      patterns: [/apotek\s*roxy/i],
    },
    {
      name: "Apotek Viva Generik",
      patterns: [/viva\s*generik/i],
    },
    {
      name: "Gramedia",
      patterns: [/gramedia/i],
    },
    {
      name: "Ace Hardware",
      patterns: [/ace\s*hardware/i],
    },
    {
      name: "MR DIY",
      patterns: [/mr\.?\s*diy/i, /mrdiy/i],
    },
    {
      name: "IKEA",
      patterns: [/\bikea\b/i],
    },
    {
      name: "Starbucks",
      patterns: [/starbucks/i],
    },
    {
      name: "Kopi Kenangan",
      patterns: [/kopi\s*kenangan/i],
    },
    {
      name: "Tomoro Coffee",
      patterns: [/tomoro/i],
    },
    {
      name: "Fore Coffee",
      patterns: [/fore\s*coffee/i],
    },
  ],
  merchantNoiseTokens: [
    "total",
    "subtotal",
    "tax",
    "date",
    "cash",
    "change",
    "payment",
    "invoice",
    "qty",
    "q:",
    "ppn",
    "dpp",
    "kembali",
    "tunai",
    "debit",
    "kredit",
    "layanan konsumen",
    "pry:",
    "pri:",
    "sub:",
    "remark:",
    "item",
    "code",
    "barcode",
  ],
  merchantLineRejectPatterns: [
    /npwp/i,
    /promo/i,
    /struk/i,
    /trx/i,
    /kasir/i,
    /kontak/i,
    /customer service/i,
    /\d{2,}[/:.-]\d{2,}/,
  ],
  // Patterns to detect product/item lines (should be excluded from merchant)
  productLinePatterns: [
    /qty\s*[:=]?\s*\d+/i,
    /qt\s*[:=]?\s*\d+/i,
    /q\s*[:=]?\s*\d+/i,
    /x\s*\d+/i,
    /pcs/i,
    /\bpri?\b.*\d/i,
    /\bsubtotal\b/i,
    /\bsub\b.*\d/i,
    /harga satuan/i,
    /harga\s+jual/i,
    /((\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))|(\d+[.,]\d{2}))\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|rp)/i,
  ],
  addressHints: [/\b(jl\.?|jalan)\b/i, /\bkel\b/i, /\bkec\b/i, /surabaya|jakarta|bandung|medan|bekasi|depok|tangerang/i],
  explicitTotalLabels: [
    "harga jual",
    "total belanja",
    "grand total",
    "total bayar",
    "amount due",
    "amount",
    "total amount",
    "net total",
    "amount paid",
    "jumlah",
    "total",
  ],
  totalIncludeLabels: [
    "total",
    "grand total",
    "jumlah",
    "total bayar",
    "total belanja",
    "harga jual",
    "amount due",
    "amount",
    "total amount",
    "net total",
  ],
  totalExcludeLabels: [
    "subtotal",
    "sub total",
    "tunai",
    "cash",
    "kembali",
    "change",
    "debit",
    "kredit",
    "service",
    "tax",
    "vat",
  ],
  cashLabels: ["tunai", "cash", "bayar", "payment", "paid", "amount paid", "debit", "kredit"],
  changeLabels: ["kembali", "change", "refund"],
  minAmount: 100,
  maxAmount: 1_000_000_000,
};
