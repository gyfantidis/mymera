"use client";

import { useI18n } from "./locale-provider";

// Fallback for the Suspense boundaries around each page's data.
export default function LoadingText() {
  return <p className="py-10 text-center text-muted">{useI18n().t("loading")}</p>;
}
