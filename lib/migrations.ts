// Schema changes, applied in order and exactly once. Never edit an entry that has shipped:
// add a new one at the end instead.
export const MIGRATIONS: string[] = [
  `CREATE TABLE sections (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     position INTEGER NOT NULL,
     archived BOOLEAN NOT NULL DEFAULT false
   );
   CREATE TABLE metrics (
     id TEXT PRIMARY KEY,
     section_id TEXT NOT NULL REFERENCES sections (id),
     name TEXT NOT NULL,
     role TEXT NOT NULL CHECK (role IN ('core', 'bonus', 'penalty')),
     input TEXT NOT NULL CHECK (input IN ('number', 'bool', 'rating')),
     unit TEXT NOT NULL,
     target DOUBLE PRECISION NOT NULL,
     free DOUBLE PRECISION NOT NULL,
     points DOUBLE PRECISION NOT NULL,
     step DOUBLE PRECISION NOT NULL,
     position INTEGER NOT NULL,
     archived BOOLEAN NOT NULL DEFAULT false
   );
   CREATE TABLE entries (
     day DATE NOT NULL,
     metric TEXT NOT NULL REFERENCES metrics (id),
     value DOUBLE PRECISION NOT NULL,
     source TEXT NOT NULL,
     updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     PRIMARY KEY (day, metric)
   );`,
];
