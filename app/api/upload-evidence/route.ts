import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import sharp from "sharp";
import { authOptions } from "@/lib/auth";
import { uploadReceiptImage } from "@/lib/azure";

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

    const optimized = await ensureUnderMaxSize(Buffer.from(await file.arrayBuffer()) as Buffer);
    const contentType = file.type || "image/jpeg";
    const filename = file.name || "transaction-evidence.jpg";

    const imageUrl = await uploadReceiptImage(optimized, contentType, filename);
    return NextResponse.json({ imageUrl });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Image upload failed. Check storage configuration and try again." },
      { status: 500 }
    );
  }
}
