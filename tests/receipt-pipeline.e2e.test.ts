import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  return {
    getServerSession: vi.fn(),
    uploadReceiptImage: vi.fn(),
    runOcrFromImageUrl: vi.fn(),
    runOcrFromBuffer: vi.fn(),
    parseReceiptText: vi.fn(),
    classifyTransaction: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  };
});

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/azure", () => ({
  uploadReceiptImage: mocks.uploadReceiptImage,
}));

vi.mock("@/lib/ocr", () => ({
  runOcrFromImageUrl: mocks.runOcrFromImageUrl,
  runOcrFromBuffer: mocks.runOcrFromBuffer,
}));

vi.mock("@/lib/parser", () => ({
  parseReceiptText: mocks.parseReceiptText,
}));

vi.mock("@/lib/ai", () => ({
  classifyTransaction: mocks.classifyTransaction,
}));

vi.mock("@/lib/transaction-category", () => ({
  categoryForDb: (type: "INCOME" | "EXPENSE", category?: string | null) =>
    type === "INCOME" ? null : category ?? "Other",
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    transaction: {
      findFirst: mocks.findFirst,
      create: mocks.create,
    },
  },
}));

describe("Receipt pipeline upload -> parse -> save", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("returns parsed draft with field confidence from upload endpoint", async () => {
    mocks.uploadReceiptImage.mockResolvedValue("https://blob/receipt.jpg");
    mocks.runOcrFromImageUrl.mockResolvedValue({
      text: "INDOMARET\nTOTAL 15.000\n27/03/2026",
      confidence: 0.92,
    });
    mocks.parseReceiptText.mockReturnValue({
      total: 15000,
      date: new Date("2026-03-27T00:00:00.000Z"),
      merchant: "Indomaret",
      products: ["Teh Botol"],
    });
    mocks.classifyTransaction.mockReturnValue("Shopping");

    const { POST } = await import("@/app/api/upload-receipt/route");

    const formData = new FormData();
    formData.append("file", new File([new Blob(["x"])], "receipt.jpg", { type: "image/jpeg" }));

    const req = new Request("http://localhost/api/upload-receipt", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.parsed.amount).toBe(15000);
    expect(body.parsed.merchant).toBe("Indomaret");
    expect(body.parsed.category).toBe("Shopping");
    expect(body.parsed.fieldConfidence).toBeTruthy();
    expect(body.parsed.fieldConfidence.amount.level).toMatch(/high|medium|low/);
  });

  it("blocks duplicate transaction on save endpoint", async () => {
    mocks.findFirst.mockResolvedValue({ id: "tx-existing", createdAt: new Date() });

    const { POST } = await import("@/app/api/transactions/route");

    const req = new Request("http://localhost/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "Indomaret",
        amount: 15000,
        category: "Shopping",
        type: "EXPENSE",
        date: "2026-03-27T00:00:00.000Z",
        imageUrl: "https://blob/receipt.jpg",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(409);

    const body = await res.json();
    expect(body.duplicateTransactionId).toBe("tx-existing");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("creates transaction when no duplicate is found", async () => {
    mocks.findFirst.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: "tx-new" });

    const { POST } = await import("@/app/api/transactions/route");

    const req = new Request("http://localhost/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "Indomaret",
        amount: 15000,
        category: "Shopping",
        type: "EXPENSE",
        date: "2026-03-27T00:00:00.000Z",
        imageUrl: "https://blob/receipt.jpg",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
});
