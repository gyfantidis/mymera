import { connection } from "next/server";
import { Suspense } from "react";
import { getI18n } from "@/lib/i18n/server";
import { getCategories, getOpeningBalance } from "@/lib/money";
import MoneyNav from "../money-nav";
import CategoriesForm from "./categories-form";
import LoadingText from "../../loading-text";

export default function Page() {
  return (
    <main className="flex flex-col gap-6">
      <Suspense fallback={<LoadingText />}>
        <Loader />
      </Suspense>
    </main>
  );
}

async function Loader() {
  await connection();
  const [categories, opening, f] = await Promise.all([getCategories(), getOpeningBalance(), getI18n()]);
  return (
    <>
      <MoneyNav active="categories" f={f} />
      <CategoriesForm categories={categories} opening={opening} />
    </>
  );
}
