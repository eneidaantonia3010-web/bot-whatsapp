# Constraints

Last reviewed: 2026-09-05 by @team

## Floor (always enforced, no setup required)

- No new suppression comments: `@ts-ignore`, `@ts-nocheck`, `eslint-disable`, `biome-ignore`, `# noqa`, `# type: ignore`, `istanbul ignore`, `nosemgrep`
- No unimplemented stubs: `throw new Error("Not implemented")`, empty `catch {}`, `TODO`, `pass # stub`
- No skipped or deleted tests without an explicit reason in commit message (`.skip`, `xit`, `pytest.mark.skip`)
- No secrets in source (WhatsApp tokens/session auth, JWT secrets, DB credentials, API keys)
- This file does not get weakened to make a change pass

## Enforced with numbers

| Dimension | Rule | Checked by | Runs at |
|-----------|------|-----------|---------|
| Floor Guard | Zero floor violations on diff | `node scripts/floor-guard.mjs` | every edit, CI |
| Types | Zero type errors | `npm run type-check:all` | every edit, CI |
| Tests | 100% of unit/integration test suites pass | `npm run test:all` | task end, CI |
| Coverage (New Code) | Changed lines ≥ 80% covered (advisory warning if lower) | `npm run test:coverage` + git diff | task end, CI |
| Lint | Zero errors from ESLint | `cd apps/web && npm run lint` | task end, CI |
| Build | Next.js and API distribution bundles build cleanly | `npm run build:all` | CI |

Every row names the command that produces the verdict. A dimension with a
number and no command in this column is an aspiration, not a constraint.

## Measured, not yet enforced (Ratchets)

| Metric | Today (Baseline) | Direction | Checked by |
|--------|------------------|-----------|-----------|
| Web frontend line coverage (`apps/web`) | 76.7% | must not fall | `cd apps/web && npx vitest run --coverage` |
| API backend line coverage (`apps/api`) | 34.8% | must not fall | `cd apps/api && npx vitest run --coverage` |
| Bot AI line coverage (`apps/bot`) | 48.0% | must not fall | `python -m pytest --cov=apps/bot apps/bot/tests` |

## Exceptions

| ID | Rule | Path | Reason | Owner | Expires |
|----|------|------|--------|-------|---------|
