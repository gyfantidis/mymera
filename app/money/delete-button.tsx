"use client";

import { useTransition } from "react";
import { useI18n } from "../locale-provider";
import { removeTransaction } from "./actions";

export default function DeleteButton({ id, label }: { id: string; label: string }) {
  const [pending, startTransition] = useTransition();
  const { t } = useI18n();
  return (
    <button
      type="button"
      aria-label={t("money.deleteLabel", { label })}
      disabled={pending}
      onClick={() => {
        if (window.confirm(t("money.deleteConfirm", { label }))) startTransition(() => removeTransaction(id));
      }}
      className="rounded-lg px-2 py-1 text-muted hover:bg-track hover:text-bad disabled:opacity-40"
    >
      ×
    </button>
  );
}
