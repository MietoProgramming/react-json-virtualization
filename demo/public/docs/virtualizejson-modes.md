# VirtualizeJSON mode comparison

This note compares the two public viewer modes:

- `VirtualizeJSON.Collapsable`
- `VirtualizeJSON.Static`

The statements below are based on the current implementation in `src/components/JSONViewer.tsx` and `src/components/JSONViewerStatic.tsx`.

## Quick summary

- Use `VirtualizeJSON.Collapsable` when users need to expand/collapse nodes or when you want to limit visible tree size initially.
- Use `VirtualizeJSON.Static` when you want a fully expanded, read-only tree without expansion controls.
- In `metadata={false}` mode, both behave the same for expansion because the viewer renders a virtualized pretty-printed text view.

## Behavior differences

| Area | `VirtualizeJSON.Collapsable` | `VirtualizeJSON.Static` |
| --- | --- | --- |
| Expansion interaction | Expand/collapse is enabled | Expand/collapse is disabled |
| Initial expansion | Controlled by `initialExpandDepth` (default `1`) or `defaultExpandedPaths` | Always expanded to full depth |
| Controlled expansion API | Supports `expandedPaths` + `onExpandedPathsChange` | Not available |
| Toggle handler | Active unless `alwaysExpanded` is set | No-op (toggle ignored) |
| Tree shape over time | Can change based on user toggles or controlled props | Fixed to fully expanded tree |

## Capability differences

### `VirtualizeJSON.Collapsable`

Supports everything from `JSONViewerProps`, including expansion-specific props:

- `initialExpandDepth`
- `expandedPaths`
- `defaultExpandedPaths`
- `onExpandedPathsChange`

### `VirtualizeJSON.Static`

Uses the same base viewer but intentionally omits expansion control props:

- omitted: `initialExpandDepth`
- omitted: `expandedPaths`
- omitted: `defaultExpandedPaths`
- omitted: `onExpandedPathsChange`

Still supports shared capabilities such as:

- incremental parsing callbacks
- path/value filtering
- theming
- selection callbacks
- virtualization settings (`height`, `rowHeight`, `overscan`)

## Performance considerations

Both modes use virtualization, so DOM rendering cost is bounded by viewport size.

Main practical difference is expanded row count in metadata mode:

- `VirtualizeJSON.Collapsable` can start with fewer expanded branches.
  - This usually means fewer flattened rows at first.
  - It can reduce filtering/indexing work for large, deep JSON trees.
- `VirtualizeJSON.Static` keeps all branches expanded.
  - This increases visible/flattened row count in large trees.
  - It can increase flatten/filter/index work compared with a collapsed starting state.

Static mode can still be preferable when you explicitly want full context visible and no expansion-state management.

## Benchmark snapshot (different modes)

The following numbers were captured on April 24, 2026 using:

```bash
npm run bench:modes
```

Environment:

- Node `v24.14.1`
- Platform `linux x64`
- Fixtures from `bench/fixtures/generated/`: `large-10mb.json`, `large-50mb.json`, `large-100mb.json`
- Iterations per mode `5`

Scope:

- `Collapsable` and `Static` include parse + expansion + flatten work.
- `Plain (metadata=false)` measures pretty-line generation behavior used in plain mode.

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

Interpretation:

- `Plain` is much faster in end-to-end snapshots because metadata=false bypasses incremental tree parsing and flattening.
- `Collapsable` is slower than plain because it still parses JSON and builds tree rows.
- `Static` remains heavier than Collapsable because full expansion increases expansion and flatten work.

## Choosing a mode

Choose `VirtualizeJSON.Collapsable` when:

- users need interactive navigation in large nested data
- you want progressive exploration from shallow depth
- you need controlled expansion from app state

Choose `VirtualizeJSON.Static` when:

- you need a fully expanded, read-only inspection view
- you want to avoid expansion UX and state wiring
- data sets are moderate, or full expansion is an explicit requirement
