"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/locale-provider";

const CATEGORIES = [
  { value: "Food", labelKey: "category.food" },
  { value: "Transport", labelKey: "category.transport" },
  { value: "Shopping", labelKey: "category.shopping" },
  { value: "Bills", labelKey: "category.bills" },
  { value: "Entertainment", labelKey: "category.entertainment" },
  { value: "Other", labelKey: "category.other" },
] as const;

export default function AddTransactionPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreviewUrl, setEvidencePreviewUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (evidencePreviewUrl) {
        URL.revokeObjectURL(evidencePreviewUrl);
      }
    };
  }, [evidencePreviewUrl]);

  function onEvidenceFileChange(file: File | null) {
    setEvidenceFile(file);

    if (evidencePreviewUrl) {
      URL.revokeObjectURL(evidencePreviewUrl);
    }

    if (!file) {
      setEvidencePreviewUrl(null);
      return;
    }

    setEvidencePreviewUrl(URL.createObjectURL(file));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let imageUrl: string | null = null;

      if (evidenceFile) {
        setUploadingImage(true);
        const fd = new FormData();
        fd.append("file", evidenceFile);

        const uploadRes = await fetch("/api/upload-evidence", {
          method: "POST",
          body: fd,
        });

        const uploadData = (await uploadRes.json().catch(() => ({}))) as {
          imageUrl?: string;
          error?: string;
        };

        if (!uploadRes.ok || !uploadData.imageUrl) {
          setError(uploadData.error ?? t("addTx.errorUpload"));
          return;
        }

        imageUrl = uploadData.imageUrl;
      }

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          amount: Number(amount),
          type,
          date: new Date(date).toISOString(),
          imageUrl,
          ...(type === "EXPENSE" ? { category } : { category: null }),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          typeof data.error === "string"
            ? data.error
            : res.status === 401
              ? t("addTx.errorUnauthorized")
              : t("addTx.errorSave");
        setError(msg);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t("addTx.errorRequest"));
    } finally {
      setUploadingImage(false);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("addTx.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("addTx.subtitle")}</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <label className="block text-sm">
          <span className="text-muted-foreground">{t("addTx.description")}</span>
          <input
            required
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">{t("addTx.amount")}</span>
          <input
            required
            type="number"
            step="1"
            min="0"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">{t("addTx.type")}</span>
          <select
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            value={type}
            onChange={(e) => setType(e.target.value as "INCOME" | "EXPENSE")}
          >
            <option value="EXPENSE">{t("addTx.typeExpense")}</option>
            <option value="INCOME">{t("addTx.typeIncome")}</option>
          </select>
        </label>
        {type === "EXPENSE" && (
          <label className="block text-sm">
            <span className="text-muted-foreground">{t("addTx.category")}</span>
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
          <p className="text-sm text-muted-foreground">{t("addTx.incomeHint")}</p>
        )}
        <label className="block text-sm">
          <span className="text-muted-foreground">{t("addTx.date")}</span>
          <input
            type="date"
            required
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="text-muted-foreground">{t("addTx.evidence")}</span>
          <input
            type="file"
            accept="image/*"
            className="mt-1 block w-full cursor-pointer rounded-lg border border-border bg-background px-3 py-2"
            onChange={(e) => onEvidenceFileChange(e.target.files?.[0] ?? null)}
          />
          <p className="mt-2 text-xs text-muted-foreground">{t("addTx.evidenceHint")}</p>
        </label>

        {evidencePreviewUrl && (
          <div className="rounded-lg border border-border p-3">
            <p className="mb-2 text-xs text-muted-foreground">{t("addTx.evidencePreview")}</p>
            <img
              src={evidencePreviewUrl}
              alt={t("addTx.evidenceAlt")}
              className="max-h-56 w-full rounded-md object-contain"
            />
            <button
              type="button"
              onClick={() => onEvidenceFileChange(null)}
              className="mt-3 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
            >
              {t("addTx.evidenceRemove")}
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || uploadingImage}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {uploadingImage ? t("addTx.uploading") : loading ? t("addTx.saving") : t("addTx.save")}
        </button>
      </form>
    </div>
  );
}
