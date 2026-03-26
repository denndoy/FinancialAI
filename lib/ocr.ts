import { createWorker } from "tesseract.js";

export type OcrResult = {
  text: string;
  confidence: number;
};

/**
 * Normalize OCR output: lowercase, strip noisy characters.
 */
export function normalizeOcrText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\w\s\d.,:/\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Run Tesseract on image buffer (Node.js runtime only — not Edge).
 */
export async function runOcr(imageBuffer: Buffer): Promise<OcrResult> {
  const worker = await createWorker("eng+ind");
  try {
    const ret = await worker.recognize(imageBuffer);
    const text = normalizeOcrText(ret.data.text);
    return {
      text,
      confidence: typeof ret.data.confidence === "number" ? ret.data.confidence : 0,
    };
  } finally {
    await worker.terminate();
  }
}
