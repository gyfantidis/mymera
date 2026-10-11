"use client";

import { useI18n } from "./locale-provider";

// Fallback for the Suspense boundaries around each page's data:
// the three shapes of the logo lighting up in turn, ending on the sun.
export default function LoadingText() {
  return (
    <div role="status" className="flex justify-center py-16">
      <div aria-hidden="true" className="loading-shapes flex items-center gap-1.5">
        <span className="h-3.5 w-3.5 rounded-[2px] bg-accent" />
        <span className="h-3.5 w-3.5 rounded-[5px] bg-accent" style={{ animationDelay: "180ms" }} />
        <span className="h-3.5 w-3.5 rounded-full bg-sun" style={{ animationDelay: "360ms" }} />
      </div>
      <span className="sr-only">{useI18n().t("loading")}</span>
    </div>
  );
}
