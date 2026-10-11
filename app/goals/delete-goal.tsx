"use client";

import { useTransition } from "react";
import { removeGoal } from "./actions";

export default function DeleteGoal({ id, label }: { id: string; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-label={`Διαγραφή στόχου: ${label}`}
      disabled={pending}
      onClick={() => {
        if (window.confirm(`Να διαγραφεί ο στόχος «${label}»;`)) startTransition(() => removeGoal(id));
      }}
      className="rounded-lg px-2 py-1 text-muted hover:bg-track hover:text-bad disabled:opacity-40"
    >
      ×
    </button>
  );
}
