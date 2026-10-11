import { connection } from "next/server";
import { Suspense } from "react";
import { getConfig } from "@/lib/db";
import SettingsForm from "./settings-form";

export default function Page() {
  return (
    <main className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Sections και τομείς</h1>
        <p className="text-sm text-muted">
          Οι βασικοί τομείς μοιράζονται πάντα 100 πόντους ανάλογα με το βάρος τους. Τα μπόνους προσθέτουν και οι ποινές αφαιρούν
          πόντους, και το τελικό σκορ μένει μεταξύ 0 και 100.
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
  return <SettingsForm config={await getConfig()} />;
}
