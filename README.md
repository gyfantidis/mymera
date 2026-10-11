# MyMera

*Mera* (μέρα) is Greek for "day". MyMera scores how productive your day was, from 0 to 100, using rules you set yourself.

It is an early personal project: single user, no login yet, manual entry plus a first endpoint for Apple Health data.

## How the score works

Metrics live in sections you define (for example Health, Work, Life). Each metric has one of three roles:

- **Core**: the things a good day is made of. Core metrics always share 100 points in proportion to their weight, however many you add, and each earns points by how close you got to its target.
- **Bonus**: things that are good but not expected every day, such as reading or meeting friends. They add points.
- **Penalty**: things you want less of, such as YouTube or impulse spending. They remove points, optionally after a free allowance.
- **Track only**: recorded and shown in statistics, but never part of the score. Mood and energy start this way.

A number can also be scored on its **trend** instead of the day's value: weight earns its points while the 7-day average moves toward your goal. Each day also has a free-text note.

The total is clamped to 0–100. Sections, metrics, targets and points are editable under Settings; past days are rescored with the current rules. The app starts with a template you can change.

## Statistics

The Stats page shows any week, month, quarter or year: average score against the previous period, a score chart, a calendar heatmap, trend charts, best and worst day, and per-metric averages, totals and days on target. Days without entries are left out of averages.

## Money

Income and expenses are entered by hand with a date, a category and an amount. The month page shows income, expenses by category, the month's result and a running balance carried over from earlier months (starting from an opening balance you set). The year page puts the months side by side. Money does not affect the daily score.

## Goals

Goals describe a direction over weeks and never change the daily score. There are three kinds: change a metric by a percentage against your own recent average (YouTube −15%), reach a value, optionally by a date (weight, or the money balance), and hit a metric's target a number of days per week.

## Running locally

You need Node.js and Docker.

```bash
npm install
cp .env.example .env.local
npm run db:up
npm run dev
```

Open http://localhost:3000. `npm run db:up` starts a local Postgres in Docker (port 5433); the schema is created and updated automatically on startup from the numbered migrations in `lib/migrations.ts`.

## Apple Health data

`POST /api/ingest/health` accepts steps, sleep and workouts in the JSON shape sent by the Health Auto Export iOS app, authenticated with `Authorization: Bearer $INGEST_TOKEN`. It has only been tested with hand-written sample payloads so far.

## Stack

Next.js (App Router), TypeScript, Tailwind CSS, Postgres.

## License

[AGPL-3.0](LICENSE)
