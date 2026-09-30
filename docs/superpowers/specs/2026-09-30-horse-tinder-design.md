# Horse Tinder — Design Spec

**Date:** 2026-09-30
**Status:** Approved (design), pending implementation plan
**Scope:** Local-only web app for testing

## 1. Summary

A Tinder-style web application for **horse breeding**: horse owners create profiles
for their horses, swipe through compatible horses, and on a mutual like between
owners a match is created with a chat thread to arrange the breeding.

The product is owner-centric: a person registers an account and owns one or more
horses. Swiping happens on *horses*, but a like is effectively a like on the
horse's *owner*. A match requires reciprocal likes between two owners.

## 2. Goals

- Owner accounts with one or more horse profiles.
- Swipe stack with left (pass) / right (like).
- Mutual owner likes create a match.
- Per-match chat to arrange breeding.
- Basic filters: sex compatibility, breed, discipline, distance.
- Photo uploads.
- User/password auth with two roles: `ADMIN` and `USER`.
- Admin area: manage users, moderate horses, view matches, seed/reset data.
- Runs locally with a Nix flake dev shell.

## 3. Non-Goals (v1)

- Public self-registration (admin creates accounts).
- Realtime websocket chat (polling is sufficient).
- Payments, notifications, email delivery.
- Production deployment, hosting, scaling.
- Mobile native apps.

## 4. Architecture & Stack

**Stack**

- Next.js 15 (App Router) + TypeScript
- Prisma ORM + SQLite (`dev.db`)
- Tailwind CSS
- Cookie-based sessions; passwords hashed with bcrypt (or argon2)
- Vitest + React Testing Library for tests

**Structure**

```
flake.nix                    Nix dev shell (node, npm, sqlite)
prisma/schema.prisma
public/uploads/              uploaded horse photos
app/
  (auth)/login/              login page
  (app)/                     authed shell (route group)
    swipe/                   card stack + filters
    matches/                 match list + chat threads
    horses/                  my horses CRUD + photo upload
    profile/                 my account
  admin/                     admin-only area
  api/                       route handlers (upload, auth, chat polling)
lib/                         db, auth, session, matching, geo
```

**Data flow**

- Server Components read directly via Prisma for page rendering.
- Mutations use Server Actions where natural (swipe, like, horse CRUD) and route
  handlers where needed (file upload, chat polling).
- Single `npm run dev`; single SQLite file. No CORS, no duplicated models.

**Chat** is implemented with client polling every ~3 seconds. Upgradeable to
websockets later without changing the data model.

## 5. Data Model

### User

- `id`
- `username` (unique)
- `passwordHash`
- `role` (`ADMIN` | `USER`)
- `disabled` (bool)
- `displayName`, `email`, `phone` (contact info revealed on match)
- `createdAt`

### Horse

- `id`, `ownerId` → User
- `name`
- `sex` (`STALLION` | `MARE` | `GELDING`)
- `dob`
- `breedName`, `breedHistory` (text)
- `heightHands` (decimal), `color`, `markings`
- `discipline` (enum)
- `temperament`, `registrationNumber`
- `sireName`, `damName`
- `allergies`, `healthIssues` (text)
- `location` (city/region), `lat`, `lng` (for distance filter)
- `studFee` (int, nullable), `breedingTerms` (text)
- `active` (bool), `createdAt`

### Photo

- `id`, `horseId` → Horse
- `path`, `sortOrder`, `isPrimary`

### Swipe

- `id`, `swiperUserId` → User, `horseId` → Horse
- `direction` (`LIKE` | `PASS`), `createdAt`
- Unique on (`swiperUserId`, `horseId`) — one swipe per horse per user.

### Match

- `id`, `userAId`, `userBId` (the two owners), `createdAt`
- Unique owner pair; created when owner A likes a horse owned by B **and** B has
  liked a horse owned by A.

### Message

- `id`, `matchId` → Match, `senderUserId`, `body`, `createdAt`

### Key rules

- A user swipes on horses; a like is a like on the horse's owner. A match is
  reciprocal likes between two owners.
- Sex-compatibility filter: stallion profiles are shown to mare owners and
  vice-versa; geldings are excluded from the breeding stack.
- Distance filter uses haversine over lat/lng.
- Admin can view/edit everything; users can only manage their own horses and see
  their own matches.

## 6. Pages & Flows

### Auth

- `/login` — username/password. No public sign-up; admin creates accounts.
- Session cookie: httpOnly, signed. Middleware guards `(app)` and `admin` routes;
  admin routes additionally require the `ADMIN` role.

### Swipe (`/swipe`)

- Card stack showing primary photo, name, breed, sex, age, height, discipline,
  location, stud fee. Expand for full profile (pedigree, health, allergies, breed
  history, all photos).
- Left = pass, right = like.
- Filter bar: sex compatibility (automatic), breed, discipline, max distance.
- On like: check for a reciprocal owner-like; if found, create a match and show an
  "It's a match!" moment.

### Matches (`/matches`)

- List of matches showing the connecting horse/owner.
- Open a thread → chat with ~3s polling.
- Contact info (email/phone) revealed once matched.

### My Horses (`/horses`)

- CRUD list; create/edit form covering all profile fields.
- Multi-photo upload with drag-to-reorder and primary selection.
- Activate/deactivate.

### Profile (`/profile`)

- Edit display name, email, phone, password.

### Admin (`/admin`)

- Users: create, disable, delete, reset password.
- Horses: view/moderate/deactivate any horse.
- Matches: read-only list of all matches.
- Data: seed demo data / reset database.

## 7. Edge Cases & Error Handling

- Swiping on one's own horse is blocked; own horses are excluded from the stack.
- Duplicate swipes are prevented by the unique constraint (idempotent).
- Match creation runs in a transaction; the unique owner-pair constraint prevents
  duplicates under a race.
- Uploads validate mime type and size (≤5MB; jpg/png/webp), store under
  `public/uploads/<horseId>/`, and sanitize filenames.
- Disabled users' horses are hidden from stacks; existing matches remain readable.
- Horses without lat/lng are excluded when a distance filter is set.
- Auth returns a generic "invalid credentials" error; login is lightly
  rate-limited.

## 8. Testing

- **Unit:** matching logic (reciprocal like → match), sex-compatibility filter,
  distance haversine, auth/session helpers.
- **Integration:** Server Actions / route handlers against a test SQLite DB —
  create user, create horse, swipe, assert match, chat message flow.
- **Component:** Vitest + React Testing Library for key UI (card stack, filter
  bar, chat thread).
- **Optional E2E:** Playwright for the swipe → match → chat happy path.
- Seed script providing demo owners, horses, and photos.

## 9. Local Development

- `flake.nix` provides a dev shell with Node, npm, and SQLite.
- `nix develop` then `npm install`, `npx prisma migrate dev`, `npm run seed`,
  `npm run dev`.
- SQLite database file `dev.db`; uploaded photos under `public/uploads/`.
