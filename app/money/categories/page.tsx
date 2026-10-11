import { connection } from "next/server";
import { Suspense } from "react";
import { getCategories, getOpeningBalance } from "@/lib/money";
import MoneyNav from "../money-nav";
import CategoriesForm from "./categories-form";

export default function Page() {
  return (
    <main className="flex flex-col gap-6">
      <MoneyNav active="categories" />
      <Suspense fallback={<p className="py-10 text-center text-muted">Φόρτωση…</p>}>
        <Loader />
      </Suspense>
    </main>
  );
}

async function Loader() {
  await connection();
  const [categories, opening] = await Promise.all([getCategories(), getOpeningBalance()]);
  return <CategoriesForm categories={categories} opening={opening} />;
}
