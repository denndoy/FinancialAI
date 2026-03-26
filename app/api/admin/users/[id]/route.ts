import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin, countAdmins } from "@/lib/admin";
import { prisma } from "@/lib/db";

const patchSchema = z.object({
  isAdmin: z.boolean(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const gate = await assertAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.status === 401 ? "Unauthorized" : "Forbidden" }, { status: gate.status });
  }

  const targetId = params.id;
  if (!targetId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: z.infer<typeof patchSchema>;
  try {
    const json = await req.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!body.isAdmin && targetId === gate.userId) {
      const admins = await countAdmins();
      if (admins <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last admin. Promote another user first." },
          { status: 400 }
        );
      }
    }

    await prisma.user.update({
      where: { id: targetId },
      data: { isAdmin: body.isAdmin },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const gate = await assertAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.status === 401 ? "Unauthorized" : "Forbidden" }, { status: gate.status });
  }

  const targetId = params.id;
  if (!targetId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  if (targetId === gate.userId) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  try {
    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { isAdmin: true },
    });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (target.isAdmin) {
      const admins = await countAdmins();
      if (admins <= 1) {
        return NextResponse.json(
          { error: "Cannot delete the last admin account" },
          { status: 400 }
        );
      }
    }

    await prisma.user.delete({ where: { id: targetId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
