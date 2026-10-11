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

  // Track-only role, trend scoring, daily notes. Installs that already have data also get the
  // new template items (weight, mood, energy); fresh installs get them from DEFAULT_CONFIG.
  `ALTER TABLE metrics DROP CONSTRAINT metrics_role_check;
   ALTER TABLE metrics ADD CONSTRAINT metrics_role_check CHECK (role IN ('core', 'bonus', 'penalty', 'track'));
   ALTER TABLE metrics ADD COLUMN scoring TEXT NOT NULL DEFAULT 'daily' CHECK (scoring IN ('daily', 'trend'));
   CREATE TABLE day_notes (
     day DATE PRIMARY KEY,
     note TEXT NOT NULL,
     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
   );
   INSERT INTO sections (id, name, position)
     SELECT 'mood', 'Διάθεση', (SELECT max(position) + 1 FROM sections)
     WHERE EXISTS (SELECT 1 FROM sections)
     ON CONFLICT DO NOTHING;
   INSERT INTO metrics (id, section_id, name, role, input, scoring, unit, target, free, points, step, position)
     SELECT v.id, COALESCE((SELECT id FROM sections WHERE id = v.section), (SELECT id FROM sections ORDER BY position LIMIT 1)),
            v.name, v.role, v.input, v.scoring, v.unit, v.target, 0, v.points, v.step,
            (SELECT max(position) FROM metrics) + v.n
     FROM (VALUES
       ('weight', 'health', 'Βάρος', 'core', 'number', 'trend', 'κιλά', 0, 5, 0.1, 1),
       ('mood', 'mood', 'Διάθεση', 'track', 'rating', 'daily', '/5', 4, 0, 1, 2),
       ('energy', 'mood', 'Ενέργεια', 'track', 'rating', 'daily', '/5', 4, 0, 1, 3)
     ) AS v (id, section, name, role, input, scoring, unit, target, points, step, n)
     WHERE EXISTS (SELECT 1 FROM sections)
     ON CONFLICT DO NOTHING;`,

  // Money: income and expense entries by category, plus an opening balance for the running total.
  `CREATE TABLE money_categories (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
     position INTEGER NOT NULL,
     archived BOOLEAN NOT NULL DEFAULT false
   );
   CREATE TABLE transactions (
     id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     day DATE NOT NULL,
     category_id TEXT NOT NULL REFERENCES money_categories (id),
     amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
     note TEXT NOT NULL DEFAULT '',
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   );
   CREATE INDEX transactions_day ON transactions (day);
   CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
   INSERT INTO money_categories (id, name, kind, position) VALUES
     ('salary', 'Μισθός / αμοιβές', 'income', 0),
     ('other_income', 'Άλλα έσοδα', 'income', 1),
     ('groceries', 'Σούπερ μάρκετ', 'expense', 2),
     ('home', 'Σπίτι / ενοίκιο', 'expense', 3),
     ('bills', 'Λογαριασμοί', 'expense', 4),
     ('transport', 'Μετακινήσεις', 'expense', 5),
     ('eating_out', 'Φαγητό έξω', 'expense', 6),
     ('health', 'Υγεία', 'expense', 7),
     ('fun', 'Διασκέδαση', 'expense', 8),
     ('subscriptions', 'Συνδρομές', 'expense', 9),
     ('shopping', 'Ψώνια', 'expense', 10),
     ('other_expense', 'Άλλα έξοδα', 'expense', 11);`,
];
