# Release Checklist

Use this checklist for every npm release.

## Release Channels

1. `latest` is published by pushing version tags like `v0.2.0`.
2. `next` is published automatically from `main` pushes.

Workflows:

1. `.github/workflows/release-npm.yml` for stable `latest`.
2. `.github/workflows/release-npm-next.yml` for prerelease `next`.

## Prerequisites

1. GitHub secret `NPM_TOKEN` is configured.
2. Local branch is clean (`git status --short` shows nothing).
3. Local `main` is up to date (`git checkout main && git pull`).

## Pre-Release Validation

1. Run:

```bash
npm ci
npm run prepublishOnly
```

2. Confirm changelog and README updates are ready for this version.

## Hotfix Release (Patch)

1. Run:

```bash
git checkout main
git pull
npm run prepublishOnly
npm version patch
git push origin main --follow-tags
```

2. Wait for `.github/workflows/release-npm.yml` to pass.

## Feature Release (Minor)

1. Run:

```bash
git checkout main
git pull
npm run prepublishOnly
npm version minor
git push origin main --follow-tags
```

2. For an explicit target like `0.2.0`, run:

```bash
npm version 0.2.0
git push origin main --follow-tags
```

## Breaking Release (Major)

1. Run:

```bash
git checkout main
git pull
npm run prepublishOnly
npm version major
git push origin main --follow-tags
```

2. Include migration notes in release notes.

## Prerelease (`next`) Validation Flow

1. Merge feature work to `main`.
2. Wait for `.github/workflows/release-npm-next.yml` to publish `*-next.<run_id>`.
3. Validate in a consumer app:

```bash
npm install react-json-virtualization@next
```

4. Promote to stable by tagging a release (`npm version patch|minor|major`).

## Post-Release Verification

1. Verify published version:

```bash
npm view react-json-virtualization version
npm dist-tag ls react-json-virtualization
```

2. Confirm GitHub Actions run is green.
3. Publish GitHub Release notes for the version tag.

## If a Bad Version Is Published

1. Publish a fast patch fix (do not rely on unpublish).
2. Deprecate the bad version:

```bash
npm deprecate react-json-virtualization@<bad_version> "Use <fixed_version> instead"
```

## Optional: Start Next Development Cycle

After a stable release, set the next base version for prerelease channel:

```bash
npm version <next_target> --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore: start <next_target> development"
git push origin main
```