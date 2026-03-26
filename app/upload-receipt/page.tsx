"use client";

import imageCompression from "browser-image-compression";
import { useState } from "react";

const MAX_MB = 1;
const CATEGORIES = ["Food", "Transport", "Shopping", "Bills", "Entertainment", "Other"];

type Parsed = {
  amount: number | null;
  date: string | null;
  merchant: string | null;
  category: string;
};

export default function UploadReceiptPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrNote, setOcrNote] = useState<string | null>(null);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Other");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  async function compressIfNeeded(f: File): Promise<File> {
    const maxBytes = MAX_MB * 1024 * 1024;
    if (f.size <= maxBytes) return f;
    const options = {
      maxSizeMB: MAX_MB,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };
    return imageCompression(f, options);
  }

  async function processUpload() {
    if (!file) {
      setError("Choose an image first.");
      return;
    }
    setUploading(true);
    setError(null);
    setOcrNote(null);
    setImageUrl(null);
    try {
      const compressed = await compressIfNeeded(file);
      const fd = new FormData();
      fd.append("file", compressed, compressed.name || "receipt.jpg");

      const res = await fetch("/api/upload-receipt", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        if (data.fallback) {
          setOcrNote("You can still add details manually below.");
        }
        return;
      }

      setImageUrl(data.imageUrl ?? null);
      const p = data.parsed as Parsed | undefined;
      if (p) {
        setDescription(p.merchant ?? "");
        setAmount(p.amount != null ? String(p.amount) : "");
        setCategory(CATEGORIES.includes(p.category) ? p.category : "Other");
        if (p.date) setDate(new Date(p.date).toISOString().slice(0, 10));
      }
      if (data.ocr?.error) {
        setOcrNote(data.ocr.error);
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setUploading(false);
    }
  }

  async function saveTransaction() {
    setSaving(true);
    setError(null);
    try {
      const amt = Number(amount);
      if (!description.trim() || !Number.isFinite(amt) || amt <= 0) {
        setError("Enter a valid description and amount.");
        setSaving(false);
        return;
      }
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          amount: amt,
          type,
          date: new Date(date).toISOString(),
          imageUrl: imageUrl ?? undefined,
          ...(type === "EXPENSE" ? { category } : { category: null }),
        }),
      });
      if (!res.ok) {
        setError("Could not save transaction.");
        return;
      }
      window.location.href = "/dashboard";
    } catch {
      setError("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Scan receipt</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Images are compressed in the browser (~{MAX_MB}MB max), then OCR runs on the server (Node).
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <label className="block text-sm font-medium">Receipt image</label>
        <input
          type="file"
          accept="image/*"
          className="mt-2 w-full text-sm"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          disabled={uploading || !file}
          onClick={() => void processUpload()}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {uploading ? "Processing…" : "Upload & extract"}
        </button>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        {ocrNote && <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">{ocrNote}</p>}
      </div>

      {imageUrl && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-medium">Preview</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Receipt"
            className="mt-3 max-h-64 rounded-lg object-contain ring-1 ring-border"
          />
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-medium">Review & save</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Correct any fields before saving — especially if OCR missed a line.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            <span className="text-muted-foreground">Description / merchant</span>
            <input
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Jumlah (Rp)</span>
            <input
              type="number"
              step="1"
              min="0"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Type</span>
            <select
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              value={type}
              onChange={(e) => setType(e.target.value as "INCOME" | "EXPENSE")}
            >
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
            </select>
          </label>
          {type === "EXPENSE" && (
            <label className="text-sm sm:col-span-2">
              <span className="text-muted-foreground">Category</span>
              <select
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          )}
          {type === "INCOME" && (
            <p className="text-sm text-muted-foreground sm:col-span-2">
              Untuk pemasukan, kategori tidak wajib.
            </p>
          )}
          <label className="text-sm sm:col-span-2 sm:max-w-xs">
            <span className="text-muted-foreground">Date</span>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveTransaction()}
          className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save to ledger"}
        </button>
      </div>
    </div>
  );
}
