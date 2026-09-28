# Buckland Blocks agent release rules

Canonical repository: https://github.com/Parris-Tech-Services/BucklandBlocks

Read `codingprinciples.md` before changing code.

## Production rule

**Agents MUST NOT push, merge, force-push, or move `main` directly.**

`main` is the production/known-good branch. User-visible work follows this path:

1. Create one small branch for one coherent change.
2. Add or update focused regression tests for the changed behaviour.
3. Push the branch. Do not merge it.
4. Open a pull request into `main`.
5. Wait for the **Game Release Gate / verify** check to pass.
6. Use the Vercel preview deployment for the PR/branch.
7. Report the preview URL and a short, concrete manual test to Josh.
8. For user-visible gameplay changes, wait for Josh to confirm the preview works.
9. Only then merge the PR into `main`.
10. Confirm the production Vercel deployment is built from the merge commit.

If any gate or preview fails, fix the same branch. Do not stack another feature on top.

## Emergency fixes

Production breakage pauses feature work. Fix it on a dedicated `hotfix/*` branch using the same PR, checks, preview, test, merge path.

Do not bypass the gate because a fix seems obvious.

## Parallel agents

Parallel work is allowed only on separate branches. One agent must not merge another agent's unfinished branch into its own release. Integrate through an explicit integration branch/PR and rerun the full gate.

## Evidence

Never claim "working" from source inspection alone. Report separately:

- typecheck result
- automated test result
- client build result
- Vercel preview status
- exact manual behaviour observed

A Vercel build being READY proves build/deploy success, not gameplay correctness.

## Also never

- Never deploy by hand with the Vercel CLI (`vercel deploy --prod`). Production
  comes only from `main` via Vercel's Git integration.
- Never make a gate pass by weakening it: no `@ts-ignore`, no `as any` to silence
  a real error, no skipped tests, no loosened lint or tsconfig rules.

## Before pushing

Run `npm run verify` — the same checks CI runs: type check, lint (React rules
of hooks), all tests, production build, and a headless-browser smoke test that
loads the game, presses Resume, plays briefly, and fails on any page error,
console error or missing asset.

## Ship new features behind a gate

New or risky features start **off**, behind a flag in
`client/src/engine/features.ts`, so an unfinished feature can't break the
working game:

```ts
import { isFeatureOn } from "./features";
if (isFeatureOn("newinventory")) { /* new behaviour */ } else { /* existing behaviour */ }
```

Josh turns one on with `?features=newinventory` on the preview or live URL
(add `&features-save=1` to keep it on). Once approved, flip its default in
`FEATURE_DEFAULTS` in a follow-up PR, and later remove the old path.

## If production breaks

Roll back first, fix second: Vercel dashboard → buckland-blocks → Deployments →
last good deployment → **Instant Rollback** (or `vercel rollback`). Then fix on
a `hotfix/*` branch through the normal PR path.
