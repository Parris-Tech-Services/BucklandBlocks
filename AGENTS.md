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
