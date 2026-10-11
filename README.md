# MyMera

*Mera* (μέρα) is Greek for "day". MyMera scores how productive your day was, from 0 to 100, using rules you set yourself.

It is an early personal project: single user, no login yet, manual entry plus a first endpoint for Apple Health data.

## How the score works

Each day is scored from three groups of metrics:

- **Core** (up to 100 points): focused work, workout, sleep, nutrition, steps. Each earns points in proportion to how close you got to its target.
- **Bonus**: things that are good but not expected every day, such as reading, meeting friends, a walk, a social post.
- **Penalties**: YouTube, series, eating out, impulse spending. A penalty can have a free allowance before it starts costing points.

The total is clamped to 0–100. Targets, points and allowances are editable under Settings.

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
