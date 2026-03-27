# react-json-virtualization

Virtualized React JSON viewer optimized for large JSON strings with token-based color theming.

## Status

Early v1 implementation.

## Features

- Incremental async JSON parsing on the main thread
- Virtualized tree rendering for large nested structures
- Expand/collapse nodes with keyboard support
- Path-based search and filter over JSON paths
- Trie-indexed prefix path search for low-latency filtering on large trees
- Controlled and uncontrolled expansion state
- Token-based color theme overrides (keys, values, punctuation)
- TypeScript-first public API

## Install

```bash
npm install react-json-virtualization
```

## Usage

```tsx
import { VirtualizeJSON } from "react-json-virtualization";

const payload = JSON.stringify({
  users: [{ id: 1, name: "Ada" }, { id: 2, name: "Linus" }],
  stats: { total: 2, active: true }
});

export function Example() {
  return (
    <VirtualizeJSON.Collapsable
      json={payload}
      metadata={true}
      height={480}
      rowHeight={24}
      initialExpandDepth={1}
      pathFilterQuery="$.users[1]"
      theme={{
        key: "#8a4f00",
        string: "#006b4f",
        number: "#094b9d"
      }}
    />
  );
}
```

Static, always-expanded viewer:

```tsx
import { VirtualizeJSON } from "react-json-virtualization";

export function StaticExample({ json }: { json: string }) {
  return <VirtualizeJSON.Static json={json} height={480} rowHeight={24} />;
}
```

## Local demo playground

Run an interactive demo app from this repo to quickly test the viewer end-to-end.

```bash
npm install
npm run demo
```

The demo includes:

- Drag-and-drop JSON file upload
- Local file picker for `.json` files
- Repo sample loader (`demo/public/samples/*`)
- Controls for height, row height, overscan, and initial expand depth
- Path filter controls (query, mode, case sensitivity)
- Theme preset switcher
- Live parse progress and parse error display
- Controlled selection and optional controlled expansion mode

## GitHub Pages demo

This repo includes a GitHub Actions workflow that publishes the demo to GitHub Pages from `main`.

Workflow file: `.github/workflows/deploy-demo-pages.yml`

After pushing this workflow, enable Pages in your repository settings:

1. Open `Settings -> Pages`.
2. Set `Build and deployment` source to `GitHub Actions`.
3. Push to `main` (or run the workflow manually from the `Actions` tab).

The demo will be available at:

`https://<your-github-username>.github.io/react-json-virtualization/`

## API

### VirtualizeJSON.Collapsable props

- `json: string` Raw JSON string input.
- `metadata?: boolean` Enables tree metadata mode (Object/Array counts, expansion, filtering, virtualization). Default `true`. When `false`, renders a virtualized pretty-printed JSON view.
- `showLineNumbers?: boolean` Shows line numbers in the virtualized pretty-printed JSON view (`metadata=false`). Default `true`.
- `height?: number | string` Container height. Default `520`.
- `rowHeight?: number` Fixed row height used by virtualization. Default `24`.
- `overscan?: number` Number of extra rows rendered around viewport. Default `8`.
- `initialExpandDepth?: number` Initial expansion depth from root. Default `1`.
- `expandedPaths?: ReadonlySet<string>` Controlled expanded path set.
- `defaultExpandedPaths?: Iterable<string>` Initial expanded paths in uncontrolled mode.
- `onExpandedPathsChange?: (paths) => void` Expansion state callback.
- `pathFilterQuery?: string` Filters rows by JSON path query.
- `pathFilterCaseSensitive?: boolean` Case-sensitive path filter mode.
- `pathFilterMode?: "auto" | "prefix" | "includes"` Filter strategy. Defaults to `auto`.
- `theme?: JsonThemeOverride` Per-token color overrides.
- `selectedPath?: string` Controlled selected node path.
- `className?: string` Optional custom class.
- `onNodeClick?: (path, row) => void` Node selection callback.
- `onParseProgress?: (processed, total) => void` Parse progress callback.
- `onParseError?: (error) => void` Parse error callback.

### VirtualizeJSON.Static props

All `VirtualizeJSON.Collapsable` props except expansion control props:

- Omitted: `initialExpandDepth`
- Omitted: `expandedPaths`
- Omitted: `defaultExpandedPaths`
- Omitted: `onExpandedPathsChange`

`VirtualizeJSON.Static` always renders all expandable paths and disables collapse/expand interactions.

### Migration (breaking change)

- `JSONViewer` was renamed to `VirtualizeJSON.Collapsable`.
- Static always-expanded mode is available as `VirtualizeJSON.Static`.

### Expansion helper exports

- `createExpandedPathSet(paths?)`
- `expandPath(current, path)`
- `collapsePath(current, path)`
- `toggleExpandedPath(current, path)`
- `expandedPathsFromDepth(root, depth)`

### Path filter helper export

- `filterRowsByPathQuery(rows, query, options?)`
- `createPathSearchIndex(rows, { caseSensitive? })`

For best path-filter performance on very large expanded row sets, use `mode: "prefix"` with a cached index from `createPathSearchIndex`.

## Development

```bash
npm install
npm run typecheck
npm run test
npm run build
npm run demo
npm run bench:generate
npm run bench:parse
```

Generated benchmark fixtures are written to `bench/fixtures/generated/` for 10MB, 50MB, and 100MB payloads.
