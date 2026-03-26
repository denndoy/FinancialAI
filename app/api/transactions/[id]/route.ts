import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { categoryForDb } from "@/lib/transaction-category";
import { prisma } from "@/lib/db";

const updateSchema = z.object({
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

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const existing = await prisma.transaction.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const date = parseDateInput(parsed.data.date);

    const imageUrl =
      parsed.data.imageUrl && parsed.data.imageUrl.length > 0 ? parsed.data.imageUrl : null;

    const category = categoryForDb(parsed.data.type, parsed.data.category);

    const tx = await prisma.transaction.update({
      where: { id },
      data: {
        description: parsed.data.description,
        amount: new Prisma.Decimal(parsed.data.amount),
        category,
        type: parsed.data.type,
        date,
        imageUrl,
      },
    });
    return NextResponse.json({ transaction: tx });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not update transaction" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const existing = await prisma.transaction.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.transaction.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not delete transaction" }, { status: 500 });
  }
}
