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

Scope: `Collapsable` and `Static` include parse + expansion + flatten work. `Plain (metadata=false)` measures pretty-line generation only.

### large-10mb.json (10.00 MB)

| Mode | Avg (ms) | Min (ms) | Max (ms) | Output size | vs Collapsable |
| --- | ---: | ---: | ---: | ---: | ---: |
| `Collapsable (metadata=true, depth=1)` | 1024.77 | 1017.08 | 1042.66 | 64,838 rows | 1.00x |
| `Static (metadata=true, alwaysExpanded)` | 1384.20 | 1308.87 | 1468.24 | 842,834 rows | 1.35x |
| `Plain (metadata=false)` | 136.72 | 127.33 | 143.63 | 1,037,335 lines | 0.13x |

### large-50mb.json (50.00 MB)

| Mode | Avg (ms) | Min (ms) | Max (ms) | Output size | vs Collapsable |
| --- | ---: | ---: | ---: | ---: | ---: |
| `Collapsable (metadata=true, depth=1)` | 5230.99 | 4973.87 | 5534.76 | 324,181 rows | 1.00x |
| `Static (metadata=true, alwaysExpanded)` | 7630.65 | 7380.08 | 8191.26 | 4,214,293 rows | 1.46x |
| `Plain (metadata=false)` | 911.44 | 839.57 | 1030.96 | 5,186,823 lines | 0.17x |

### large-100mb.json (100.00 MB)

| Mode | Avg (ms) | Min (ms) | Max (ms) | Output size | vs Collapsable |
| --- | ---: | ---: | ---: | ---: | ---: |
| `Collapsable (metadata=true, depth=1)` | 10771.17 | 10303.29 | 11218.33 | 648,359 rows | 1.00x |
| `Static (metadata=true, alwaysExpanded)` | 16062.59 | 15595.29 | 16422.84 | 8,428,607 rows | 1.49x |
| `Plain (metadata=false)` | 1776.98 | 1639.63 | 1935.16 | 10,373,671 lines | 0.16x |

`Plain` is fastest in this end-to-end benchmark because metadata=false bypasses incremental tree parsing and flattening.

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
- `searchQuery?: string` Highlights matches without filtering rows or lines. Uses the same tokenization and term matching rules as `pathFilterQuery`.
- `pathFilterCaseSensitive?: boolean` Case-sensitive path filter mode.
- `pathFilterMode?: "auto" | "prefix" | "includes"` Filter strategy. Defaults to `auto`.
- `searchMetadataLimit?: number` Maximum identifiers returned in search metadata arrays. Default `500`.
- `theme?: JsonThemeOverride` Per-token color overrides.
- `selectedPath?: string` Controlled selected node path.
- `className?: string` Optional custom class.
- `onNodeClick?: (path, row) => void` Node selection callback.
- `onSearchMetadata?: (metadata) => void` Search callback with counts and capped match identifiers for both `metadata=true` (tree rows) and `metadata=false` (pretty lines). Does not filter the view.
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
