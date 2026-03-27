"use client";

import imageCompression from "browser-image-compression";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/locale-provider";

const MAX_MB = 1;
const CATEGORIES = [
  { value: "Food", labelKey: "category.food" },
  { value: "Transport", labelKey: "category.transport" },
  { value: "Shopping", labelKey: "category.shopping" },
  { value: "Bills", labelKey: "category.bills" },
  { value: "Entertainment", labelKey: "category.entertainment" },
  { value: "Other", labelKey: "category.other" },
] as const;

type Parsed = {
  amount: number | null;
  date: string | null;
  merchant: string | null;
  category: string;
  fieldConfidence?: {
    amount?: { score: number; level: "high" | "medium" | "low" };
    date?: { score: number; level: "high" | "medium" | "low" };
    merchant?: { score: number; level: "high" | "medium" | "low" };
    category?: { score: number; level: "high" | "medium" | "low" };
  };
};

export default function UploadReceiptPage() {
  const { t } = useLocale();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrNote, setOcrNote] = useState<string | null>(null);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Other");
  const [fieldConfidence, setFieldConfidence] = useState<Parsed["fieldConfidence"] | null>(null);
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  function confidenceClass(level?: "high" | "medium" | "low") {
    if (level === "high") return "bg-emerald-100 text-emerald-700";
    if (level === "medium") return "bg-amber-100 text-amber-700";
    return "bg-rose-100 text-rose-700";
  }

  useEffect(() => {
    if (!isPreviewOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPreviewOpen(false);
        setIsZoomed(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isPreviewOpen]);

  async function uploadWithRetry(formData: FormData, maxAttempts = 2): Promise<Response> {
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const res = await fetch("/api/upload-receipt", {
          method: "POST",
          body: formData,
        });
        if (res.ok || attempt >= maxAttempts) return res;
      } catch (error) {
        lastError = error;
        if (attempt >= maxAttempts) throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
    }

    if (lastError) throw lastError;
    throw new Error("Upload failed");
  }

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
      setError(t("scan.errorChooseImage"));
      return;
    }
    setUploading(true);
    setError(null);
    setOcrNote(null);
    setImageUrl(null);
    setFieldConfidence(null);
    try {
      const compressed = await compressIfNeeded(file);
      const fd = new FormData();
      fd.append("file", compressed, compressed.name || "receipt.jpg");

      const res = await uploadWithRetry(fd);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? t("scan.errorUpload"));
        if (data.fallback) {
          setOcrNote(t("scan.noteManual"));
        }
        return;
      }

      setImageUrl(data.imageUrl ?? null);
      const p = data.parsed as Parsed | undefined;
      if (p) {
        setDescription(p.merchant ?? "");
        setAmount(p.amount != null ? String(p.amount) : "");
        setCategory(CATEGORIES.some((c) => c.value === p.category) ? p.category : "Other");
        if (p.date) setDate(new Date(p.date).toISOString().slice(0, 10));
        setFieldConfidence(p.fieldConfidence ?? null);
      }
      if (data.ocr?.error) {
        setOcrNote(data.ocr.error);
      } else if (data.fallback) {
        setOcrNote(t("scan.noteOcrUnavailable"));
      }
    } catch {
      setError(t("scan.errorNetwork"));
    } finally {
      setUploading(false);
    }
  }

  async function saveTransaction() {
    setSaving(true);
    setError(null);

    try {
      const descTrimmed = description.trim();
      const amt = Number(amount);

      if (!descTrimmed) {
        setError(t("scan.errorDescRequired"));
        setSaving(false);
        return;
      }

      if (!Number.isFinite(amt)) {
        setError(t("scan.errorAmountNumber"));
        setSaving(false);
        return;
      }

      if (amt <= 0) {
        setError(t("scan.errorAmountPositive"));
        setSaving(false);
        return;
      }

      const dateObj = new Date(date + "T00:00:00Z");
      const dateIso = dateObj.toISOString();

      const payload = {
        description: descTrimmed,
        amount: amt,
        type,
        date: dateIso,
        imageUrl: imageUrl ?? undefined,
        ...(type === "EXPENSE" ? { category } : { category: null }),
      };
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json().catch(() => {
        return {};
      });

      if (!res.ok) {
        const errorMsg = resData.error
          ? typeof resData.error === "string"
            ? resData.error
            : JSON.stringify(resData.error)
          : t("scan.errorSave");

        if (res.status === 409) {
          setError(t("scan.errorDuplicate"));
          setSaving(false);
          return;
        }

        setError(errorMsg);
        setSaving(false);
        return;
      }

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 500);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : t("scan.errorUnknown");
      setError(`${t("scan.errorSavePrefix")} ${errorMsg}`);
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("scan.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("scan.subtitle").replace("{maxMb}", String(MAX_MB))}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <label className="block text-sm font-medium">{t("scan.imageLabel")}</label>
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
          {uploading ? t("scan.processing") : t("scan.uploadExtract")}
        </button>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        {ocrNote && <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">{ocrNote}</p>}
      </div>

      {imageUrl && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium">{t("scan.preview")}</h2>
            <button
              type="button"
              onClick={() => {
                setIsPreviewOpen(true);
                setIsZoomed(false);
              }}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {t("scan.openFullscreen")}
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsPreviewOpen(true);
              setIsZoomed(false);
            }}
            className="group relative mt-3 block w-full overflow-hidden rounded-lg ring-1 ring-border"
            aria-label={t("scan.openPreviewAria")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={t("scan.receiptAlt")}
              className="max-h-64 w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            />
            <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <span className="mb-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                {t("scan.clickToZoom")}
              </span>
            </div>
          </button>
          <p className="mt-2 text-xs text-muted-foreground">{t("scan.clickDetail")}</p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-medium">{t("scan.reviewTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("scan.reviewSubtitle")}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            <span className="flex items-center gap-2 text-muted-foreground">
              {t("scan.descMerchant")}
              {fieldConfidence?.merchant && (
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${confidenceClass(
                    fieldConfidence.merchant.level
                  )}`}
                >
                  OCR {fieldConfidence.merchant.level}
                </span>
              )}
            </span>
            <input
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("scan.descPlaceholder")}
            />
          </label>
          <label className="text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              {t("scan.amount")}
              {fieldConfidence?.amount && (
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${confidenceClass(
                    fieldConfidence.amount.level
                  )}`}
                >
                  OCR {fieldConfidence.amount.level}
                </span>
              )}
            </span>
            <input
              type="number"
              step="1"
              min="0"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </label>
          <label className="text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              {t("scan.type")}
              {fieldConfidence?.category && (
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${confidenceClass(
                    fieldConfidence.category.level
                  )}`}
                >
                  OCR {fieldConfidence.category.level}
                </span>
              )}
            </span>
            <select
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              value={type}
              onChange={(e) => setType(e.target.value as "INCOME" | "EXPENSE")}
            >
              <option value="EXPENSE">{t("tx.type.expense")}</option>
              <option value="INCOME">{t("tx.type.income")}</option>
            </select>
          </label>
          {type === "EXPENSE" && (
            <label className="text-sm sm:col-span-2">
              <span className="text-muted-foreground">{t("scan.category")}</span>
              <select
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {t(c.labelKey)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {type === "INCOME" && (
            <p className="text-sm text-muted-foreground sm:col-span-2">{t("scan.incomeHint")}</p>
          )}
          <label className="text-sm sm:col-span-2 sm:max-w-xs">
            <span className="flex items-center gap-2 text-muted-foreground">
              {t("scan.date")}
              {fieldConfidence?.date && (
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${confidenceClass(
                    fieldConfidence.date.level
                  )}`}
                >
                  OCR {fieldConfidence.date.level}
                </span>
              )}
            </span>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </div>

        {error && <p className="mt-4 text-sm text-destructive font-medium">{error}</p>}

        <button
          type="button"
          disabled={saving || !description.trim() || !amount}
          onClick={() => void saveTransaction()}
          className={`mt-6 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            saving
              ? "bg-gray-400 text-gray-100 cursor-wait"
              : !description.trim() || !amount
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
          }`}
        >
          {saving ? t("scan.saving") : t("scan.save")}
        </button>
      </div>

      {imageUrl && isPreviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => {
            setIsPreviewOpen(false);
            setIsZoomed(false);
          }}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-6xl flex-col rounded-xl border border-white/20 bg-black/60 p-3 backdrop-blur"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm text-white/85">{t("scan.modalTitle")}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsZoomed((v) => !v)}
                  className="rounded-md border border-white/30 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
                >
                  {isZoomed ? t("scan.zoomOut") : t("scan.zoomIn")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPreviewOpen(false);
                    setIsZoomed(false);
                  }}
                  className="rounded-md border border-white/30 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
                >
                  {t("scan.close")}
                </button>
              </div>
            </div>
            <div className="overflow-auto rounded-lg bg-black/50 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={t("scan.fullAlt")}
                className={`mx-auto max-h-[78vh] w-auto rounded-md object-contain transition-transform duration-200 ${
                  isZoomed ? "scale-125" : "scale-100"
                }`}
              />
            </div>
            <p className="mt-2 text-xs text-white/70">{t("scan.tip")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
