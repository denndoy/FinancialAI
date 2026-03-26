"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const CATEGORIES = ["Food", "Transport", "Shopping", "Bills", "Entertainment", "Other"];

export default function AddTransactionPage() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          amount: Number(amount),
          type,
          date: new Date(date).toISOString(),
          ...(type === "EXPENSE" ? { category } : { category: null }),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          typeof data.error === "string"
            ? data.error
            : res.status === 401
              ? "Sesi habis — login lagi."
              : "Could not save transaction.";
        setError(msg);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add transaction</h1>
        <p className="mt-2 text-sm text-muted-foreground">Record income or spending manually.</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <label className="block text-sm">
          <span className="text-muted-foreground">Description</span>
          <input
            required
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">Jumlah (Rp)</span>
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
          <label className="block text-sm">
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
          <p className="text-sm text-muted-foreground">
            Pemasukan tidak perlu kategori — cukup isi deskripsi dan jumlah.
          </p>
        )}
        <label className="block text-sm">
          <span className="text-muted-foreground">Date</span>
          <input
            type="date"
            required
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save transaction"}
        </button>
      </form>
    </div>
  );
}
