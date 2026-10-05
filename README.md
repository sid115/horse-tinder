# Horse Tinder

Next.js 15 + Prisma (SQLite) app for matching horses.

## Setup

```sh
nix develop          # or: npm install
npm run db:push      # create dev.db from schema
npm run seed         # demo data
npm run dev          # http://localhost:3000
```

Seeded logins: `admin / adminpass123`, users `ann`, `ben`, `cara` / `password123`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `start` | Production build / serve |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Playwright e2e (starts dev server) |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Create a migration |

Env vars (`DATABASE_URL`, `SESSION_SECRET`) live in `.env`; the Nix shell sets them too.

## Layout

- `app/(auth)` login · `app/(app)` user area · `app/admin` admin area
- `lib/` auth, db, session helpers · `prisma/` schema, migrations, seeds
- `tests/` unit · `e2e/` Playwright
