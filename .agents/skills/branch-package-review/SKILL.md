---
name: branch-package-review
description: Change-level triage of the current working state of react-json-virtualization against the released main baseline (user's "master"). Classifies package changes as bugfix, minor, or major, and outputs a summary of the change level plus the recommended next package version and release action. Read-only; no edits, no commits, no tests by default.
whenToUse: Run when the user is about to decide the next release/package of react-json-virtualization and asks something like "what level is this change against master", "bugfix or minor or major", "which package should I release next", or "review current changes". Library: react-json-virtualization (package = src/ -> dist/). Once per work session, at decision time.
metadata:
  library: react-json-virtualization
  baseline: origin/main (fallback local main, then master)
  output: change-level summary + next package version
---

# Change-level review against main

Read-only triage: compare everything changed in the current state against the released baseline, classify the package impact, and output a single change level + next package version so the user can decide which release to cut next.

## 1. Resolve the baseline

The user's "master" = this repo's main branch. Resolve in order:

1. `git fetch origin` (best-effort; ignore the failure)
2. `git rev-parse -q origin/main` succeeds → baseline = `origin/main`
3. Local `main` exists → `main`
4. Local `master` exists → `master`
5. None → report that no baseline exists, and ask which ref to use. Stop.

## 2. Enumerate all changes

```bash
git diff --name-status <baseline>
git diff --stat <baseline>
git log --oneline <baseline>..HEAD
git status --porcelain
```

`git diff <baseline>` compares the working tree (index + unstaged) with the baseline, so it covers ahead commits, staged, and unstaged work together ("current new changes"). Treat `??` untracked files as new changes; include staged `A` entries from `--name-status`.

If `HEAD` is behind `<baseline>` (e.g. the log is empty but a diff is reported), state that the branch is stale and recommend update before a trustworthy classification.

## 3. Split into package vs non-package

**Package surface** (affects the shipped npm artifact):
- `src/**` (TS + CSS)
- `package.json`: `version`, `exports`, `files`, `peerDependencies`, `dependencies`
- `tests/**` (not shipped, but a behavioral signal for changes in `src/`)

**Not package** (no release impact — enumerate and move on):
- `demo/**`, `bench/**`, `docs/`, `README.md`, `CHANGELOG.md`, `.github/**`, `.dsh/**`

## 4. Classify package changes

Per coherent change group (a file or related set of files), not per line:

| Level | Criteria |
|---|---|
| **Bugfix** | Fix to broken/existing behavior with no change to the public API surface. Also: pure internal refactor with no behavior/API change (label as "neutral"). |
| **Minor** | Backward-compatible additions: new public exports/components/options/theme fields/CSS classes, new source format, added optional behavior. Existing usage is unaffected. |
| **Major** | Breaking: public export removal/renaming/retype, default changes that change existing behavior, removal/renaming of public CSS classes, `peerDependencies` changes, build output changes. |

Signals (verify by reading the diff, do not trust alone):
- Commit messages (`fix:`/`feat:`/`chore:`) — hint only.
- `src/index.ts` export changes — the single strongest API signal.
- `src/styles.css` / `src/theme.ts`: additive classes/fields = minor; removal/renaming = major.
- `package.json` changes — always read.

**Overall level = the highest level among package changes.** Also output per-level counts.
If all changes are non-package → level **none** → no release.

## 5. Recommend the next package version

Read `package.json` `version`; apply:

| Level | Bump | Example (from 0.7.0) |
|---|---|---|
| Bugfix | patch | 0.7.1 |
| Minor | minor | 0.8.0 |
| Major | major | 1.0.0 |
| None | — | keep 0.7.0, no release |

Note: this repo uses a 0.x.x line; for a major, say "candidate for 1.0.0" and do not assume it is immediately ready to release.

## Output format

```
## Change-level summary
- Change level: MINOR
- Levels: bugfix ×0 · minor ×1 · major ×0
- Baseline: origin/main @ <short-hash> <subject>
- Package version: 0.7.0 -> next 0.8.0
- Release action: merge into main, push -> *-next.<run_id> prerelease (release-npm-next.yml); stable from tag (release-npm.yml); needs NPM_TOKEN (RELEASE_CHECKLIST.md)

## Breakdown (package)
| Level | Files | What changed | Why |

## Non-package
- demo/... (list, no release impact)

## Release blockers   <- only if blockers are found
- <findings; bugs not covered by the rubric>

## Verdict
Ready | Ready after fixing: <x> | No release needed
```

## Constraints

- Read-only: no file edits, no commits.
- Static by default: git diff + `read`/`grep`. Run `npm run typecheck/test/build/demo:build` only when the user explicitly asks.
- Do not review unchanged files.

## Repo notes

- Entry/API re-exports: `src/index.ts`; public CSS classes: `src.styles.css` (prefix `rjv-`); theme: `src.theme.ts`; virtualization: `src/hooks/useVirtualization.ts`.
- Validation commands from AGENTS.md: `npm run typecheck`, `npm run test`, `npm run build`.
