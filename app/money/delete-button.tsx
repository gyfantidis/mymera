"use client";

import { useTransition } from "react";
import { removeTransaction } from "./actions";

export default function DeleteButton({ id, label }: { id: string; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-label={`Διαγραφή: ${label}`}
      disabled={pending}
      onClick={() => {
        if (window.confirm(`Να διαγραφεί η κίνηση «${label}»;`)) startTransition(() => removeTransaction(id));
      }}
      className="rounded-lg px-2 py-1 text-muted hover:bg-track hover:text-bad disabled:opacity-40"
    >
      ×
    </button>
  );
}
