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
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;

const BRAND = {
  navy: [15, 23, 42] as [number, number, number],
  slate: [71, 85, 105] as [number, number, number],
  light: [241, 245, 249] as [number, number, number],
  line: [226, 232, 240] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  accent: [56, 189, 248] as [number, number, number],
};

function trunc(s: string, max: number) {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function finalY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function drawFinanceAiLogo(doc: jsPDF, x: number, y: number) {
  doc.setFillColor(...BRAND.accent);
  doc.circle(x, y, 1.9, "F");
  doc.setFillColor(...BRAND.white);
  doc.circle(x + 4, y, 1.2, "F");

  doc.setDrawColor(...BRAND.accent);
  doc.setLineWidth(0.5);
  doc.line(x + 1.6, y, x + 3.1, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...BRAND.white);
  doc.text("Finance", x + 6.5, y + 1);

  const financeTextWidth = doc.getTextWidth("Finance");
  doc.setTextColor(...BRAND.accent);
  doc.text("AI", x + 6.5 + financeTextWidth + 0.8, y + 1);
}

function drawHeaderBlock(doc: jsPDF, periodLabel: string, username: string | null, printedAt: string): number {
  const blockY = MARGIN;
  const blockH = 26;

  doc.setFillColor(...BRAND.navy);
  doc.roundedRect(MARGIN, blockY, CONTENT_W, blockH, 3, 3, "F");

  doc.setTextColor(...BRAND.white);
  drawFinanceAiLogo(doc, MARGIN + CONTENT_W - 44, blockY + 7.2);

  doc.setTextColor(...BRAND.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Laporan Keuangan Bulanan", MARGIN + 4, blockY + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Periode: ${periodLabel}`, MARGIN + 4, blockY + 15);
  if (username) {
    doc.text(`Pengguna: ${username}`, MARGIN + 4, blockY + 20);
  }
  doc.text(`Dicetak: ${printedAt}`, MARGIN + CONTENT_W - 4, blockY + 20, { align: "right" });

  doc.setTextColor(...BRAND.navy);
  return blockY + blockH + 8;
}

function drawSummaryCards(
  doc: jsPDF,
  y: number,
  summary: { income: number; expenses: number; balance: number }
): number {
  const gap = 4;
  const cardW = (CONTENT_W - gap * 2) / 3;
  const cardH = 21;

  const cards = [
    { label: "Pemasukan", value: formatIdr(summary.income) },
    { label: "Pengeluaran", value: formatIdr(summary.expenses) },
    { label: "Saldo", value: formatIdr(summary.balance) },
  ];

  cards.forEach((card, i) => {
    const x = MARGIN + i * (cardW + gap);
    doc.setFillColor(...BRAND.light);
    doc.setDrawColor(...BRAND.line);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, "FD");

    doc.setTextColor(...BRAND.slate);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(card.label, x + 3, y + 7);

    doc.setTextColor(...BRAND.navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(card.value, x + 3, y + 15);
  });

  return y + cardH + 8;
}

function drawSectionTitle(doc: jsPDF, y: number, title: string): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.navy);
  doc.text(title, MARGIN, y);
  return y + 5;
}

function drawFooters(doc: jsPDF, printedAt: string) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(...BRAND.line);
    doc.line(MARGIN, PAGE_H - 14, PAGE_W - MARGIN, PAGE_H - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Dicetak pada ${printedAt}`, MARGIN, PAGE_H - 9);
    doc.text(`Halaman ${i}/${pages}`, PAGE_W - MARGIN, PAGE_H - 9, { align: "right" });
  }
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

    let y = drawHeaderBlock(doc, periodLabel, session.user.username ?? null, printedAt);
    y = drawSummaryCards(doc, y, data.summary);

    if (data.insights.length > 0) {
      y = drawSectionTitle(doc, y, "Insight & Catatan");

      const boxY = y;
      const lineHeight = 4.2;
      let estimatedHeight = 6;
      for (const line of data.insights) {
        const wrapped = doc.splitTextToSize(`• ${line}`, CONTENT_W - 8);
        estimatedHeight += wrapped.length * lineHeight;
      }

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(...BRAND.line);
      doc.roundedRect(MARGIN, boxY, CONTENT_W, Math.max(estimatedHeight, 18), 2, 2, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...BRAND.slate);
      let textY = boxY + 6;
      for (const line of data.insights) {
        const wrapped = doc.splitTextToSize(`• ${line}`, CONTENT_W - 8);
        doc.text(wrapped, MARGIN + 4, textY);
        textY += wrapped.length * lineHeight;
      }

      y = boxY + Math.max(estimatedHeight, 18) + 8;
    }

    if (data.pie.length > 0) {
      y = drawSectionTitle(doc, y, "Komposisi Pengeluaran per Kategori");

      const catBody = [...data.pie]
        .sort((a, b) => b.value - a.value)
        .map((row) => [row.name, formatIdr(row.value)]);

      autoTable(doc, {
        startY: y,
        head: [["Kategori", "Jumlah"]],
        body: catBody,
        theme: "striped",
        headStyles: {
          fillColor: BRAND.navy,
          textColor: BRAND.white,
          fontStyle: "bold",
          fontSize: 9,
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: {
          fontSize: 9,
          cellPadding: 3,
          textColor: [51, 65, 85],
          lineColor: BRAND.line,
          lineWidth: 0.1,
        },
        columnStyles: {
          1: { halign: "right", fontStyle: "bold" },
        },
        margin: { left: MARGIN, right: MARGIN },
      });
      y = finalY(doc) + 10;
    }

    y = drawSectionTitle(doc, y, "Detail Transaksi");

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

    const txBodyRows =
      txBody.length > 0
        ? txBody
        : [
            [
              {
                content: "Belum ada transaksi pada periode ini",
                colSpan: 5,
                styles: {
                  halign: "center" as const,
                  textColor: BRAND.slate,
                },
              },
            ],
          ];

    autoTable(doc, {
      startY: y,
      head: [["Tanggal", "Deskripsi", "Kategori", "Jenis", "Jumlah"]],
      body: txBodyRows,
      theme: "striped",
      headStyles: {
        fillColor: BRAND.navy,
        textColor: BRAND.white,
        fontStyle: "bold",
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        valign: "middle",
        lineColor: BRAND.line,
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 72 },
        2: { cellWidth: 24 },
        3: { cellWidth: 24, fontStyle: "bold" },
        4: { halign: "right", cellWidth: 38, fontStyle: "bold" },
      },
      margin: { left: MARGIN, right: MARGIN },
      tableWidth: CONTENT_W,
      showHead: "everyPage",
    });

    drawFooters(doc, printedAt);

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
