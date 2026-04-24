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

- `Collapsable` and `Static` measure mode-specific content preparation on a pre-parsed root.
- `Plain (metadata=false)` measures pretty-line generation behavior used in plain mode.

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

Interpretation:

- `Static` remains significantly heavier on deep/large JSON because all branches are expanded before flattening.
- `Collapsable` remains fastest in these snapshots because shallow expansion keeps row counts much lower.
- `Plain` avoids tree flattening but still pays for pretty-line generation on minified JSON.

## Choosing a mode

Choose `VirtualizeJSON.Collapsable` when:

- users need interactive navigation in large nested data
- you want progressive exploration from shallow depth
- you need controlled expansion from app state

Choose `VirtualizeJSON.Static` when:

- you need a fully expanded, read-only inspection view
- you want to avoid expansion UX and state wiring
- data sets are moderate, or full expansion is an explicit requirement
