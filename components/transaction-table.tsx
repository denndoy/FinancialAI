"use client";

import { useState } from "react";
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

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
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
                    <a
                      href={tx.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={tx.imageUrl}
                        alt=""
                        className="h-10 w-10 rounded-md object-cover ring-1 ring-border"
                      />
                    </a>
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
