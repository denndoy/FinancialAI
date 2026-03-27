import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import sharp from "sharp";
import { authOptions } from "@/lib/auth";
import { classifyTransaction } from "@/lib/ai";
import { uploadReceiptImage } from "@/lib/azure";
import { estimateReceiptFieldConfidence } from "@/lib/ocr-field-confidence";
import { runOcrFromBuffer, runOcrFromImageUrl } from "@/lib/ocr";
import { parseReceiptText } from "@/lib/parser";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 1_000_000;

async function ensureUnderMaxSize(buffer: Buffer): Promise<Buffer> {
  if (buffer.length <= MAX_BYTES) return buffer;
  const out = await sharp(buffer)
    .rotate()
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
  return Buffer.from(out) as Buffer;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file field `file`" }, { status: 400 });
    }

    const buffer = await ensureUnderMaxSize(
      Buffer.from(await file.arrayBuffer()) as Buffer
    );

    const contentType = file.type || "image/jpeg";
    const filename = file.name || "receipt.jpg";

    let imageUrl: string;
    try {
      imageUrl = await uploadReceiptImage(buffer, contentType, filename);
    } catch (e) {
      console.error("Azure upload failed", e);
      return NextResponse.json(
        { error: "Image upload failed. Check Azure storage configuration.", fallback: true },
        { status: 502 }
      );
    }

    let ocrText = "";
    let ocrConfidence = 0;
    let ocrError: string | null = null;

    try {
      const ocr = await runOcrFromImageUrl(imageUrl);
      ocrText = ocr.text;
      ocrConfidence = ocr.confidence;
    } catch (urlErr) {
      try {
        const fallback = await runOcrFromBuffer(buffer);
        ocrText = fallback.text;
        ocrConfidence = fallback.confidence;
      } catch (bufferErr) {
        console.error("OCR failed for URL and binary", { urlErr, bufferErr });
        ocrError =
          "OCR could not read this image. You can still enter amount, date, and merchant manually.";
      }
    }

    const parsed = parseReceiptText(ocrText || "");
    const category = classifyTransaction(ocrText || parsed.merchant || "");
    const fieldConfidence = estimateReceiptFieldConfidence({
      parsed,
      category,
      ocrText,
      ocrConfidence,
    });

    return NextResponse.json({
      imageUrl,
      ocr: {
        text: ocrText,
        confidence: ocrConfidence,
        error: ocrError,
      },
      parsed: {
        amount: parsed.total,
        date: parsed.date ? parsed.date.toISOString() : null,
        merchant: parsed.merchant,
        category,
        products: parsed.products,
        fieldConfidence,
      },
      fallback: Boolean(ocrError),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Processing failed. Try again or use manual entry.", fallback: true },
      { status: 500 }
    );
  }
}
