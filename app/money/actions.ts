"use server";

import { refresh } from "next/cache";
import { isDay } from "@/lib/dates";
import { addTransaction, deleteTransaction, getCategories, saveCategories, setOpeningBalance } from "@/lib/money";
import type { Category } from "@/lib/money-shared";

const MAX_AMOUNT = 9_999_999;
const ID = /^[a-z0-9_-]{1,40}$/;

export async function createTransaction(day: string, categoryId: string, amount: number, note: string) {
  if (!isDay(day)) throw new Error("Invalid day");
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) throw new Error("Invalid amount");
  if (typeof note !== "string") throw new Error("Invalid note");
  const rounded = Math.round(amount * 100) / 100;
  if (!(await addTransaction(day, categoryId, rounded, note.trim().slice(0, 200)))) throw new Error("Unknown category");
  refresh();
}

export async function removeTransaction(id: string) {
  if (!/^\d{1,18}$/.test(id)) throw new Error("Invalid id");
  await deleteTransaction(id);
  refresh();
}

export async function saveMoneySettings(input: Category[], openingBalance: number) {
  if (!Number.isFinite(openingBalance) || Math.abs(openingBalance) > MAX_AMOUNT) throw new Error("Invalid opening balance");
  const existing = new Map((await getCategories()).map((c) => [c.id, c]));
  const seen = new Set<string>();
  const categories = input.map((c): Category => {
    const kind = existing.get(c.id)?.kind ?? c.kind;
    const name = typeof c.name === "string" ? c.name.trim() : "";
    if (!ID.test(c.id) || seen.has(c.id) || !name || name.length > 60) throw new Error("Invalid category");
    if (kind !== "income" && kind !== "expense") throw new Error("Invalid category kind");
    seen.add(c.id);
    return { id: c.id, name, kind, archived: !!c.archived };
  });
  await saveCategories(categories);
  await setOpeningBalance(Math.round(openingBalance * 100) / 100);
  refresh();
}
