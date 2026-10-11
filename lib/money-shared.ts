// Money types and helpers that are safe to import from client components.

export type Kind = "income" | "expense";

export const KIND_LABELS: Record<Kind, string> = { income: "Έσοδα", expense: "Έξοδα" };

export type Category = { id: string; name: string; kind: Kind; archived: boolean };

export type Transaction = {
  id: string;
  day: string;
  categoryId: string;
  amount: number;
  note: string;
};

const euro = new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" });
export const formatMoney = (n: number) => euro.format(n);
// Explicit sign, for results and balances.
export const formatSigned = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "") + euro.format(Math.abs(n));

export const isMonth = (s: unknown): s is string => typeof s === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

export type CategoryTotal = { category: Category; total: number };

export function totalsByCategory(categories: Category[], transactions: Transaction[], kind: Kind): CategoryTotal[] {
  const sums = new Map<string, number>();
  for (const t of transactions) sums.set(t.categoryId, (sums.get(t.categoryId) ?? 0) + t.amount);
  return categories
    .filter((c) => c.kind === kind && sums.has(c.id))
    .map((category) => ({ category, total: sums.get(category.id)! }))
    .sort((a, b) => b.total - a.total);
}
