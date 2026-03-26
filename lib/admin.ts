import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type AdminGate = { ok: true; userId: string } | { ok: false; status: 401 | 403 };

export async function assertAdmin(): Promise<AdminGate> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, status: 401 };
  const u = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!u?.isAdmin) return { ok: false, status: 403 };
  return { ok: true, userId: session.user.id };
}

export async function countAdmins(): Promise<number> {
  return prisma.user.count({ where: { isAdmin: true } });
}
