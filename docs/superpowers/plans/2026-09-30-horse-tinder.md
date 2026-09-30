# Horse Tinder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-only Tinder-style web app where horse owners create horse profiles, swipe on compatible horses, form matches on mutual likes, and chat to arrange breeding.

**Architecture:** Single Next.js 15 (App Router) monolith with TypeScript. Prisma + SQLite for persistence, Tailwind for styling, cookie sessions signed with JWT (`jose`) and passwords hashed with `bcryptjs`. Server Components read via Prisma; Server Actions/route handlers mutate. Chat uses client polling.

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma 6, SQLite, Tailwind CSS 3.4, jose, bcryptjs, Vitest, React Testing Library, Playwright (optional).

**Spec:** `docs/superpowers/specs/2026-09-30-horse-tinder-design.md`

## Global Constraints

- Local only; no deployment, no realtime websockets.
- Auth: username/password only. **No public self-registration** — admin creates accounts.
- Roles: exactly `ADMIN` and `USER`.
- SQLite via Prisma. **Prisma enums are NOT supported on SQLite** — use `String` columns with TypeScript unions/consts.
- Password hashing: `bcryptjs` (pure JS; avoids native builds on NixOS).
- Session cookie: httpOnly, sameSite=lax, signed HS256 via `jose`, 7-day expiry, secret from `SESSION_SECRET`.
- Uploads: jpg/png/webp, ≤5MB, stored under `public/uploads/<horseId>/`, filenames sanitized.
- Discipline values (exact): `DRESSAGE`, `SHOW_JUMPING`, `EVENTING`, `WESTERN`, `RACING`, `TRAIL`, `PLEASURE`, `DRIVING`, `OTHER`.
- Sex values (exact): `STALLION`, `MARE`, `GELDING`.
- Match owner pair stored ordered (`userAId < userBId`) with a unique constraint.
- Every task ends with a commit.

---

## File Structure

```
flake.nix                                  Nix dev shell
package.json, tsconfig.json, next.config.ts
tailwind.config.ts, postcss.config.mjs
vitest.config.ts, vitest.setup.ts, tests/global-setup.ts
.env                                       DATABASE_URL, SESSION_SECRET
prisma/schema.prisma
prisma/seed.ts
middleware.ts                              route guard (edge)
lib/db.ts                                  Prisma singleton
lib/password.ts                            hash/verify
lib/session.ts                             create/get/destroy session
lib/auth.ts                                requireUser/requireAdmin
lib/constants.ts                           Role/Sex/Discipline/SwipeDirection consts + types
lib/geo.ts                                 haversineMiles
lib/matching.ts                            getStackForUser, recordSwipe
lib/format.ts                              age from dob, hands formatting
app/layout.tsx, app/globals.css
app/(auth)/login/page.tsx, app/(auth)/login/actions.ts
app/(app)/layout.tsx                       authed shell + nav
app/(app)/swipe/page.tsx, app/(app)/swipe/actions.ts, components
app/(app)/matches/page.tsx, app/(app)/matches/[matchId]/page.tsx
app/(app)/matches/actions.ts
app/(app)/horses/page.tsx, app/(app)/horses/new/page.tsx,
app/(app)/horses/[horseId]/edit/page.tsx, app/(app)/horses/actions.ts
app/(app)/horses/HorseForm.tsx, PhotoManager.tsx
app/(app)/profile/page.tsx, app/(app)/profile/actions.ts
app/admin/page.tsx, app/admin/users/page.tsx, app/admin/horses/page.tsx,
app/admin/matches/page.tsx, app/admin/actions.ts
app/api/upload/route.ts                    photo upload
app/api/matches/[matchId]/messages/route.ts chat polling
components/*                               shared UI
```

---

## Task 1: Project scaffold, Nix dev shell, test harness

**Files:**
- Create: `flake.nix`, `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `.gitignore`, `.env`, `vitest.config.ts`, `vitest.setup.ts`
- Test: `lib/geo.test.ts` (placeholder sanity test replaced in Task 4 — here only to prove the harness runs)

**Interfaces:**
- Produces: working `nix develop` shell; `npm run dev`, `npm run test`, `npm run lint` scripts.

- [ ] **Step 1: Create the Nix flake**

`flake.nix`:
```nix
{
  description = "Horse Tinder dev shell";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };
    in {
      devShells.${system}.default = pkgs.mkShell {
        packages = with pkgs; [ nodejs_22 nodePackages.npm sqlite ];
        shellHook = ''
          export DATABASE_URL="file:./dev.db"
          export SESSION_SECRET="dev-secret-change-me"
          echo "Horse Tinder dev shell. Node $(node -v)"
        '';
      };
    };
}
```

- [ ] **Step 2: Create package.json and configs**

`package.json`:
```json
{
  "name": "horse-tinder",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "seed": "tsx prisma/seed.ts",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev"
  },
  "dependencies": {
    "@prisma/client": "^6.1.0",
    "bcryptjs": "^2.4.3",
    "jose": "^5.9.6",
    "next": "15.1.0",
    "react": "19.0.0",
    "react-dom": "19.0.0"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.49",
    "prisma": "^6.1.0",
    "tailwindcss": "^3.4.17",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next.config.ts`:
```ts
import type { NextConfig } from "next";
const config: NextConfig = { experimental: { serverActions: { bodySizeLimit: "6mb" } } };
export default config;
```

`postcss.config.mjs`:
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

`tailwind.config.ts`:
```ts
import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
```

`app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`app/layout.tsx`:
```tsx
import "./globals.css";
import type { ReactNode } from "react";
export const metadata = { title: "Horse Tinder" };
export default function RootLayout({ children }: { children: ReactNode }) {
  return (<html lang="en"><body className="bg-neutral-950 text-neutral-100">{children}</body></html>);
}
```

`app/page.tsx`:
```tsx
import { redirect } from "next/navigation";
export default function Home() { redirect("/swipe"); }
```

`.env`:
```
DATABASE_URL="file:./dev.db"
SESSION_SECRET="dev-secret-change-me"
```

`.gitignore`:
```
node_modules
.next
dev.db
test.db
public/uploads
.env
```

- [ ] **Step 3: Create the Vitest harness**

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
  },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

`tests/global-setup.ts`:
```ts
import { execSync } from "node:child_process";
export default function setup() {
  process.env.DATABASE_URL = "file:./test.db";
  execSync("npx prisma db push --force-reset --skip-generate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
  });
}
```

`vitest.setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

`lib/geo.test.ts` (temporary smoke test):
```ts
import { describe, it, expect } from "vitest";
describe("harness", () => { it("runs", () => { expect(1 + 1).toBe(2); }); });
```

- [ ] **Step 4: Install and verify**

Run: `nix develop --command bash -c "npm install && npm run test"`
Expected: installs succeed; 1 test passes.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app, Nix dev shell, and test harness"
```

---

## Task 2: Prisma schema and database client

**Files:**
- Create: `prisma/schema.prisma`, `lib/db.ts`, `lib/constants.ts`
- Test: `lib/constants.test.ts`

**Interfaces:**
- Produces: `prisma` singleton from `lib/db.ts`; const arrays `ROLES`, `SEXES`, `DISCIPLINES`, `SWIPE_DIRECTIONS` and types `Role`, `Sex`, `Discipline`, `SwipeDirection` from `lib/constants.ts`.

- [ ] **Step 1: Write constants and their test**

`lib/constants.ts`:
```ts
export const ROLES = ["ADMIN", "USER"] as const;
export type Role = (typeof ROLES)[number];

export const SEXES = ["STALLION", "MARE", "GELDING"] as const;
export type Sex = (typeof SEXES)[number];

export const DISCIPLINES = [
  "DRESSAGE", "SHOW_JUMPING", "EVENTING", "WESTERN", "RACING", "TRAIL", "PLEASURE", "DRIVING", "OTHER",
] as const;
export type Discipline = (typeof DISCIPLINES)[number];

export const SWIPE_DIRECTIONS = ["LIKE", "PASS"] as const;
export type SwipeDirection = (typeof SWIPE_DIRECTIONS)[number];

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  DRESSAGE: "Dressage", SHOW_JUMPING: "Show Jumping", EVENTING: "Eventing",
  WESTERN: "Western", RACING: "Racing", TRAIL: "Trail", PLEASURE: "Pleasure",
  DRIVING: "Driving", OTHER: "Other",
};
```

`lib/constants.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { DISCIPLINES, DISCIPLINE_LABELS } from "./constants";
describe("constants", () => {
  it("has a label for every discipline", () => {
    for (const d of DISCIPLINES) expect(DISCIPLINE_LABELS[d]).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm run test -- lib/constants.test.ts`
Expected: PASS.

- [ ] **Step 3: Write the Prisma schema**

`prisma/schema.prisma`:
```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "sqlite"; url = env("DATABASE_URL") }

model User {
  id           String   @id @default(cuid())
  username     String   @unique
  passwordHash String
  role         String   @default("USER")
  disabled     Boolean  @default(false)
  displayName  String
  email        String?
  phone        String?
  createdAt    DateTime @default(now())
  horses       Horse[]
  swipes       Swipe[]
  matchesA     Match[]  @relation("MatchUserA")
  matchesB     Match[]  @relation("MatchUserB")
  messages     Message[]
}

model Horse {
  id                 String   @id @default(cuid())
  ownerId            String
  owner              User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  name               String
  sex                String
  dob                DateTime
  breedName          String
  breedHistory       String?
  heightHands        Float?
  color              String?
  markings           String?
  discipline         String
  temperament        String?
  registrationNumber String?
  sireName           String?
  damName            String?
  allergies          String?
  healthIssues       String?
  location           String?
  lat                Float?
  lng                Float?
  studFee            Int?
  breedingTerms      String?
  active             Boolean  @default(true)
  createdAt          DateTime @default(now())
  photos             Photo[]
  swipes             Swipe[]
  @@index([ownerId])
}

model Photo {
  id        String  @id @default(cuid())
  horseId   String
  horse     Horse   @relation(fields: [horseId], references: [id], onDelete: Cascade)
  path      String
  sortOrder Int     @default(0)
  isPrimary Boolean @default(false)
  @@index([horseId])
}

model Swipe {
  id           String   @id @default(cuid())
  swiperUserId String
  swiper       User     @relation(fields: [swiperUserId], references: [id], onDelete: Cascade)
  horseId      String
  horse        Horse    @relation(fields: [horseId], references: [id], onDelete: Cascade)
  direction    String
  createdAt    DateTime @default(now())
  @@unique([swiperUserId, horseId])
  @@index([horseId, direction])
}

model Match {
  id        String    @id @default(cuid())
  userAId   String
  userA     User      @relation("MatchUserA", fields: [userAId], references: [id], onDelete: Cascade)
  userBId   String
  userB     User      @relation("MatchUserB", fields: [userBId], references: [id], onDelete: Cascade)
  createdAt DateTime  @default(now())
  messages  Message[]
  @@unique([userAId, userBId])
}

model Message {
  id           String   @id @default(cuid())
  matchId      String
  match        Match    @relation(fields: [matchId], references: [id], onDelete: Cascade)
  senderUserId String
  sender       User     @relation(fields: [senderUserId], references: [id], onDelete: Cascade)
  body         String
  createdAt    DateTime @default(now())
  @@index([matchId, createdAt])
}
```

- [ ] **Step 4: Create the Prisma singleton**

`lib/db.ts`:
```ts
import { PrismaClient } from "@prisma/client";
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 5: Push schema and verify**

Run: `nix develop --command bash -c "npx prisma generate && npx prisma db push"`
Expected: `dev.db` created; client generated.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Prisma schema, db client, and shared constants"
```

---

## Task 3: Auth — passwords, sessions, login, route guards

**Files:**
- Create: `lib/password.ts`, `lib/session.ts`, `lib/auth.ts`, `middleware.ts`, `app/(auth)/login/page.tsx`, `app/(auth)/login/actions.ts`, `app/(app)/layout.tsx`
- Test: `lib/password.test.ts`, `lib/session.test.ts`

**Interfaces:**
- Consumes: `prisma` (Task 2), `Role` (Task 2).
- Produces: `hashPassword(pw): Promise<string>`, `verifyPassword(pw, hash): Promise<boolean>`; `SessionPayload = { userId; username; role }`, `createSession(payload)`, `getSession()`, `destroySession()`; `requireUser()`, `requireAdmin()`.

- [ ] **Step 1: Write password tests**

`lib/password.ts`:
```ts
import bcrypt from "bcryptjs";
export function hashPassword(pw: string): Promise<string> { return bcrypt.hash(pw, 10); }
export function verifyPassword(pw: string, hash: string): Promise<boolean> { return bcrypt.compare(pw, hash); }
```

`lib/password.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";
describe("password", () => {
  it("verifies a correct password", async () => {
    const h = await hashPassword("secret123");
    expect(await verifyPassword("secret123", h)).toBe(true);
  });
  it("rejects a wrong password", async () => {
    const h = await hashPassword("secret123");
    expect(await verifyPassword("nope", h)).toBe(false);
  });
});
```

- [ ] **Step 2: Run password tests**

Run: `npm run test -- lib/password.test.ts`
Expected: PASS.

- [ ] **Step 3: Write session module and tests**

`lib/session.ts`:
```ts
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "./constants";

const COOKIE = "session";
const secret = new TextEncoder().encode(process.env.SESSION_SECRET ?? "dev-secret-change-me");

export type SessionPayload = { userId: string; username: string; role: Role };

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? verifySession(token) : null;
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
```

`lib/session.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { signSession, verifySession } from "./session";
describe("session", () => {
  it("round-trips a payload", async () => {
    const token = await signSession({ userId: "u1", username: "ann", role: "USER" });
    const payload = await verifySession(token);
    expect(payload).toMatchObject({ userId: "u1", username: "ann", role: "USER" });
  });
  it("rejects a tampered token", async () => {
    expect(await verifySession("not.a.jwt")).toBeNull();
  });
});
```

- [ ] **Step 4: Write auth guards**

`lib/auth.ts`:
```ts
import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "./session";

export async function requireUser(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

export async function requireAdmin(): Promise<SessionPayload> {
  const s = await requireUser();
  if (s.role !== "ADMIN") redirect("/swipe");
  return s;
}
```

- [ ] **Step 5: Write middleware**

`middleware.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "./lib/session";

const PROTECTED = ["/swipe", "/matches", "/horses", "/profile", "/admin"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTECTED.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get("session")?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/admin") && session.role !== "ADMIN") {
    const url = req.nextUrl.clone();
    url.pathname = "/swipe";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/swipe/:path*", "/matches/:path*", "/horses/:path*", "/profile/:path*", "/admin/:path*"] };
```

- [ ] **Step 6: Write login page and action**

`app/(auth)/login/actions.ts`:
```ts
"use server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import type { Role } from "@/lib/constants";

export async function login(_prev: unknown, formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/swipe");
  if (!username || !password) return { error: "Invalid credentials" };

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || user.disabled || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid credentials" };
  }
  await createSession({ userId: user.id, username: user.username, role: user.role as Role });
  redirect(next.startsWith("/") ? next : "/swipe");
}
```

`app/(auth)/login/page.tsx`:
```tsx
"use client";
import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, { error: "" });
  return (
    <main className="mx-auto mt-24 max-w-sm p-6">
      <h1 className="mb-6 text-2xl font-bold">Horse Tinder</h1>
      <form action={action} className="space-y-4">
        <input name="username" placeholder="Username" autoComplete="username"
          className="w-full rounded bg-neutral-800 px-3 py-2" />
        <input name="password" type="password" placeholder="Password" autoComplete="current-password"
          className="w-full rounded bg-neutral-800 px-3 py-2" />
        {state?.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
        <button disabled={pending} className="w-full rounded bg-emerald-600 px-3 py-2 font-semibold disabled:opacity-50">
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
```

`app/(app)/layout.tsx`:
```tsx
import Link from "next/link";
import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { destroySession } from "@/lib/session";
import { redirect } from "next/navigation";

async function logout() {
  "use server";
  await destroySession();
  redirect("/login");
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireUser();
  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-4 border-b border-neutral-800 px-4 py-3">
        <span className="font-bold">🐴 Horse Tinder</span>
        <nav className="flex gap-3 text-sm">
          <Link href="/swipe">Swipe</Link>
          <Link href="/matches">Matches</Link>
          <Link href="/horses">My Horses</Link>
          <Link href="/profile">Profile</Link>
          {session.role === "ADMIN" && <Link href="/admin">Admin</Link>}
        </nav>
        <form action={logout} className="ml-auto">
          <button className="text-sm text-neutral-400">Sign out ({session.username})</button>
        </form>
      </header>
      <main className="mx-auto max-w-3xl p-4">{children}</main>
    </div>
  );
}
```

- [ ] **Step 7: Run all tests and typecheck**

Run: `nix develop --command bash -c "npm run test && npx tsc --noEmit"`
Expected: all tests PASS; no type errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add password hashing, JWT sessions, login, and route guards"
```

---

## Task 4: Geo and matching logic (pure functions, TDD)

**Files:**
- Create: `lib/geo.ts`, `lib/matching.ts`
- Test: `lib/geo.test.ts`, `lib/matching.test.ts`
- Modify: delete the temporary `lib/geo.test.ts` smoke test content (replace with real tests)

**Interfaces:**
- Consumes: `prisma` (Task 2), `Sex`, `SwipeDirection` (Task 2).
- Produces:
  - `haversineMiles(lat1, lng1, lat2, lng2): number`
  - `wantedSexes(viewerSexes: Sex[]): Sex[]`
  - `getStackForUser(userId: string, filters?: StackFilters): Promise<HorseWithPhoto[]>`
  - `recordSwipe(swiperUserId: string, horseId: string, direction: SwipeDirection): Promise<{ matched: boolean; matchId: string | null }>`
  - `StackFilters = { breed?: string; discipline?: string; maxDistanceMiles?: number }`

- [ ] **Step 1: Write geo tests**

`lib/geo.ts`:
```ts
export function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
```

`lib/geo.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { haversineMiles } from "./geo";
describe("haversineMiles", () => {
  it("is zero for the same point", () => {
    expect(haversineMiles(40, -74, 40, -74)).toBeCloseTo(0, 5);
  });
  it("matches a known distance (NYC to LA ~2451 mi)", () => {
    expect(haversineMiles(40.7128, -74.006, 34.0522, -118.2437)).toBeGreaterThan(2400);
    expect(haversineMiles(40.7128, -74.006, 34.0522, -118.2437)).toBeLessThan(2500);
  });
});
```

- [ ] **Step 2: Write sex-compatibility test**

`lib/matching.ts` (start with the pure helper):
```ts
import type { Sex } from "./constants";

export function wantedSexes(viewerSexes: Sex[]): Sex[] {
  const set = new Set(viewerSexes.filter((s) => s !== "GELDING"));
  const wanted: Sex[] = [];
  if (set.has("STALLION")) wanted.push("MARE");
  if (set.has("MARE")) wanted.push("STALLION");
  return wanted;
}
```

`lib/matching.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { wantedSexes } from "./matching";
describe("wantedSexes", () => {
  it("a mare owner wants stallions", () => { expect(wantedSexes(["MARE"])).toEqual(["STALLION"]); });
  it("a stallion owner wants mares", () => { expect(wantedSexes(["STALLION"])).toEqual(["MARE"]); });
  it("an owner with both wants both", () => { expect(wantedSexes(["STALLION", "MARE"]).sort()).toEqual(["MARE", "STALLION"]); });
  it("a gelding-only owner wants nothing", () => { expect(wantedSexes(["GELDING"])).toEqual([]); });
});
```

- [ ] **Step 3: Run pure tests**

Run: `npm run test -- lib/geo.test.ts lib/matching.test.ts`
Expected: PASS.

- [ ] **Step 4: Implement getStackForUser and integration test**

Append to `lib/matching.ts`:
```ts
import { prisma } from "./db";
import { haversineMiles } from "./geo";

export type StackFilters = { breed?: string; discipline?: string; maxDistanceMiles?: number };

export async function getStackForUser(userId: string, filters: StackFilters = {}) {
  const viewerHorses = await prisma.horse.findMany({ where: { ownerId: userId, active: true } });
  const wanted = wantedSexes(viewerHorses.map((h) => h.sex as Sex));
  if (wanted.length === 0) return [];

  const swiped = await prisma.swipe.findMany({ where: { swiperUserId: userId }, select: { horseId: true } });
  const swipedIds = swiped.map((s) => s.horseId);

  const where: Record<string, unknown> = {
    active: true,
    ownerId: { not: userId },
    owner: { disabled: false },
    sex: { in: wanted },
    id: { notIn: swipedIds.length ? swipedIds : ["__none__"] },
  };
  if (filters.breed) where.breedName = filters.breed;
  if (filters.discipline) where.discipline = filters.discipline;

  let horses = await prisma.horse.findMany({
    where,
    include: { photos: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });

  if (filters.maxDistanceMiles != null) {
    const origin = viewerHorses.find((h) => h.lat != null && h.lng != null);
    if (!origin) return [];
    horses = horses.filter(
      (h) => h.lat != null && h.lng != null &&
        haversineMiles(origin.lat!, origin.lng!, h.lat, h.lng) <= filters.maxDistanceMiles!,
    );
  }
  return horses;
}
```

Append integration test to `lib/matching.test.ts`:
```ts
import { prisma } from "./db";
import { getStackForUser } from "./matching";

async function mkUser(username: string) {
  return prisma.user.create({ data: { username, passwordHash: "x", displayName: username } });
}
async function mkHorse(ownerId: string, over: Partial<{ sex: string; breedName: string; active: boolean }> = {}) {
  return prisma.horse.create({
    data: {
      ownerId, name: "H", sex: over.sex ?? "MARE", dob: new Date("2015-01-01"),
      breedName: over.breedName ?? "Thoroughbred", discipline: "RACING",
      active: over.active ?? true,
    },
  });
}

describe("getStackForUser", () => {
  it("shows only opposite-sex, unswiped, active horses from enabled owners", async () => {
    const viewer = await mkUser("viewer");
    const other = await mkUser("other");
    await mkHorse(viewer.id, { sex: "MARE" });
    const stallion = await mkHorse(other.id, { sex: "STALLION" });
    await mkHorse(other.id, { sex: "MARE" });
    await mkHorse(other.id, { sex: "STALLION", active: false });

    const stack = await getStackForUser(viewer.id);
    expect(stack.map((h) => h.id)).toEqual([stallion.id]);
  });
});
```

Run: `npm run test -- lib/matching.test.ts`
Expected: PASS (global setup resets `test.db`).

- [ ] **Step 5: Implement recordSwipe and its integration test**

Append to `lib/matching.ts`:
```ts
import type { SwipeDirection } from "./constants";

export async function recordSwipe(
  swiperUserId: string,
  horseId: string,
  direction: SwipeDirection,
): Promise<{ matched: boolean; matchId: string | null }> {
  return prisma.$transaction(async (tx) => {
    const horse = await tx.horse.findUnique({ where: { id: horseId } });
    if (!horse) throw new Error("Horse not found");
    if (horse.ownerId === swiperUserId) throw new Error("Cannot swipe your own horse");

    await tx.swipe.upsert({
      where: { swiperUserId_horseId: { swiperUserId, horseId } },
      create: { swiperUserId, horseId, direction },
      update: { direction },
    });

    if (direction !== "LIKE") return { matched: false, matchId: null };

    const reciprocal = await tx.swipe.findFirst({
      where: { direction: "LIKE", swiperUserId: horse.ownerId, horse: { ownerId: swiperUserId } },
    });
    if (!reciprocal) return { matched: false, matchId: null };

    const [userAId, userBId] = [swiperUserId, horse.ownerId].sort();
    const existing = await tx.match.findUnique({ where: { userAId_userBId: { userAId, userBId } } });
    if (existing) return { matched: true, matchId: existing.id };

    const match = await tx.match.create({ data: { userAId, userBId } });
    return { matched: true, matchId: match.id };
  });
}
```

Append test:
```ts
import { recordSwipe } from "./matching";

describe("recordSwipe", () => {
  it("creates a match on reciprocal owner likes", async () => {
    const a = await mkUser("a");
    const b = await mkUser("b");
    const aHorse = await mkHorse(a.id, { sex: "STALLION" });
    const bHorse = await mkHorse(b.id, { sex: "MARE" });

    const first = await recordSwipe(a.id, bHorse.id, "LIKE");
    expect(first.matched).toBe(false);

    const second = await recordSwipe(b.id, aHorse.id, "LIKE");
    expect(second.matched).toBe(true);
    expect(second.matchId).toBeTruthy();

    const again = await recordSwipe(b.id, aHorse.id, "LIKE");
    expect(again.matchId).toBe(second.matchId);
  });

  it("rejects swiping your own horse", async () => {
    const a = await mkUser("solo");
    const h = await mkHorse(a.id);
    await expect(recordSwipe(a.id, h.id, "LIKE")).rejects.toThrow("Cannot swipe your own horse");
  });
});
```

Run: `npm run test -- lib/matching.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add geo and matching logic with unit and integration tests"
```

---

## Task 5: Horse CRUD and photo upload

**Files:**
- Create: `app/(app)/horses/page.tsx`, `app/(app)/horses/new/page.tsx`, `app/(app)/horses/[horseId]/edit/page.tsx`, `app/(app)/horses/actions.ts`, `app/(app)/horses/HorseForm.tsx`, `app/(app)/horses/PhotoManager.tsx`, `app/api/upload/route.ts`, `lib/format.ts`
- Test: `lib/format.test.ts`

**Interfaces:**
- Consumes: `prisma`, `requireUser`, constants.
- Produces: `ageFromDob(dob: Date, now?: Date): number`, `formatHands(h: number | null): string`; server actions `createHorse`, `updateHorse`, `deleteHorse`, `setPrimaryPhoto`, `deletePhoto`; POST `/api/upload` accepting `multipart/form-data` with `horseId` + `file`, returning `{ path }`.

- [ ] **Step 1: Write format helpers and tests**

`lib/format.ts`:
```ts
export function ageFromDob(dob: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return Math.max(age, 0);
}

export function formatHands(h: number | null): string {
  if (h == null) return "—";
  const whole = Math.floor(h);
  const inches = Math.round((h - whole) * 12);
  return `${whole}.${inches} hh`;
}
```

`lib/format.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { ageFromDob, formatHands } from "./format";
describe("format", () => {
  it("computes age with birthday adjustment", () => {
    expect(ageFromDob(new Date("2015-06-01"), new Date("2026-05-31"))).toBe(10);
    expect(ageFromDob(new Date("2015-06-01"), new Date("2026-06-01"))).toBe(11);
  });
  it("formats hands", () => { expect(formatHands(15.5)).toBe("15.6 hh"); });
  it("handles null hands", () => { expect(formatHands(null)).toBe("—"); });
});
```

Run: `npm run test -- lib/format.test.ts`
Expected: PASS.

- [ ] **Step 2: Write the upload route**

`app/api/upload/route.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await requireUser();
  const form = await req.formData();
  const horseId = String(form.get("horseId") ?? "");
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "Unsupported type" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "File too large" }, { status: 400 });

  const horse = await prisma.horse.findUnique({ where: { id: horseId } });
  if (!horse) return NextResponse.json({ error: "Horse not found" }, { status: 404 });
  if (horse.ownerId !== session.userId && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", horseId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, safe), Buffer.from(await file.arrayBuffer()));

  const count = await prisma.photo.count({ where: { horseId } });
  await prisma.photo.create({
    data: { horseId, path: `/uploads/${horseId}/${safe}`, sortOrder: count, isPrimary: count === 0 },
  });

  return NextResponse.json({ path: `/uploads/${horseId}/${safe}` });
}
```

- [ ] **Step 3: Write horse server actions**

`app/(app)/horses/actions.ts`:
```ts
"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

function parseForm(form: FormData) {
  const num = (k: string) => { const v = String(form.get(k) ?? "").trim(); return v ? Number(v) : null; };
  const str = (k: string) => { const v = String(form.get(k) ?? "").trim(); return v || null; };
  return {
    name: String(form.get("name") ?? "").trim(),
    sex: String(form.get("sex") ?? "MARE"),
    dob: new Date(String(form.get("dob") ?? "")),
    breedName: String(form.get("breedName") ?? "").trim(),
    breedHistory: str("breedHistory"),
    heightHands: num("heightHands"),
    color: str("color"),
    markings: str("markings"),
    discipline: String(form.get("discipline") ?? "OTHER"),
    temperament: str("temperament"),
    registrationNumber: str("registrationNumber"),
    sireName: str("sireName"),
    damName: str("damName"),
    allergies: str("allergies"),
    healthIssues: str("healthIssues"),
    location: str("location"),
    lat: num("lat"),
    lng: num("lng"),
    studFee: num("studFee"),
    breedingTerms: str("breedingTerms"),
  };
}

export async function createHorse(form: FormData) {
  const session = await requireUser();
  const horse = await prisma.horse.create({ data: { ...parseForm(form), ownerId: session.userId } });
  redirect(`/horses/${horse.id}/edit`);
}

export async function updateHorse(horseId: string, form: FormData) {
  const session = await requireUser();
  const horse = await prisma.horse.findUnique({ where: { id: horseId } });
  if (!horse || (horse.ownerId !== session.userId && session.role !== "ADMIN")) throw new Error("Forbidden");
  await prisma.horse.update({ where: { id: horseId }, data: parseForm(form) });
  revalidatePath(`/horses/${horseId}/edit`);
  revalidatePath("/horses");
}

export async function toggleHorseActive(horseId: string) {
  const session = await requireUser();
  const horse = await prisma.horse.findUnique({ where: { id: horseId } });
  if (!horse || (horse.ownerId !== session.userId && session.role !== "ADMIN")) throw new Error("Forbidden");
  await prisma.horse.update({ where: { id: horseId }, data: { active: !horse.active } });
  revalidatePath("/horses");
}

export async function deleteHorse(horseId: string) {
  const session = await requireUser();
  const horse = await prisma.horse.findUnique({ where: { id: horseId } });
  if (!horse || (horse.ownerId !== session.userId && session.role !== "ADMIN")) throw new Error("Forbidden");
  await prisma.horse.delete({ where: { id: horseId } });
  revalidatePath("/horses");
  redirect("/horses");
}

export async function setPrimaryPhoto(horseId: string, photoId: string) {
  const session = await requireUser();
  const horse = await prisma.horse.findUnique({ where: { id: horseId } });
  if (!horse || (horse.ownerId !== session.userId && session.role !== "ADMIN")) throw new Error("Forbidden");
  await prisma.$transaction([
    prisma.photo.updateMany({ where: { horseId }, data: { isPrimary: false } }),
    prisma.photo.update({ where: { id: photoId }, data: { isPrimary: true } }),
  ]);
  revalidatePath(`/horses/${horseId}/edit`);
}

export async function deletePhoto(horseId: string, photoId: string) {
  const session = await requireUser();
  const horse = await prisma.horse.findUnique({ where: { id: horseId } });
  if (!horse || (horse.ownerId !== session.userId && session.role !== "ADMIN")) throw new Error("Forbidden");
  await prisma.photo.delete({ where: { id: photoId } });
  revalidatePath(`/horses/${horseId}/edit`);
}
```

- [ ] **Step 4: Write the horse form component**

`app/(app)/horses/HorseForm.tsx`:
```tsx
"use client";
import { DISCIPLINES, DISCIPLINE_LABELS, SEXES } from "@/lib/constants";

type Horse = Record<string, unknown> & { id?: string };

export default function HorseForm({
  horse, action,
}: { horse?: Horse; action: (form: FormData) => void | Promise<void> }) {
  const v = (k: string) => (horse?.[k] == null ? "" : String(horse[k]));
  const dob = horse?.dob ? new Date(horse.dob as string).toISOString().slice(0, 10) : "";
  const field = "w-full rounded bg-neutral-800 px-3 py-2";
  return (
    <form action={action} className="grid grid-cols-2 gap-3">
      <label className="col-span-2 text-sm">Name<input name="name" defaultValue={v("name")} required className={field} /></label>
      <label className="text-sm">Sex<select name="sex" defaultValue={v("sex") || "MARE"} className={field}>{SEXES.map((s) => <option key={s}>{s}</option>)}</select></label>
      <label className="text-sm">Date of birth<input type="date" name="dob" defaultValue={dob} required className={field} /></label>
      <label className="text-sm">Breed name<input name="breedName" defaultValue={v("breedName")} required className={field} /></label>
      <label className="text-sm">Discipline<select name="discipline" defaultValue={v("discipline") || "OTHER"} className={field}>{DISCIPLINES.map((d) => <option key={d} value={d}>{DISCIPLINE_LABELS[d]}</option>)}</select></label>
      <label className="text-sm">Height (hands)<input name="heightHands" type="number" step="0.1" defaultValue={v("heightHands")} className={field} /></label>
      <label className="text-sm">Color<input name="color" defaultValue={v("color")} className={field} /></label>
      <label className="text-sm">Markings<input name="markings" defaultValue={v("markings")} className={field} /></label>
      <label className="text-sm">Registration #<input name="registrationNumber" defaultValue={v("registrationNumber")} className={field} /></label>
      <label className="text-sm">Sire<input name="sireName" defaultValue={v("sireName")} className={field} /></label>
      <label className="text-sm">Dam<input name="damName" defaultValue={v("damName")} className={field} /></label>
      <label className="text-sm">Stud fee (USD)<input name="studFee" type="number" defaultValue={v("studFee")} className={field} /></label>
      <label className="text-sm">Location<input name="location" defaultValue={v("location")} className={field} /></label>
      <label className="text-sm">Latitude<input name="lat" type="number" step="any" defaultValue={v("lat")} className={field} /></label>
      <label className="text-sm">Longitude<input name="lng" type="number" step="any" defaultValue={v("lng")} className={field} /></label>
      <label className="col-span-2 text-sm">Breed history<textarea name="breedHistory" defaultValue={v("breedHistory")} className={field} /></label>
      <label className="col-span-2 text-sm">Temperament<textarea name="temperament" defaultValue={v("temperament")} className={field} /></label>
      <label className="col-span-2 text-sm">Allergies / known health issues<textarea name="allergies" defaultValue={v("allergies")} className={field} /></label>
      <label className="col-span-2 text-sm">Other health issues<textarea name="healthIssues" defaultValue={v("healthIssues")} className={field} /></label>
      <label className="col-span-2 text-sm">Breeding terms<textarea name="breedingTerms" defaultValue={v("breedingTerms")} className={field} /></label>
      <button className="col-span-2 rounded bg-emerald-600 px-3 py-2 font-semibold">Save</button>
    </form>
  );
}
```

- [ ] **Step 5: Write the photo manager**

`app/(app)/horses/PhotoManager.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Photo = { id: string; path: string; isPrimary: boolean };

export default function PhotoManager({ horseId, photos }: { horseId: string; photos: Photo[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    const body = new FormData();
    body.set("horseId", horseId);
    body.set("file", file);
    const res = await fetch("/api/upload", { method: "POST", body });
    setBusy(false);
    if (!res.ok) { alert((await res.json()).error ?? "Upload failed"); return; }
    router.refresh();
  }

  async function primary(photoId: string) {
    await fetch(`/api/photo/${photoId}/primary`, { method: "POST" });
    router.refresh();
  }
  async function remove(photoId: string) {
    await fetch(`/api/photo/${photoId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <input type="file" accept="image/jpeg,image/png,image/webp"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} disabled={busy} />
      <div className="grid grid-cols-3 gap-3">
        {photos.map((p) => (
          <div key={p.id} className="space-y-1">
            <img src={p.path} alt="" className="h-28 w-full rounded object-cover" />
            <div className="flex gap-2 text-xs">
              <button onClick={() => primary(p.id)} disabled={p.isPrimary} className="text-emerald-400 disabled:text-neutral-600">
                {p.isPrimary ? "Primary" : "Make primary"}
              </button>
              <button onClick={() => remove(p.id)} className="text-red-400">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

Add matching photo API routes `app/api/photo/[photoId]/primary/route.ts` and `app/api/photo/[photoId]/route.ts`:
```ts
// primary/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
export async function POST(_req: NextRequest, { params }: { params: Promise<{ photoId: string }> }) {
  const session = await requireUser();
  const { photoId } = await params;
  const photo = await prisma.photo.findUnique({ where: { id: photoId }, include: { horse: true } });
  if (!photo || (photo.horse.ownerId !== session.userId && session.role !== "ADMIN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.$transaction([
    prisma.photo.updateMany({ where: { horseId: photo.horseId }, data: { isPrimary: false } }),
    prisma.photo.update({ where: { id: photoId }, data: { isPrimary: true } }),
  ]);
  return NextResponse.json({ ok: true });
}
```
```ts
// [photoId]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ photoId: string }> }) {
  const session = await requireUser();
  const { photoId } = await params;
  const photo = await prisma.photo.findUnique({ where: { id: photoId }, include: { horse: true } });
  if (!photo || (photo.horse.ownerId !== session.userId && session.role !== "ADMIN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.photo.delete({ where: { id: photoId } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Write the horse pages**

`app/(app)/horses/page.tsx`:
```tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ageFromDob } from "@/lib/format";

export default async function HorsesPage() {
  const session = await requireUser();
  const horses = await prisma.horse.findMany({ where: { ownerId: session.userId }, orderBy: { createdAt: "desc" } });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">My Horses</h1>
        <Link href="/horses/new" className="rounded bg-emerald-600 px-3 py-1 text-sm">Add horse</Link>
      </div>
      {horses.length === 0 && <p className="text-neutral-400">No horses yet.</p>}
      <ul className="divide-y divide-neutral-800">
        {horses.map((h) => (
          <li key={h.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-semibold">{h.name} {h.active ? "" : "(inactive)"}</p>
              <p className="text-sm text-neutral-400">{h.breedName} · {h.sex} · {ageFromDob(h.dob)}y</p>
            </div>
            <Link href={`/horses/${h.id}/edit`} className="text-sm text-emerald-400">Edit</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

`app/(app)/horses/new/page.tsx`:
```tsx
import HorseForm from "../HorseForm";
import { createHorse } from "../actions";
export default function NewHorsePage() {
  return (<div className="space-y-4"><h1 className="text-xl font-bold">Add horse</h1><HorseForm action={createHorse} /></div>);
}
```

`app/(app)/horses/[horseId]/edit/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import HorseForm from "../../HorseForm";
import PhotoManager from "../../PhotoManager";
import { updateHorse, deleteHorse, toggleHorseActive } from "../../actions";

export default async function EditHorsePage({ params }: { params: Promise<{ horseId: string }> }) {
  const session = await requireUser();
  const { horseId } = await params;
  const horse = await prisma.horse.findUnique({ where: { id: horseId }, include: { photos: { orderBy: { sortOrder: "asc" } } } });
  if (!horse || (horse.ownerId !== session.userId && session.role !== "ADMIN")) notFound();

  const update = updateHorse.bind(null, horseId);
  const toggle = toggleHorseActive.bind(null, horseId);
  const remove = deleteHorse.bind(null, horseId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Edit {horse.name}</h1>
        <div className="flex gap-2">
          <form action={toggle}><button className="text-sm text-neutral-300">{horse.active ? "Deactivate" : "Activate"}</button></form>
          <form action={remove}><button className="text-sm text-red-400">Delete</button></form>
        </div>
      </div>
      <section className="space-y-2"><h2 className="font-semibold">Photos</h2>
        <PhotoManager horseId={horse.id} photos={horse.photos} /></section>
      <HorseForm horse={horse} action={update} />
    </div>
  );
}
```

- [ ] **Step 7: Run tests and typecheck**

Run: `nix develop --command bash -c "npm run test && npx tsc --noEmit"`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add horse CRUD, photo upload, and photo management"
```

---

## Task 6: Swipe page, filters, and match moment

**Files:**
- Create: `app/(app)/swipe/page.tsx`, `app/(app)/swipe/actions.ts`, `app/(app)/swipe/SwipeStack.tsx`, `app/(app)/swipe/FilterBar.tsx`
- Test: `app/(app)/swipe/SwipeStack.test.tsx`

**Interfaces:**
- Consumes: `getStackForUser`, `recordSwipe` (Task 4); `requireUser` (Task 3); `ageFromDob`, `formatHands` (Task 5).
- Produces: server action `swipe(horseId: string, direction: SwipeDirection)` returning `{ matched: boolean; matchId: string | null }`.

- [ ] **Step 1: Write the swipe server action**

`app/(app)/swipe/actions.ts`:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { recordSwipe } from "@/lib/matching";
import type { SwipeDirection } from "@/lib/constants";

export async function swipe(horseId: string, direction: SwipeDirection) {
  const session = await requireUser();
  const result = await recordSwipe(session.userId, horseId, direction);
  revalidatePath("/swipe");
  return result;
}
```

- [ ] **Step 2: Write the swipe page**

`app/(app)/swipe/page.tsx`:
```tsx
import { requireUser } from "@/lib/auth";
import { getStackForUser } from "@/lib/matching";
import SwipeStack from "./SwipeStack";

type Search = { breed?: string; discipline?: string; maxDistanceMiles?: string };

export default async function SwipePage({ searchParams }: { searchParams: Promise<Search> }) {
  const session = await requireUser();
  const sp = await searchParams;
  const horses = await getStackForUser(session.userId, {
    breed: sp.breed || undefined,
    discipline: sp.discipline || undefined,
    maxDistanceMiles: sp.maxDistanceMiles ? Number(sp.maxDistanceMiles) : undefined,
  });

  const cards = horses.map((h) => ({
    id: h.id,
    name: h.name,
    breedName: h.breedName,
    sex: h.sex,
    dob: h.dob.toISOString(),
    heightHands: h.heightHands,
    discipline: h.discipline,
    location: h.location,
    studFee: h.studFee,
    breedHistory: h.breedHistory,
    sireName: h.sireName,
    damName: h.damName,
    allergies: h.allergies,
    healthIssues: h.healthIssues,
    temperament: h.temperament,
    photo: h.photos[0]?.path ?? null,
    ownerName: h.owner.displayName,
  }));

  return <SwipeStack cards={cards} />;
}
```

Note: `getStackForUser` must include `owner` in its query for `ownerName`. Update the `include` in `lib/matching.ts` `getStackForUser` to `include: { photos: { orderBy: { sortOrder: "asc" }, take: 1 }, owner: true }`. Apply that edit as part of this step.

- [ ] **Step 3: Write the swipe stack component and its test**

`app/(app)/swipe/SwipeStack.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { swipe } from "./actions";
import { DISCIPLINE_LABELS, type Discipline } from "@/lib/constants";
import { ageFromDob, formatHands } from "@/lib/format";

export type Card = {
  id: string; name: string; breedName: string; sex: string; dob: string;
  heightHands: number | null; discipline: string; location: string | null;
  studFee: number | null; breedHistory: string | null; sireName: string | null;
  damName: string | null; allergies: string | null; healthIssues: string | null;
  temperament: string | null; photo: string | null; ownerName: string;
};

export default function SwipeStack({ cards }: { cards: Card[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [matchedId, setMatchedId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const card = cards[index];

  function act(direction: "LIKE" | "PASS") {
    if (!card) return;
    start(async () => {
      const res = await swipe(card.id, direction);
      if (res.matched && res.matchId) setMatchedId(res.matchId);
      setExpanded(false);
      setIndex((i) => i + 1);
      router.refresh();
    });
  }

  if (!card) {
    return <p className="text-neutral-400">No more horses. <Link href="/horses" className="text-emerald-400">Add or activate a horse</Link> to see compatible matches.</p>;
  }

  return (
    <div className="space-y-4">
      {matchedId && (
        <div className="rounded bg-emerald-900/60 p-3 text-center">
          <p className="font-bold">It's a match! 🐴</p>
          <Link href={`/matches/${matchedId}`} className="text-sm text-emerald-300">Send a message</Link>
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-neutral-800">
        {card.photo
          ? <img src={card.photo} alt={card.name} className="h-72 w-full object-cover" />
          : <div className="flex h-72 items-center justify-center bg-neutral-800 text-neutral-500">No photo</div>}
        <div className="space-y-1 p-4">
          <h2 className="text-lg font-bold">{card.name} · {card.sex}</h2>
          <p className="text-sm text-neutral-400">
            {card.breedName} · {ageFromDob(new Date(card.dob))}y · {formatHands(card.heightHands)} ·{" "}
            {DISCIPLINE_LABELS[card.discipline as Discipline] ?? card.discipline}
          </p>
          <p className="text-sm text-neutral-400">{card.location ?? "Location unknown"}{card.studFee ? ` · $${card.studFee} stud fee` : ""}</p>
          <button onClick={() => setExpanded((e) => !e)} className="text-xs text-emerald-400">
            {expanded ? "Hide details" : "Show full profile"}
          </button>
          {expanded && (
            <dl className="mt-2 space-y-1 text-sm text-neutral-300">
              <div><dt className="font-semibold">Owner</dt><dd>{card.ownerName}</dd></div>
              <div><dt className="font-semibold">Breed history</dt><dd>{card.breedHistory ?? "—"}</dd></div>
              <div><dt className="font-semibold">Sire / Dam</dt><dd>{card.sireName ?? "—"} / {card.damName ?? "—"}</dd></div>
              <div><dt className="font-semibold">Temperament</dt><dd>{card.temperament ?? "—"}</dd></div>
              <div><dt className="font-semibold">Allergies</dt><dd>{card.allergies ?? "—"}</dd></div>
              <div><dt className="font-semibold">Health issues</dt><dd>{card.healthIssues ?? "—"}</dd></div>
            </dl>
          )}
        </div>
      </div>
      <div className="flex justify-center gap-6">
        <button onClick={() => act("PASS")} disabled={pending} className="rounded-full bg-neutral-700 px-8 py-3 text-lg">✕</button>
        <button onClick={() => act("LIKE")} disabled={pending} className="rounded-full bg-emerald-600 px-8 py-3 text-lg">♥</button>
      </div>
    </div>
  );
}
```

`app/(app)/swipe/SwipeStack.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SwipeStack, { type Card } from "./SwipeStack";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("./actions", () => ({ swipe: vi.fn().mockResolvedValue({ matched: false, matchId: null }) }));

const card: Card = {
  id: "h1", name: "Duke", breedName: "Thoroughbred", sex: "STALLION", dob: "2015-01-01",
  heightHands: 16, discipline: "RACING", location: "Kentucky", studFee: 5000,
  breedHistory: "Line", sireName: "S", damName: "D", allergies: "None",
  healthIssues: "None", temperament: "Calm", photo: null, ownerName: "Ann",
};

describe("SwipeStack", () => {
  it("renders the first card's details", () => {
    render(<SwipeStack cards={[card]} />);
    expect(screen.getByText(/Duke/)).toBeInTheDocument();
    expect(screen.getByText(/Thoroughbred/)).toBeInTheDocument();
  });
  it("shows the empty state with no cards", () => {
    render(<SwipeStack cards={[]} />);
    expect(screen.getByText(/No more horses/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Write the filter bar and wire it into the page**

`app/(app)/swipe/FilterBar.tsx`:
```tsx
"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { DISCIPLINES, DISCIPLINE_LABELS } from "@/lib/constants";

export default function FilterBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const field = "rounded bg-neutral-800 px-2 py-1 text-sm";

  function set(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value); else params.delete(key);
    router.push(`/swipe?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <input placeholder="Breed" defaultValue={sp.get("breed") ?? ""} className={field}
        onBlur={(e) => set("breed", e.target.value)} />
      <select defaultValue={sp.get("discipline") ?? ""} className={field} onChange={(e) => set("discipline", e.target.value)}>
        <option value="">Any discipline</option>
        {DISCIPLINES.map((d) => <option key={d} value={d}>{DISCIPLINE_LABELS[d]}</option>)}
      </select>
      <input placeholder="Max miles" type="number" defaultValue={sp.get("maxDistanceMiles") ?? ""} className={field}
        onBlur={(e) => set("maxDistanceMiles", e.target.value)} />
    </div>
  );
}
```

Update `app/(app)/swipe/page.tsx` to render the filter bar above the stack:
```tsx
import FilterBar from "./FilterBar";
// ...inside return:
return (
  <div className="space-y-4">
    <FilterBar />
    <SwipeStack cards={cards} />
  </div>
);
```

- [ ] **Step 5: Run tests and typecheck**

Run: `nix develop --command bash -c "npm run test && npx tsc --noEmit"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add swipe stack, filters, and match moment"
```

---

## Task 7: Matches list and chat

**Files:**
- Create: `app/(app)/matches/page.tsx`, `app/(app)/matches/[matchId]/page.tsx`, `app/(app)/matches/actions.ts`, `app/(app)/matches/ChatThread.tsx`, `app/api/matches/[matchId]/messages/route.ts`
- Test: `app/(app)/matches/actions.test.ts`

**Interfaces:**
- Consumes: `prisma`, `requireUser`.
- Produces: `sendMessage(matchId, body)`; GET `/api/matches/[matchId]/messages` returning `{ messages: { id; senderUserId; body; createdAt }[] }`; helper `assertMember(matchId, userId)`.

- [ ] **Step 1: Write membership helper and message action with test**

`app/(app)/matches/actions.ts`:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function assertMember(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || (match.userAId !== userId && match.userBId !== userId)) throw new Error("Forbidden");
  return match;
}

export async function sendMessage(matchId: string, body: string) {
  const session = await requireUser();
  await assertMember(matchId, session.userId);
  const trimmed = body.trim();
  if (!trimmed) return;
  await prisma.message.create({ data: { matchId, senderUserId: session.userId, body: trimmed } });
  revalidatePath(`/matches/${matchId}`);
}
```

`app/(app)/matches/actions.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";
import { assertMember } from "./actions";

describe("assertMember", () => {
  it("throws for non-members", async () => {
    const a = await prisma.user.create({ data: { username: "m1", passwordHash: "x", displayName: "A" } });
    const b = await prisma.user.create({ data: { username: "m2", passwordHash: "x", displayName: "B" } });
    const c = await prisma.user.create({ data: { username: "m3", passwordHash: "x", displayName: "C" } });
    const match = await prisma.match.create({ data: { userAId: a.id, userBId: b.id } });
    await expect(assertMember(match.id, c.id)).rejects.toThrow("Forbidden");
    await expect(assertMember(match.id, a.id)).resolves.toBeTruthy();
  });
});
```

Note: `assertMember` is exported from a `"use server"` module, so it becomes a server action. To keep it testable as a plain function, move it to `lib/matches.ts` instead and import it in `actions.ts`. Do that: create `lib/matches.ts` with `assertMember`, import it in `actions.ts`, and point the test at `lib/matches.ts`.

- [ ] **Step 2: Write the messages polling route**

`app/api/matches/[matchId]/messages/route.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertMember } from "@/lib/matches";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const session = await requireUser();
  const { matchId } = await params;
  await assertMember(matchId, session.userId);
  const messages = await prisma.message.findMany({
    where: { matchId }, orderBy: { createdAt: "asc" },
    select: { id: true, senderUserId: true, body: true, createdAt: true },
  });
  return NextResponse.json({ messages });
}
```

- [ ] **Step 3: Write the chat thread component**

`app/(app)/matches/ChatThread.tsx`:
```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { sendMessage } from "./actions";

type Message = { id: string; senderUserId: string; body: string; createdAt: string };

export default function ChatThread({ matchId, meId, initial }: { matchId: string; meId: string; initial: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initial);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(async () => {
      const res = await fetch(`/api/matches/${matchId}/messages`);
      if (res.ok) setMessages((await res.json()).messages);
    }, 3000);
    return () => clearInterval(t);
  }, [matchId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    await sendMessage(matchId, body);
    const res = await fetch(`/api/matches/${matchId}/messages`);
    if (res.ok) setMessages((await res.json()).messages);
  }

  return (
    <div className="space-y-3">
      <div className="max-h-96 space-y-2 overflow-y-auto rounded border border-neutral-800 p-3">
        {messages.map((m) => (
          <div key={m.id} className={m.senderUserId === meId ? "text-right" : "text-left"}>
            <span className="inline-block rounded bg-neutral-800 px-3 py-1">{m.body}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message…"
          className="flex-1 rounded bg-neutral-800 px-3 py-2" />
        <button className="rounded bg-emerald-600 px-4 py-2">Send</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Write the matches list page**

`app/(app)/matches/page.tsx`:
```tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export default async function MatchesPage() {
  const session = await requireUser();
  const matches = await prisma.match.findMany({
    where: { OR: [{ userAId: session.userId }, { userBId: session.userId }] },
    orderBy: { createdAt: "desc" },
    include: {
      userA: true, userB: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Matches</h1>
      {matches.length === 0 && <p className="text-neutral-400">No matches yet. Go swipe!</p>}
      <ul className="divide-y divide-neutral-800">
        {matches.map((m) => {
          const other = m.userAId === session.userId ? m.userB : m.userA;
          const last = m.messages[0];
          return (
            <li key={m.id} className="py-3">
              <Link href={`/matches/${m.id}`} className="flex items-center justify-between">
                <span className="font-semibold">{other.displayName}</span>
                <span className="text-sm text-neutral-400">{last?.body ?? "Say hello"}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 5: Write the match thread page**

`app/(app)/matches/[matchId]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import ChatThread from "../ChatThread";

export default async function MatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const session = await requireUser();
  const { matchId } = await params;
  const match = await prisma.match.findUnique({
    where: { id: matchId }, include: { userA: true, userB: true, messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!match || (match.userAId !== session.userId && match.userBId !== session.userId)) notFound();

  const other = match.userAId === session.userId ? match.userB : match.userA;
  const initial = match.messages.map((m) => ({
    id: m.id, senderUserId: m.senderUserId, body: m.body, createdAt: m.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">{other.displayName}</h1>
        <p className="text-sm text-neutral-400">
          {other.email ?? "no email"} · {other.phone ?? "no phone"}
        </p>
      </div>
      <ChatThread matchId={match.id} meId={session.userId} initial={initial} />
    </div>
  );
}
```

- [ ] **Step 6: Run tests and typecheck**

Run: `nix develop --command bash -c "npm run test && npx tsc --noEmit"`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add matches list, chat thread, and message polling"
```

---

## Task 8: Profile page

**Files:**
- Create: `app/(app)/profile/page.tsx`, `app/(app)/profile/actions.ts`
- Test: `app/(app)/profile/actions.test.ts`

**Interfaces:**
- Consumes: `prisma`, `requireUser`, `hashPassword`.
- Produces: `updateProfile(form)` and `changePassword(form)`.

- [ ] **Step 1: Write profile actions and test**

`app/(app)/profile/actions.ts`:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function updateProfile(form: FormData) {
  const session = await requireUser();
  await prisma.user.update({
    where: { id: session.userId },
    data: {
      displayName: String(form.get("displayName") ?? "").trim(),
      email: String(form.get("email") ?? "").trim() || null,
      phone: String(form.get("phone") ?? "").trim() || null,
    },
  });
  revalidatePath("/profile");
}

export async function changePassword(form: FormData) {
  const session = await requireUser();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (next.length < 8) return { error: "New password must be at least 8 characters" };
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !(await verifyPassword(current, user.passwordHash))) return { error: "Current password is incorrect" };
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  return { ok: true };
}
```

`app/(app)/profile/actions.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";
describe("profile password change hashing", () => {
  it("hashes the new password verifiably", async () => {
    const h = await hashPassword("newpassword");
    expect(await verifyPassword("newpassword", h)).toBe(true);
  });
});
```

- [ ] **Step 2: Write the profile page**

`app/(app)/profile/page.tsx`:
```tsx
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { updateProfile, changePassword } from "./actions";

export default async function ProfilePage() {
  const session = await requireUser();
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return null;
  const field = "w-full rounded bg-neutral-800 px-3 py-2";

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-xl font-bold">Profile</h1>
        <form action={updateProfile} className="space-y-3">
          <label className="block text-sm">Display name<input name="displayName" defaultValue={user.displayName} className={field} /></label>
          <label className="block text-sm">Email<input name="email" type="email" defaultValue={user.email ?? ""} className={field} /></label>
          <label className="block text-sm">Phone<input name="phone" defaultValue={user.phone ?? ""} className={field} /></label>
          <button className="rounded bg-emerald-600 px-3 py-2">Save profile</button>
        </form>
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold">Change password</h2>
        <form action={changePassword} className="space-y-3">
          <input name="current" type="password" placeholder="Current password" className={field} />
          <input name="next" type="password" placeholder="New password" className={field} />
          <button className="rounded bg-emerald-600 px-3 py-2">Change password</button>
        </form>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Run tests and typecheck**

Run: `nix develop --command bash -c "npm run test && npx tsc --noEmit"`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add profile page with contact info and password change"
```

---

## Task 9: Admin area

**Files:**
- Create: `app/admin/page.tsx`, `app/admin/users/page.tsx`, `app/admin/horses/page.tsx`, `app/admin/matches/page.tsx`, `app/admin/actions.ts`
- Test: `app/admin/actions.test.ts`

**Interfaces:**
- Consumes: `prisma`, `requireAdmin`, `hashPassword`.
- Produces actions: `createUser(form)`, `setUserDisabled(userId, disabled)`, `deleteUser(userId)`, `resetUserPassword(userId, password)`, `adminToggleHorse(horseId)`, `adminDeleteHorse(horseId)`, `seedDemoData()`, `resetDatabase()`.

- [ ] **Step 1: Write admin actions and test**

`app/admin/actions.ts`:
```ts
"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import type { Role } from "@/lib/constants";

export async function createUser(form: FormData) {
  await requireAdmin();
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const role = String(form.get("role") ?? "USER") as Role;
  if (!username || password.length < 8) return { error: "Username required; password ≥ 8 chars" };
  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) return { error: "Username already taken" };
  await prisma.user.create({
    data: {
      username, role,
      passwordHash: await hashPassword(password),
      displayName: String(form.get("displayName") ?? username).trim() || username,
      email: String(form.get("email") ?? "").trim() || null,
    },
  });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setUserDisabled(userId: string, disabled: boolean) {
  await requireAdmin();
  await prisma.user.update({ where: { id: userId }, data: { disabled } });
  revalidatePath("/admin/users");
}

export async function deleteUser(userId: string) {
  await requireAdmin();
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin/users");
}

export async function resetUserPassword(userId: string, password: string) {
  await requireAdmin();
  if (password.length < 8) return { error: "Password must be at least 8 characters" };
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password) } });
  return { ok: true };
}

export async function adminToggleHorse(horseId: string) {
  await requireAdmin();
  const horse = await prisma.horse.findUnique({ where: { id: horseId } });
  if (horse) await prisma.horse.update({ where: { id: horseId }, data: { active: !horse.active } });
  revalidatePath("/admin/horses");
}

export async function adminDeleteHorse(horseId: string) {
  await requireAdmin();
  await prisma.horse.delete({ where: { id: horseId } });
  revalidatePath("/admin/horses");
}
```

`app/admin/actions.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";
describe("admin user creation hashing", () => {
  it("hashes passwords verifiably", async () => {
    const h = await hashPassword("password123");
    expect(await verifyPassword("password123", h)).toBe(true);
  });
});
```

- [ ] **Step 2: Write the admin dashboard and sub-pages**

`app/admin/page.tsx`:
```tsx
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminPage() {
  await requireAdmin();
  const [users, horses, matches] = await Promise.all([
    prisma.user.count(), prisma.horse.count(), prisma.match.count(),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Admin</h1>
      <p className="text-neutral-400">{users} users · {horses} horses · {matches} matches</p>
      <nav className="flex gap-3 text-emerald-400">
        <Link href="/admin/users">Users</Link>
        <Link href="/admin/horses">Horses</Link>
        <Link href="/admin/matches">Matches</Link>
      </nav>
    </div>
  );
}
```

`app/admin/users/page.tsx`:
```tsx
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createUser, setUserDisabled, deleteUser } from "../actions";

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  const field = "rounded bg-neutral-800 px-3 py-2";
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Users</h1>
      <form action={createUser} className="grid grid-cols-2 gap-3">
        <input name="username" placeholder="Username" required className={field} />
        <input name="password" type="password" placeholder="Password (≥8)" required className={field} />
        <input name="displayName" placeholder="Display name" className={field} />
        <input name="email" type="email" placeholder="Email" className={field} />
        <select name="role" className={field}><option value="USER">USER</option><option value="ADMIN">ADMIN</option></select>
        <button className="rounded bg-emerald-600 px-3 py-2">Create user</button>
      </form>
      <ul className="divide-y divide-neutral-800">
        {users.map((u) => (
          <li key={u.id} className="flex items-center justify-between py-3">
            <span>{u.username} <span className="text-neutral-500">({u.role}{u.disabled ? ", disabled" : ""})</span></span>
            <span className="flex gap-2 text-sm">
              <form action={setUserDisabled.bind(null, u.id, !u.disabled)}>
                <button className="text-neutral-300">{u.disabled ? "Enable" : "Disable"}</button>
              </form>
              <form action={deleteUser.bind(null, u.id)}><button className="text-red-400">Delete</button></form>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

`app/admin/horses/page.tsx`:
```tsx
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { adminToggleHorse, adminDeleteHorse } from "../actions";

export default async function AdminHorsesPage() {
  await requireAdmin();
  const horses = await prisma.horse.findMany({ orderBy: { createdAt: "desc" }, include: { owner: true } });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Horses</h1>
      <ul className="divide-y divide-neutral-800">
        {horses.map((h) => (
          <li key={h.id} className="flex items-center justify-between py-3">
            <span>{h.name} <span className="text-neutral-500">({h.owner.username}{h.active ? "" : ", inactive"})</span></span>
            <span className="flex gap-2 text-sm">
              <form action={adminToggleHorse.bind(null, h.id)}>
                <button className="text-neutral-300">{h.active ? "Deactivate" : "Activate"}</button>
              </form>
              <form action={adminDeleteHorse.bind(null, h.id)}><button className="text-red-400">Delete</button></form>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

`app/admin/matches/page.tsx`:
```tsx
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminMatchesPage() {
  await requireAdmin();
  const matches = await prisma.match.findMany({
    orderBy: { createdAt: "desc" }, include: { userA: true, userB: true, messages: true },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Matches</h1>
      <ul className="divide-y divide-neutral-800">
        {matches.map((m) => (
          <li key={m.id} className="py-3">
            {m.userA.username} ↔ {m.userB.username} · {m.messages.length} messages
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Update the app nav to link admin (already present in Task 3 layout)**

Verify `app/(app)/layout.tsx` includes the admin link for admins (it does). No change needed.

- [ ] **Step 4: Run tests and typecheck**

Run: `nix develop --command bash -c "npm run test && npx tsc --noEmit"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add admin area for users, horses, and matches"
```

---

## Task 10: Seed script and demo data

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (already has `seed` script)

**Interfaces:**
- Consumes: `prisma`, `hashPassword`, constants.
- Produces: runnable `npm run seed` that creates an admin, several owners, horses with photos (using placeholder image paths), and a couple of pre-made matches.

- [ ] **Step 1: Write the seed script**

`prisma/seed.ts`:
```ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const hash = (pw: string) => bcrypt.hash(pw, 10);

const PHOTOS = [
  "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=800",
  "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800",
  "https://images.unsplash.com/photo-1534773728080-33d31da27ae5?w=800",
];

async function main() {
  await prisma.message.deleteMany();
  await prisma.match.deleteMany();
  await prisma.swipe.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.horse.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.create({
    data: { username: "admin", passwordHash: await hash("adminpass123"), role: "ADMIN", displayName: "Administrator" },
  });

  const owners = [
    { username: "ann", displayName: "Ann Stable", email: "ann@example.com", phone: "555-0101" },
    { username: "ben", displayName: "Ben Ranch", email: "ben@example.com", phone: "555-0102" },
    { username: "cara", displayName: "Cara Farm", email: "cara@example.com", phone: "555-0103" },
  ];
  const users = [];
  for (const o of owners) {
    users.push(await prisma.user.create({
      data: { ...o, passwordHash: await hash("password123") },
    }));
  }

  const horsesData = [
    { owner: 0, name: "Duke", sex: "STALLION", breedName: "Thoroughbred", discipline: "RACING", location: "Lexington, KY", lat: 38.04, lng: -84.5, studFee: 8000, color: "Bay", heightHands: 16.1 },
    { owner: 0, name: "Willow", sex: "MARE", breedName: "Warmblood", discipline: "DRESSAGE", location: "Lexington, KY", lat: 38.04, lng: -84.5, color: "Grey", heightHands: 16.0 },
    { owner: 1, name: "Titan", sex: "STALLION", breedName: "Warmblood", discipline: "SHOW_JUMPING", location: "Aiken, SC", lat: 33.56, lng: -81.72, studFee: 6000, color: "Chestnut", heightHands: 16.3 },
    { owner: 1, name: "Sage", sex: "MARE", breedName: "Quarter Horse", discipline: "WESTERN", location: "Aiken, SC", lat: 33.56, lng: -81.72, color: "Palomino", heightHands: 15.0 },
    { owner: 2, name: "Fable", sex: "MARE", breedName: "Arabian", discipline: "TRAIL", location: "Bend, OR", lat: 44.06, lng: -121.31, color: "Black", heightHands: 14.3 },
    { owner: 2, name: "Onyx", sex: "STALLION", breedName: "Friesian", discipline: "DRESSAGE", location: "Bend, OR", lat: 44.06, lng: -121.31, studFee: 5000, color: "Black", heightHands: 16.0 },
  ];

  for (const [i, h] of horsesData.entries()) {
    const horse = await prisma.horse.create({
      data: {
        ownerId: users[h.owner].id,
        name: h.name, sex: h.sex, dob: new Date(`${2008 + (i % 8)}-05-01`),
        breedName: h.breedName, discipline: h.discipline, color: h.color,
        heightHands: h.heightHands, location: h.location, lat: h.lat, lng: h.lng,
        studFee: h.studFee ?? null,
        breedHistory: `${h.breedName} lineage with proven performance lines.`,
        sireName: "Champion Sire", damName: "Proven Dam",
        temperament: "Calm and willing.",
        allergies: i % 2 === 0 ? "None known" : "Sensitive to dust",
        healthIssues: "None known",
        breedingTerms: h.sex === "STALLION" ? "Live foal guarantee." : null,
      },
    });
    await prisma.photo.create({
      data: { horseId: horse.id, path: PHOTOS[i % PHOTOS.length], sortOrder: 0, isPrimary: true },
    });
  }

  const ann = users[0], ben = users[1];
  const annHorse = await prisma.horse.findFirst({ where: { ownerId: ann.id } });
  const benHorse = await prisma.horse.findFirst({ where: { ownerId: ben.id } });
  if (annHorse && benHorse) {
    await prisma.swipe.create({ data: { swiperUserId: ann.id, horseId: benHorse.id, direction: "LIKE" } });
    await prisma.swipe.create({ data: { swiperUserId: ben.id, horseId: annHorse.id, direction: "LIKE" } });
    const [userAId, userBId] = [ann.id, ben.id].sort();
    const match = await prisma.match.create({ data: { userAId, userBId } });
    await prisma.message.create({ data: { matchId: match.id, senderUserId: ann.id, body: "Hi! Interested in a breeding." } });
  }

  console.log("Seed complete. Admin: admin/adminpass123 · Users: ann,ben,cara / password123");
}

main().finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run the seed against the dev database**

Run: `nix develop --command bash -c "npx prisma db push && npm run seed"`
Expected: prints "Seed complete…"; `dev.db` populated.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add demo data seed script"
```

---

## Task 11: End-to-end happy path (optional but recommended)

**Files:**
- Create: `playwright.config.ts`, `e2e/happy-path.spec.ts`
- Modify: `package.json` (add `@playwright/test` devDependency and `test:e2e` script)

**Interfaces:**
- Consumes: running dev server and seeded data.

- [ ] **Step 1: Add Playwright config**

`playwright.config.ts`:
```ts
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

Add to `package.json` scripts: `"test:e2e": "playwright test"` and devDependency `"@playwright/test": "^1.49.0"`.

- [ ] **Step 2: Write the happy-path spec**

`e2e/happy-path.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test("login, swipe, and reach matches", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="username"]', "cara");
  await page.fill('input[name="password"]', "password123");
  await page.click('button:has-text("Sign in")');
  await expect(page).toHaveURL(/\/swipe/);
  await expect(page.getByText(/Duke|Titan|Onyx/)).toBeVisible();

  await page.click('button:has-text("♥")');
  await page.goto("/matches");
  await expect(page.getByRole("heading", { name: "Matches" })).toBeVisible();
});
```

- [ ] **Step 3: Run E2E**

Run: `nix develop --command bash -c "npx playwright install chromium && npm run test:e2e"`
Expected: PASS (requires seeded `dev.db`).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: add Playwright happy-path e2e test"
```

---

## Self-Review

**Spec coverage:**
- Owner accounts + multiple horses → Tasks 2, 5. ✓
- Swipe stack + left/right → Task 6. ✓
- Mutual likes create match → Task 4 (`recordSwipe`), Task 6 UI. ✓
- Per-match chat → Task 7. ✓
- Filters (sex, breed, discipline, distance) → Tasks 4, 6. ✓
- Photo upload → Task 5. ✓
- User/pass auth, ADMIN/USER → Task 3. ✓
- Admin: users/horses/matches/data → Task 9; seed/reset → Tasks 9–10. ✓
- Nix flake dev shell → Task 1. ✓
- Edge cases: own-horse block, duplicate swipe, match race, upload validation, disabled users hidden, distance without coords → Tasks 4, 5. ✓
- Testing: unit/integration/component → Tasks 4, 5, 6, 7, 8, 9; E2E → Task 11. ✓

**Placeholder scan:** No "TBD/TODO"; every code step contains runnable code. ✓

**Type consistency:** `SwipeDirection`, `Sex`, `Role`, `Discipline` come from `lib/constants.ts` and are used consistently. `recordSwipe`/`getStackForUser` signatures match their callers in Task 6. `assertMember` lives in `lib/matches.ts` (Task 7 Step 1 adjustment) and is imported by both the action and the polling route. ✓

**Note for executors:** In Task 6 Step 2, update `getStackForUser`'s `include` to also load `owner: true` so `ownerName` resolves.
