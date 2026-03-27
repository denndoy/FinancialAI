import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { format } from "date-fns";
import { authOptions } from "@/lib/auth";
import { getMonthlyDashboardData, resolveMonthQuery } from "@/lib/month-report";

function escapeCsvCell(value: string): string {
  if (/[,"\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const month = resolveMonthQuery(searchParams.get("month"));

  try {
    const data = await getMonthlyDashboardData(session.user.id, month);

    const header = ["date", "description", "category", "type", "amount", "imageUrl"];
    const rows = data.transactions.map((t) => {
      const line = [
        format(new Date(t.date), "yyyy-MM-dd"),
        t.description,
        t.category ?? "",
        t.type,
        t.amount.toString(),
        t.imageUrl ?? "",
      ];
      return line.map((cell) => escapeCsvCell(cell)).join(",");
    });

    const csv = [header.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="transactions-${month}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Export CSV gagal" }, { status: 500 });
  }
}
