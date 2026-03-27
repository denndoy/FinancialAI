"use client";

import { useEffect, useState } from "react";
import type { Transaction } from "@prisma/client";
import { useLocale } from "@/components/locale-provider";
import { formatIdr } from "@/lib/format-idr";

type Props = {
  transactions: Transaction[];
  onChanged: () => void;
};

export function TransactionTable({ transactions, onChanged }: Props) {
  const { t: tr, locale } = useLocale();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => transactions.some((tx) => tx.id === id)));
  }, [transactions]);

  useEffect(() => {
    if (!previewImage) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewImage(null);
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
  }, [previewImage]);

  async function remove(id: string) {
    if (!confirm(tr("tx.confirmDelete"))) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      onChanged();
    } catch {
      setError(tr("tx.couldNotDelete"));
    } finally {
      setLoading(false);
    }
  }

  async function removeSelected() {
    if (selectedIds.length === 0) return;
    if (!confirm(`${tr("tx.confirmDeleteSelected")} (${selectedIds.length})`)) return;

    setLoading(true);
    setError(null);
    try {
      const idsToDelete = [...selectedIds];
      const results = await Promise.all(idsToDelete.map((id) => fetch(`/api/transactions/${id}`, { method: "DELETE" })));
      if (results.some((res) => !res.ok)) throw new Error("Bulk delete failed");
      setSelectedIds([]);
      onChanged();
    } catch {
      setError(tr("tx.couldNotDeleteSelected"));
    } finally {
      setLoading(false);
    }
  }

  const allSelected = transactions.length > 0 && selectedIds.length === transactions.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {selectedIds.length > 0
            ? `${selectedIds.length} ${tr("tx.selected")}`
            : tr("tx.noSelected")}
        </p>
        <button
          type="button"
          disabled={loading || selectedIds.length === 0}
          onClick={() => void removeSelected()}
          className="rounded-lg border border-destructive/40 px-3 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? tr("tx.deletingSelected") : tr("tx.deleteSelected")}
        </button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">
                <input
                  type="checkbox"
                  aria-label={tr("tx.selectAll")}
                  checked={allSelected}
                  disabled={loading || transactions.length === 0}
                  onChange={(event) => {
                    if (event.target.checked) {
                      setSelectedIds(transactions.map((tx) => tx.id));
                      return;
                    }
                    setSelectedIds([]);
                  }}
                />
              </th>
              <th className="px-4 py-3 font-medium">{tr("tx.table.date")}</th>
              <th className="px-4 py-3 font-medium">{tr("tx.table.description")}</th>
              <th className="px-4 py-3 font-medium">{tr("tx.table.category")}</th>
              <th className="px-4 py-3 font-medium">{tr("tx.table.type")}</th>
              <th className="px-4 py-3 font-medium text-right">{tr("tx.table.amount")}</th>
              <th className="px-4 py-3 font-medium">{tr("tx.table.receipt")}</th>
              <th className="px-4 py-3 font-medium text-right">{tr("tx.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={tr("tx.selectOne")}
                    checked={selectedIds.includes(tx.id)}
                    disabled={loading}
                    onChange={(event) => {
                      setSelectedIds((prev) => {
                        if (event.target.checked) return [...prev, tx.id];
                        return prev.filter((id) => id !== tx.id);
                      });
                    }}
                  />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {new Date(tx.date).toLocaleDateString(locale === "id" ? "id-ID" : "en-GB")}
                </td>
                <td className="px-4 py-3">{tx.description}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {tx.category?.trim() ? tx.category : "—"}
                </td>
                <td className="px-4 py-3">
                  {tx.type === "INCOME" ? tr("tx.type.income") : tr("tx.type.expense")}
                </td>
                <td
                  className={`px-4 py-3 text-right font-medium ${
                    tx.type === "INCOME" ? "text-emerald-600 dark:text-emerald-400" : ""
                  }`}
                >
                  {tx.type === "EXPENSE" ? "-" : "+"}
                  {formatIdr(Number(tx.amount.toString()))}
                </td>
                <td className="px-4 py-3">
                  {tx.imageUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewImage(tx.imageUrl);
                        setIsZoomed(false);
                      }}
                      className="inline-block rounded-md transition-transform hover:scale-105"
                      aria-label={tr("tx.preview.openAria")}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={tx.imageUrl}
                        alt={tr("tx.preview.thumbnailAlt")}
                        className="h-10 w-10 rounded-md object-cover ring-1 ring-border"
                      />
                    </button>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setEditingId(editingId === tx.id ? null : tx.id)}
                    className="mr-2 text-primary hover:underline"
                  >
                    {editingId === tx.id ? tr("tx.close") : tr("tx.edit")}
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => remove(tx.id)}
                    className="text-destructive hover:underline"
                  >
                    {tr("tx.delete")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editingId && (
        <EditRow
          transaction={transactions.find((x) => x.id === editingId)!}
          onCancel={() => setEditingId(null)}
          onSaved={() => {
            setEditingId(null);
            onChanged();
          }}
        />
      )}

      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => {
            setPreviewImage(null);
            setIsZoomed(false);
          }}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-6xl flex-col rounded-xl border border-white/20 bg-black/60 p-3 backdrop-blur"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm text-white/85">{tr("tx.preview.title")}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsZoomed((v) => !v)}
                  className="rounded-md border border-white/30 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
                >
                  {isZoomed ? tr("tx.preview.zoomOut") : tr("tx.preview.zoomIn")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewImage(null);
                    setIsZoomed(false);
                  }}
                  className="rounded-md border border-white/30 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
                >
                  {tr("tx.preview.close")}
                </button>
              </div>
            </div>
            <div className="overflow-auto rounded-lg bg-black/50 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage}
                alt={tr("tx.preview.fullAlt")}
                className={`mx-auto max-h-[78vh] w-auto rounded-md object-contain transition-transform duration-200 ${
                  isZoomed ? "scale-125" : "scale-100"
                }`}
              />
            </div>
            <p className="mt-2 text-xs text-white/70">{tr("tx.preview.tip")}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function EditRow({
  transaction: row,
  onCancel,
  onSaved,
}: {
  transaction: Transaction;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { t: tr } = useLocale();
  const [description, setDescription] = useState(row.description);
  const [amount, setAmount] = useState(Number(row.amount.toString()));
  const [category, setCategory] = useState(() => row.category ?? "");
  const [type, setType] = useState(row.type);
  const [date, setDate] = useState(() => new Date(row.date).toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/transactions/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          amount,
          category: type === "INCOME" ? null : category,
          type,
          date: new Date(date).toISOString(),
          imageUrl: row.imageUrl ?? "",
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      onSaved();
    } catch {
      setErr(tr("tx.edit.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <h3 className="mb-3 font-medium">{tr("tx.edit.title")}</h3>
      {err && <p className="mb-2 text-sm text-destructive">{err}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-muted-foreground">{tr("tx.edit.description")}</span>
          <input
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">{tr("tx.edit.amount")}</span>
          <input
            type="number"
            step="1"
            min="0"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">{tr("tx.edit.type")}</span>
          <select
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            value={type}
            onChange={(e) => setType(e.target.value as "INCOME" | "EXPENSE")}
          >
            <option value="EXPENSE">{tr("tx.type.expense")}</option>
            <option value="INCOME">{tr("tx.type.income")}</option>
          </select>
        </label>
        {type === "EXPENSE" && (
          <label className="text-sm">
            <span className="text-muted-foreground">{tr("tx.edit.category")}</span>
            <input
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </label>
        )}
        <label className="text-sm sm:col-span-2">
          <span className="text-muted-foreground">{tr("tx.edit.date")}</span>
          <input
            type="date"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {saving ? tr("tx.edit.saving") : tr("tx.edit.save")}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm">
          {tr("tx.edit.cancel")}
        </button>
      </div>
    </div>
  );
}
