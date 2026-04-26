# react-json-virtualization: Agent Quick Reference

## Core Commands

### Setup and validation
```bash
npm ci               # Fresh install (use for reproducible CI)
npm run prepublishOnly  # Verify: typecheck + test + build
```

### Development workflow
```bash
npm run dev          # Build watch mode (tsup)
npm run demo         # Start Vite demo server
npm run demo:build   # Build static demo artifacts
```

### Building and testing
```bash
npm run build                    # Typescript sup build -> dist/
npm run typecheck                # tsc --noEmit (lint + type check)
npm run test                     # vitest run (jsdom env)
```

### Recommended order: `build -> typecheck -> test`

## Repo Structure

```
src/index.ts                 # Entry point, re-exports components and core APIs
src/components/             # JSONViewer.tsx, JSONViewerStatic.tsx, JSONRow.tsx
src/core/                   # parser.ts, expansion.ts, filter.ts, flatten.ts, search.ts
src/hooks/                  # useVirtualization.ts (virtualization logic)
tests/                      # Unit tests matching src/core modules
demo/                       # Vite demo app linking to ../src/index.ts
bench/                      # Benchmark fixtures and scripts
dist/                       # Build output (ESM/UMD bundles + type declarations)
```

## Key Architectural Notes

### Virtualization hook
- `useVirtualization()` in `src/hooks/useVirtualization.ts` handles viewport virtualization.
- Maintains container ref, scroll state, calculated visible range via `calculateVirtualMetrics`.

### Public API exports (`dist/index.d.ts`)
- `VirtualizeJSON.Collapsable`  # Interactive viewer with expansion controls
- `VirtualizeJSON.Static`        # Read-only fully-expanded viewer
- Expansion helpers: `expandPath`, `collapsePath`, `toggleExpandedPath`, `createExpandedPathSet`
- Filter helpers: `filterRowsByPathQuery`, `createPathSearchIndex`

### Build artifacts
- TypeScript emits to `dist/` with `.js`, `.cjs`, `.d.ts`, `.css` files.
- gitignore ignores `dist/`, `demo/dist/`, bench/fixtures/generated/*.json`.

## Testing Notes

- Vitest uses jsdom environment for DOM tests.
- Test files live in `tests/**/*.test.ts`.
- Core parsers and virtualization logic each have dedicated test files.

## Release Checklist (see RELEASE_CHECKLIST.md)

1. GitHub secret `NPM_TOKEN` required for publishing.
2. Verify with `npm run prepublishOnly` before release.
3. Stable releases from tags via `release-npm.yml`.
4. Pre-release (`*-next.<run_id>`) from main pushes via `release-npm-next.yml`.

## Demo Deployment

- Vite demo is built to `demo/dist/` and deployed via Pages workflow.
- Alias maps `"react-json-virtualization"` to `../src/index.ts` for dev builds.
