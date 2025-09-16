# Repository Guidelines

## Project Structure & Module Organization
- `app/` hosts App Router entries (`layout.tsx`, `page.tsx`); nest feature folders beneath the owning route.
- `app/MASTER.sql` is the single source for the hotel-ordering schema—edit it alongside migrations and summarize changes in `docs/PRD.md`.
- `public/` delivers static assets; keep only optimized files that are actually referenced.
- `docs/` carries product and planning notes—extend it with API contracts or architecture snapshots.
- Root configs (`next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `bun.lock`) capture runtime, typing, build, and package manager expectations; update them together when dependencies shift.

## Build, Test, and Development Commands
- `bun install` (or `npm install`) syncs dependencies; Bun is preferred because the lockfile is committed.
- `bun run dev` / `npm run dev` starts Next.js 15 + Turbopack at `http://localhost:3000` with hot reload.
- `bun run build` / `npm run build` produces the production bundle; run before merging significant work.
- `bun start` / `npm run start` serves the last build for smoke checks after `build` succeeds.

## Coding Style & Naming Conventions
- Use TypeScript everywhere; components stay PascalCase, hooks/utilities camelCase, and colocate related types.
- Follow the existing style: two-space indentation, double-quoted strings, trailing semicolons, and Tailwind-first layout.
- Keep shared tokens in `app/globals.css`; factor repeated Tailwind combos into reusable components instead of ad-hoc CSS.

## Testing Guidelines
- Tests are not configured yet—add Vitest + Testing Library for units and Playwright for flows as features gain complexity.
- Place specs next to features (`app/<feature>/__tests__/`) or under a root `tests/` directory for cross-route coverage.
- Target ~80% critical-path coverage and add a `test` script in `package.json` (e.g. `"test": "bun test"`) so CI can enforce it.

## Commit & Pull Request Guidelines
- Git history currently holds only the bootstrap commit; going forward write imperative, scope-aware subjects (`feat: add checkout totals`).
- Each PR should supply a summary, linked work item, screenshots or Loom for UI shifts, and notes on manual/automated tests.
- Rebase before review, make sure build/test commands pass locally, and secure at least one teammate approval before merge.

## Environment & Configuration Tips
- Develop with Node 20+ and Bun 1.x to match the Next.js 15 + Turbopack toolchain; avoid mixing package managers.
- Store environment variables in `.env.local`; never commit secrets and document new keys when they appear.
- After dependency upgrades, clear `.next/` and restart `bun run dev` to refresh Turbopack caches and catch config regressions.
