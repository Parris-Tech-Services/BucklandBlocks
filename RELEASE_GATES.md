# Buckland Blocks release gates

`main` is the production source of truth. Changes land through small pull
requests; direct pushes and force-pushes are disabled.

Every pull request must pass the `Buckland Blocks quality gate / quality`
check before merge. The gate runs TypeScript checking, the engine test suite,
a production build, and a release-bundle check that verifies the gameplay
input API is present in the artifact.

Release rules:

1. Keep one user-visible feature or repair per pull request.
2. Do not mix dependency upgrades, refactors, and gameplay changes in the
   same release unless the dependency is required for that change.
3. Treat a green local build as necessary but insufficient: after promotion,
   verify the exact public game route and the loaded bundle.
4. If production regresses, roll back the last deployment before starting a
   second fix.
5. Keep the current working gameplay baseline documented in the PR body and
   add a focused regression test for each repaired behavior.

The Vercel preview check remains an additional deployment signal; it does not
replace the quality gate or the post-deploy smoke test.
