import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";

export async function GET() {
  const gate = await assertAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.status === 401 ? "Unauthorized" : "Forbidden" }, { status: gate.status });
  }

  try {
    const [userCount, transactionCount, adminCount] = await Promise.all([
      prisma.user.count(),
      prisma.transaction.count(),
      prisma.user.count({ where: { isAdmin: true } }),
    ]);

    return NextResponse.json({ userCount, transactionCount, adminCount });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
