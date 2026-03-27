import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { categoryForDb } from "@/lib/transaction-category";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  category: z.string().optional().nullable(),
  type: z.enum(["INCOME", "EXPENSE"]),
  date: z.string().min(1),
  imageUrl: z.string().url().optional().nullable().or(z.literal("")),
});

function parseDateInput(s: string): Date {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date");
  return d;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const q = searchParams.get("q")?.trim();

  const and: Prisma.TransactionWhereInput[] = [{ userId: session.user.id }];

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59, 999);
    and.push({ date: { gte: start, lte: end } });
  }

  if (q) {
    and.push({
      OR: [
        { description: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  const where: Prisma.TransactionWhereInput = { AND: and };

  try {
    const items = await prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
    });
    return NextResponse.json({ transactions: items });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const date = parseDateInput(parsed.data.date);

    const imageUrl =
      parsed.data.imageUrl && parsed.data.imageUrl.length > 0 ? parsed.data.imageUrl : null;

    const category = categoryForDb(parsed.data.type, parsed.data.category);
    const amountDecimal = new Prisma.Decimal(parsed.data.amount);

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const duplicate = await prisma.transaction.findFirst({
      where: {
        userId: session.user.id,
        type: parsed.data.type,
        amount: amountDecimal,
        date: { gte: dayStart, lte: dayEnd },
        OR: [
          ...(imageUrl ? [{ imageUrl }] : []),
          { description: { equals: parsed.data.description, mode: "insensitive" } },
        ],
      },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          error:
            "Transaksi duplikat terdeteksi (deskripsi/struk, nominal, tipe, dan tanggal sama).",
          duplicateTransactionId: duplicate.id,
        },
        { status: 409 }
      );
    }

    const tx = await prisma.transaction.create({
      data: {
        description: parsed.data.description,
        amount: amountDecimal,
        category,
        type: parsed.data.type,
        date,
        imageUrl,
        user: { connect: { id: session.user.id } },
      },
    });
    return NextResponse.json({ transaction: tx });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not create transaction" }, { status: 500 });
  }
}
