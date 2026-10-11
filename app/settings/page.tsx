import { connection } from "next/server";
import { Suspense } from "react";
import { getOverrides } from "@/lib/db";
import { applyOverrides } from "@/lib/metrics";
import SettingsForm from "./settings-form";

export default function Page() {
  return (
    <main className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Κανόνες βαθμολογίας</h1>
        <p className="text-sm text-muted">
          Η βάση δίνει έως 100 πόντους. Τα μπόνους προσθέτουν, οι ποινές αφαιρούν, και το τελικό σκορ μένει μεταξύ 0 και 100.
        </p>
      </div>
      <Suspense fallback={<p className="py-10 text-center text-muted">Φόρτωση…</p>}>
        <Loader />
      </Suspense>
    </main>
  );
}

async function Loader() {
  await connection();
  return <SettingsForm metrics={applyOverrides(await getOverrides())} />;
}
