# react-json-virtualization

Virtualized React JSON viewer for large JSON strings with token-based color theming.

## Features

- Incremental async JSON parsing on the main thread
- Virtualized tree rendering for large nested structures
- Expand/collapse nodes with keyboard support
- Path and primitive-value search over JSON paths
- Dedicated `searchQuery` support with AND-combination against `pathFilterQuery`
- Direct-match highlighting for tree rows and pretty-printed lines
- Trie-indexed prefix path search for low-latency filtering on large trees
- Controlled and uncontrolled expansion state
- Token-based color theme overrides (keys, values, punctuation)
- TypeScript-first public API

## Install

```bash
npm install react-json-virtualization
```

## Demo

Try the live demo:

https://mietoprogramming.github.io/react-json-virtualization/

Mode comparison note (Collapsable vs Static):

[demo/public/docs/virtualizejson-modes.md](demo/public/docs/virtualizejson-modes.md)

## Benchmark Snapshot (Modes)

Measured with:

```bash
npm run bench:modes
```

Environment: Node `v24.14.1`, linux x64, fixtures from `bench/fixtures/generated`, 5 iterations.

### large-10mb.json (10.00 MB)

| Mode | Avg (ms) | Min (ms) | Max (ms) | Output size | vs Collapsable |
| --- | ---: | ---: | ---: | ---: | ---: |
| `Collapsable (metadata=true, depth=1)` | 9.75 | 7.62 | 11.83 | 64,838 rows | 1.00x |
| `Static (metadata=true, alwaysExpanded)` | 370.45 | 309.81 | 404.46 | 842,834 rows | 38.00x |
| `Plain (metadata=false)` | 146.68 | 141.29 | 158.97 | 1,037,335 lines | 15.05x |

### large-50mb.json (50.00 MB)

| Mode | Avg (ms) | Min (ms) | Max (ms) | Output size | vs Collapsable |
| --- | ---: | ---: | ---: | ---: | ---: |
| `Collapsable (metadata=true, depth=1)` | 87.85 | 68.78 | 130.65 | 324,181 rows | 1.00x |
| `Static (metadata=true, alwaysExpanded)` | 2192.44 | 1937.74 | 2477.58 | 4,214,293 rows | 24.96x |
| `Plain (metadata=false)` | 850.72 | 817.88 | 902.08 | 5,186,823 lines | 9.68x |

### large-100mb.json (100.00 MB)

| Mode | Avg (ms) | Min (ms) | Max (ms) | Output size | vs Collapsable |
| --- | ---: | ---: | ---: | ---: | ---: |
| `Collapsable (metadata=true, depth=1)` | 191.35 | 160.53 | 307.84 | 648,359 rows | 1.00x |
| `Static (metadata=true, alwaysExpanded)` | 4463.40 | 4364.28 | 4574.43 | 8,428,607 rows | 23.33x |
| `Plain (metadata=false)` | 1856.35 | 1774.53 | 1963.01 | 10,373,671 lines | 9.70x |

`Static` is slower because it flattens a much larger always-expanded tree.

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
- `pathFilterQuery?: string` Filters by JSON path and all JSON value types (`string`, `number`, `boolean`, `null`, `object`, `array`). Unquoted terms are split by whitespace and matched with OR semantics (`zero hello` matches either term). Wrap exact phrases in quotes (for example `"new york" name`). Quoted single terms are treated the same as unquoted terms. In `metadata=false`, it filters pretty-printed lines.
- `searchQuery?: string` Additional search query combined with `pathFilterQuery` using AND semantics. Uses the same tokenization and term matching rules.
- `pathFilterCaseSensitive?: boolean` Case-sensitive path filter mode.
- `pathFilterMode?: "auto" | "prefix" | "includes"` Filter strategy. Defaults to `auto`.
- `searchMetadataLimit?: number` Maximum identifiers returned in search metadata arrays. Default `500`.
- `theme?: JsonThemeOverride` Per-token color overrides.
- `selectedPath?: string` Controlled selected node path.
- `className?: string` Optional custom class.
- `onNodeClick?: (path, row) => void` Node selection callback.
- `onSearchMetadata?: (metadata) => void` Search callback with counts and capped match identifiers for both `metadata=true` (tree rows) and `metadata=false` (pretty lines).
- `onParseProgress?: (processed, total) => void` Parse progress callback.
- `onParseError?: (error) => void` Parse error callback.

`onSearchMetadata` payload fields:

- `mode: "tree" | "plain"`
- `query`, `pathFilterQuery`, `searchQuery`
- `matchCount` (direct matches)
- `visibleCount` (rows or lines currently visible after context inclusion)
- `matchedPaths`, `matchedRowIds`, `matchedLineNumbers` (all capped by `searchMetadataLimit`)
- `hasMore` (`true` when any metadata list was truncated)

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
- `pathFilterQuery` now treats unquoted whitespace as multiple OR terms. Use quotes to keep multi-word phrases together.

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
