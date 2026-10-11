import { connection } from "next/server";
import { Suspense } from "react";
import { getConfig } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";
import LoadingText from "../loading-text";
import LanguageSelect from "./language-select";
import SettingsForm from "./settings-form";

export default function Page() {
  return (
    <main className="flex flex-col gap-4">
      <Suspense fallback={<LoadingText />}>
        <Loader />
      </Suspense>
    </main>
  );
}

async function Loader() {
  await connection();
  const { t } = await getI18n();
  return (
    <>
      <LanguageSelect />
      <div>
        <h1 className="text-lg font-semibold">{t("settings.title")}</h1>
        <p className="text-sm text-muted">{t("settings.intro")}</p>
      </div>
      <SettingsForm config={await getConfig()} />
    </>
  );
}
