export type NormalizedReceiptText = {
  cleanText: string;
  lines: string[];
  rawLines: string[];
};

function fixCommonOcrMistakes(text: string): string {
  return text
    .toLowerCase()
    // 0 -> o only inside words
    .replace(/(?<=[a-z])0(?=[a-z])/g, "o")
    // l -> 1 when surrounded by numeric context
    .replace(/(?<=\d)l(?=\d)|\bl(?=\d)|(?<=\d)l\b/g, "1");
}

function stripUnsupportedCharacters(text: string): string {
  // Keep letters, digits, whitespace, and separators used by amounts/dates.
  return text.replace(/[^a-z0-9\s.,/\-]/g, " ");
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function normalizeLine(line: string): string {
  return normalizeWhitespace(stripUnsupportedCharacters(fixCommonOcrMistakes(line))).trim();
}

export function normalizeReceiptText(rawText: string): NormalizedReceiptText {
  const rawLines = (rawText || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const lines = rawLines.map(normalizeLine).filter((line) => line.length > 0);
  const cleanText = lines.join("\n");

  return {
    cleanText,
    lines,
    rawLines,
  };
}
