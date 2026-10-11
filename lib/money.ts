import { db } from "./db";
import type { Category, Kind, Transaction } from "./money-shared";

export async function getCategories(): Promise<Category[]> {
  const sql = await db();
  const rows = await sql`SELECT id, name, kind, archived FROM money_categories ORDER BY position`;
  return rows.map((r) => ({ id: r.id as string, name: r.name as string, kind: r.kind as Kind, archived: r.archived as boolean }));
}

export async function saveCategories(categories: Category[]) {
  const sql = await db();
  await sql.begin(async (tx) => {
    for (const [i, c] of categories.entries()) {
      // A category's kind is fixed once created, so past entries keep their meaning.
      await tx`INSERT INTO money_categories (id, name, kind, position, archived) VALUES (${c.id}, ${c.name}, ${c.kind}, ${i}, ${c.archived})
               ON CONFLICT (id) DO UPDATE SET name = excluded.name, position = excluded.position, archived = excluded.archived`;
    }
  });
}

export async function getTransactions(from: string, to: string): Promise<Transaction[]> {
  const sql = await db();
  const rows = await sql`SELECT id::text, to_char(day, 'YYYY-MM-DD') AS day, category_id, amount::float8 AS amount, note
                         FROM transactions WHERE day BETWEEN ${from}::date AND ${to}::date
                         ORDER BY day DESC, id DESC`;
  return rows.map((r) => ({
    id: r.id as string,
    day: r.day as string,
    categoryId: r.category_id as string,
    amount: r.amount as number,
    note: r.note as string,
  }));
}

// Returns false when the category does not exist.
export async function addTransaction(day: string, categoryId: string, amount: number, note: string): Promise<boolean> {
  const sql = await db();
  const res = await sql`INSERT INTO transactions (day, category_id, amount, note)
                        SELECT ${day}::date, id, ${amount}, ${note} FROM money_categories WHERE id = ${categoryId}`;
  return res.count > 0;
}

export async function deleteTransaction(id: string) {
  const sql = await db();
  await sql`DELETE FROM transactions WHERE id = ${id}::bigint`;
}

export async function getOpeningBalance(): Promise<number> {
  const sql = await db();
  const rows = await sql`SELECT value FROM settings WHERE key = 'opening_balance'`;
  return Number(rows[0]?.value ?? 0) || 0;
}

export async function setOpeningBalance(amount: number) {
  const sql = await db();
  await sql`INSERT INTO settings (key, value) VALUES ('opening_balance', ${String(amount)})
            ON CONFLICT (key) DO UPDATE SET value = excluded.value`;
}

// Opening balance plus every income minus every expense up to and including the day.
export async function balanceAt(day: string): Promise<number> {
  const sql = await db();
  const [row] = await sql`SELECT COALESCE(sum(CASE WHEN c.kind = 'income' THEN t.amount ELSE -t.amount END), 0)::float8 AS net
                          FROM transactions t JOIN money_categories c ON c.id = t.category_id
                          WHERE t.day <= ${day}::date`;
  return (await getOpeningBalance()) + (row.net as number);
}

export type MonthTotals = { month: string; income: number; expense: number };

// Income and expense per month ("YYYY-MM") between two days; months without entries are absent.
export async function monthlyTotals(from: string, to: string): Promise<MonthTotals[]> {
  const sql = await db();
  const rows = await sql`SELECT to_char(t.day, 'YYYY-MM') AS month,
                                COALESCE(sum(t.amount) FILTER (WHERE c.kind = 'income'), 0)::float8 AS income,
                                COALESCE(sum(t.amount) FILTER (WHERE c.kind = 'expense'), 0)::float8 AS expense
                         FROM transactions t JOIN money_categories c ON c.id = t.category_id
                         WHERE t.day BETWEEN ${from}::date AND ${to}::date
                         GROUP BY 1 ORDER BY 1`;
  return rows.map((r) => ({ month: r.month as string, income: r.income as number, expense: r.expense as number }));
}
