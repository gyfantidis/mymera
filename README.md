# MyMera

*Mera* (μέρα) is Greek for "day". MyMera scores how productive your day was, from 0 to 100, using rules you set yourself.

It is an early personal project: single user, no login yet, manual entry plus a first endpoint for Apple Health data.

## How the score works

Metrics live in sections you define (for example Health, Work, Life). Each metric has one of three roles:

- **Core**: the things a good day is made of. Core metrics always share 100 points in proportion to their weight, however many you add, and each earns points by how close you got to its target.
- **Bonus**: things that are good but not expected every day, such as reading or meeting friends. They add points.
- **Penalty**: things you want less of, such as YouTube or impulse spending. They remove points, optionally after a free allowance.

The total is clamped to 0–100. Sections, metrics, targets and points are editable under Settings; past days are rescored with the current rules. The app starts with a template of 13 metrics.

## Statistics

The Stats page shows any week, month, quarter or year: average score against the previous period, a score chart, a calendar heatmap, best and worst day, and per-metric averages, totals and days on target. Days without entries are left out of averages.

## Running locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Data is stored in a local SQLite file (`mymera.db`). Set `DATABASE_URL` and `DATABASE_AUTH_TOKEN` to use a hosted libSQL/Turso database instead.

## Apple Health data

`POST /api/ingest/health` accepts steps, sleep and workouts in the JSON shape sent by the Health Auto Export iOS app, authenticated with `Authorization: Bearer $INGEST_TOKEN`. It has only been tested with hand-written sample payloads so far.

## Stack

Next.js (App Router), TypeScript, Tailwind CSS, libSQL.

## License

[AGPL-3.0](LICENSE)
