import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

type ServiceStatus = "ok" | "warn" | "down";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let db: ServiceStatus = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = "down";
  }

  const storageConfigured = Boolean(
    process.env.AZURE_STORAGE_CONNECTION_STRING && process.env.AZURE_CONTAINER_NAME
  );
  const ocrConfigured = Boolean(process.env.AZURE_VISION_ENDPOINT && process.env.AZURE_VISION_KEY);

  const storage: ServiceStatus = storageConfigured ? "ok" : "warn";
  const ocr: ServiceStatus = ocrConfigured ? "ok" : "warn";

  const overall: ServiceStatus = db === "down" ? "down" : storage === "warn" || ocr === "warn" ? "warn" : "ok";

  return NextResponse.json(
    {
      overall,
      services: {
        db,
        storage,
        ocr,
      },
      checkedAt: new Date().toISOString(),
    },
    { status: overall === "down" ? 503 : 200 }
  );
}
