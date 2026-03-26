import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { authOptions } from "@/lib/auth";
import { formatIdr } from "@/lib/format-idr";
import { getMonthlyDashboardData, monthBounds, resolveMonthQuery } from "@/lib/month-report";

const MARGIN = 14;
const PAGE_W = 210;

function trunc(s: string, max: number) {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function finalY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
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
    const { start } = monthBounds(month);
    const periodLabel = format(start, "MMMM yyyy", { locale: id });
    const printedAt = format(new Date(), "d MMMM yyyy, HH.mm", { locale: id });

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    doc.setProperties({
      title: `Laporan keuangan ${periodLabel}`,
      subject: "Laporan keuangan",
    });

    let y = MARGIN;

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text("Laporan keuangan", MARGIN, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Periode: ${periodLabel}`, MARGIN, y);
    y += 5;
    if (session.user.email) {
      doc.text(`Pengguna: ${session.user.email}`, MARGIN, y);
      y += 5;
    }
    y += 4;

    doc.setTextColor(17, 24, 39);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Ringkasan", MARGIN, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const summaryRows = [
      ["Pemasukan", formatIdr(data.summary.income)],
      ["Pengeluaran", formatIdr(data.summary.expenses)],
      ["Saldo", formatIdr(data.summary.balance)],
    ];

    autoTable(doc, {
      startY: y,
      head: [],
      body: summaryRows,
      theme: "plain",
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 45, textColor: [71, 85, 105] },
        1: { halign: "right", fontStyle: "bold", textColor: [17, 24, 39] },
      },
      margin: { left: MARGIN, right: MARGIN },
      tableWidth: PAGE_W - MARGIN * 2,
    });
    y = finalY(doc) + 10;

    if (data.insights.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Catatan", MARGIN, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      for (const line of data.insights) {
        const wrapped = doc.splitTextToSize(`• ${line}`, PAGE_W - MARGIN * 2);
        doc.text(wrapped, MARGIN, y);
        y += wrapped.length * 4.2;
      }
      doc.setTextColor(17, 24, 39);
      y += 6;
    }

    if (data.pie.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Pengeluaran per kategori", MARGIN, y);
      y += 4;

      const catBody = [...data.pie]
        .sort((a, b) => b.value - a.value)
        .map((row) => [row.name, formatIdr(row.value)]);

      autoTable(doc, {
        startY: y,
        head: [["Kategori", "Jumlah"]],
        body: catBody,
        theme: "striped",
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [30, 41, 59],
          fontStyle: "bold",
          fontSize: 9,
        },
        styles: { fontSize: 9, cellPadding: 3, textColor: [51, 65, 85] },
        columnStyles: {
          1: { halign: "right" },
        },
        margin: { left: MARGIN, right: MARGIN },
      });
      y = finalY(doc) + 10;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Detail transaksi", MARGIN, y);
    y += 4;

    const txBody = data.transactions.map((t) => {
      const amt = Number(t.amount.toString());
      const typeLabel = t.type === "INCOME" ? "Pemasukan" : "Pengeluaran";
      return [
        format(t.date, "d MMM yyyy", { locale: id }),
        trunc(t.description, 42),
        t.type === "EXPENSE" ? trunc(t.category?.trim() || "—", 16) : "—",
        typeLabel,
        formatIdr(amt),
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["Tanggal", "Deskripsi", "Kategori", "Jenis", "Jumlah"]],
      body: txBody.length ? txBody : [["—", "Belum ada transaksi", "", "", ""]],
      theme: "striped",
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 41, 59],
        fontStyle: "bold",
        fontSize: 8,
      },
      styles: { fontSize: 8, cellPadding: 2.5, valign: "middle" },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 58 },
        2: { cellWidth: 22 },
        3: { cellWidth: 24 },
        4: { halign: "right", cellWidth: 32 },
      },
      margin: { left: MARGIN, right: MARGIN },
      showHead: "everyPage",
    });

    const pageH = doc.internal.pageSize.getHeight();
    let footY = finalY(doc) + 8;
    if (footY > pageH - 14) {
      doc.addPage();
      footY = MARGIN + 4;
    }
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(148, 163, 184);
    doc.text(`Dicetak pada ${printedAt}`, MARGIN, footY);

    const pdfBuffer = doc.output("arraybuffer");
    const filename = `laporan-keuangan-${month}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Export PDF gagal" }, { status: 500 });
  }
}
