export type Group = "core" | "bonus" | "penalty";
export type InputKind = "number" | "bool" | "rating";

export type Metric = {
  key: string;
  label: string;
  group: Group;
  input: InputKind;
  unit: string;
  // core/bonus: value that earns full points. penalty: value that costs full points.
  target: number;
  // penalty only: amount allowed before any points are lost.
  free: number;
  points: number;
  step: number;
  // where the value is expected to come from once automation is connected
  source: "health" | "mac" | "manual";
};

export type Overrides = Record<string, Partial<Pick<Metric, "target" | "free" | "points">>>;

export const DEFAULT_METRICS: Metric[] = [
  { key: "focus", label: "Συγκέντρωση στη δουλειά", group: "core", input: "number", unit: "λεπτά", target: 240, free: 0, points: 30, step: 15, source: "mac" },
  { key: "workout", label: "Γυμναστική", group: "core", input: "number", unit: "λεπτά", target: 45, free: 0, points: 20, step: 5, source: "health" },
  { key: "sleep", label: "Ύπνος", group: "core", input: "number", unit: "ώρες", target: 7.5, free: 0, points: 20, step: 0.25, source: "health" },
  { key: "nutrition", label: "Διατροφή", group: "core", input: "rating", unit: "/5", target: 4, free: 0, points: 20, step: 1, source: "manual" },
  { key: "steps", label: "Βήματα", group: "core", input: "number", unit: "βήματα", target: 8000, free: 0, points: 10, step: 500, source: "health" },

  { key: "reading", label: "Διάβασμα βιβλίου", group: "bonus", input: "number", unit: "λεπτά", target: 30, free: 0, points: 5, step: 5, source: "manual" },
  { key: "friends", label: "Συνάντηση με φίλους", group: "bonus", input: "bool", unit: "", target: 1, free: 0, points: 4, step: 1, source: "manual" },
  { key: "walk", label: "Βόλτα", group: "bonus", input: "bool", unit: "", target: 1, free: 0, points: 3, step: 1, source: "manual" },
  { key: "social_post", label: "Ποστ στα social", group: "bonus", input: "bool", unit: "", target: 1, free: 0, points: 3, step: 1, source: "manual" },

  { key: "youtube", label: "YouTube", group: "penalty", input: "number", unit: "λεπτά", target: 120, free: 30, points: 10, step: 10, source: "mac" },
  { key: "series", label: "Σειρές", group: "penalty", input: "number", unit: "λεπτά", target: 150, free: 45, points: 8, step: 15, source: "manual" },
  { key: "eating_out", label: "Φαγητό έξω", group: "penalty", input: "bool", unit: "", target: 1, free: 0, points: 5, step: 1, source: "manual" },
  { key: "spending", label: "Σπατάλη χρημάτων", group: "penalty", input: "number", unit: "€", target: 50, free: 0, points: 8, step: 5, source: "manual" },
];

export const GROUP_LABELS: Record<Group, string> = {
  core: "Βάση της ημέρας",
  bonus: "Μπόνους",
  penalty: "Αφαιρούν πόντους",
};

export function applyOverrides(overrides: Overrides): Metric[] {
  return DEFAULT_METRICS.map((m) => ({ ...m, ...overrides[m.key] }));
}
