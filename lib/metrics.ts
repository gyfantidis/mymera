export type Role = "core" | "bonus" | "penalty" | "track";
// daily: scored on the day's own value. trend: scored on whether the 7-day average moves toward the target.
export type Scoring = "daily" | "trend";
export type InputKind = "number" | "bool" | "rating";

export type Section = {
  id: string;
  name: string;
  archived: boolean;
};

export type Metric = {
  id: string;
  sectionId: string;
  name: string;
  role: Role;
  input: InputKind;
  unit: string;
  scoring: Scoring;
  // core/bonus: value that earns full points. penalty: value that costs full points.
  // trend: the value to reach (0 = no goal set yet).
  target: number;
  // penalty only: amount allowed before any points are lost.
  free: number;
  // core: weight relative to the other core metrics. bonus/penalty: points added or removed.
  points: number;
  step: number;
  archived: boolean;
};

// Sections and metrics are stored in display order.
export type Config = { sections: Section[]; metrics: Metric[] };

export const ROLE_LABELS: Record<Role, string> = {
  core: "Βασικός",
  bonus: "Μπόνους",
  penalty: "Ποινή",
  track: "Μόνο καταγραφή",
};

export const INPUT_LABELS: Record<InputKind, string> = {
  number: "Αριθμός",
  bool: "Ναι / Όχι",
  rating: "Βαθμολογία 1–5",
};

export const CORE_TOTAL = 100;

const m = (
  id: string,
  sectionId: string,
  name: string,
  role: Role,
  input: InputKind,
  unit: string,
  target: number,
  free: number,
  points: number,
  step: number,
): Metric => ({ id, sectionId, name, role, input, scoring: "daily", unit, target, free, points, step, archived: false });

// Starting template for a new database; everything in it can be changed from Settings.
export const DEFAULT_CONFIG: Config = {
  sections: [
    { id: "work", name: "Δουλειά & δημιουργία", archived: false },
    { id: "health", name: "Υγεία", archived: false },
    { id: "mood", name: "Διάθεση", archived: false },
    { id: "life", name: "Ζωή", archived: false },
    { id: "avoid", name: "Προς αποφυγή", archived: false },
  ],
  metrics: [
    m("focus", "work", "Συγκέντρωση στη δουλειά", "core", "number", "λεπτά", 240, 0, 30, 15),
    m("social_post", "work", "Ποστ στα social", "bonus", "bool", "", 1, 0, 3, 1),

    m("workout", "health", "Γυμναστική", "core", "number", "λεπτά", 45, 0, 20, 5),
    m("sleep", "health", "Ύπνος", "core", "number", "ώρες", 7.5, 0, 20, 0.25),
    m("nutrition", "health", "Διατροφή", "core", "rating", "/5", 4, 0, 20, 1),
    m("steps", "health", "Βήματα", "core", "number", "βήματα", 8000, 0, 10, 500),
    { ...m("weight", "health", "Βάρος", "core", "number", "κιλά", 0, 0, 5, 0.1), scoring: "trend" },

    m("mood", "mood", "Διάθεση", "track", "rating", "/5", 4, 0, 0, 1),
    m("energy", "mood", "Ενέργεια", "track", "rating", "/5", 4, 0, 0, 1),

    m("reading", "life", "Διάβασμα βιβλίου", "bonus", "number", "λεπτά", 30, 0, 5, 5),
    m("friends", "life", "Συνάντηση με φίλους", "bonus", "bool", "", 1, 0, 4, 1),
    m("walk", "life", "Βόλτα", "bonus", "bool", "", 1, 0, 3, 1),

    m("youtube", "avoid", "YouTube", "penalty", "number", "λεπτά", 120, 30, 10, 10),
    m("series", "avoid", "Σειρές", "penalty", "number", "λεπτά", 150, 45, 8, 15),
    m("eating_out", "avoid", "Φαγητό έξω", "penalty", "bool", "", 1, 0, 5, 1),
    m("spending", "avoid", "Σπατάλη χρημάτων", "penalty", "number", "€", 50, 0, 8, 5),
  ],
};

export function defaultStep(target: number): number {
  if (target >= 1000) return 500;
  if (target >= 100) return 10;
  if (target >= 20) return 5;
  if (target >= 5) return 1;
  return 0.25;
}

export function activeSections(config: Config): Section[] {
  return config.sections.filter((s) => !s.archived);
}

// Active metrics in display order, including track-only ones. Core weights are rescaled so that
// a perfect day is always worth CORE_TOTAL, however many core metrics exist.
export function scoringMetrics(config: Config): Metric[] {
  const order = new Map(activeSections(config).map((s, i) => [s.id, i]));
  const active = config.metrics
    .filter((x) => !x.archived && order.has(x.sectionId))
    .map((x, i) => ({ x, i }))
    .sort((a, b) => order.get(a.x.sectionId)! - order.get(b.x.sectionId)! || a.i - b.i)
    .map(({ x }) => x);
  const coreSum = active.reduce((s, x) => s + (x.role === "core" ? x.points : 0), 0);
  return active.map((x) => (x.role === "core" && coreSum > 0 ? { ...x, points: (x.points / coreSum) * CORE_TOTAL } : x));
}
