# react-json-virtualization

Virtualized React JSON viewer optimized for large JSON strings with token-based color theming.

## Status

Early v1 implementation.

## Features

- Incremental async JSON parsing on the main thread
- Virtualized tree rendering for large nested structures
- Expand/collapse nodes with keyboard support
- Token-based color theme overrides (keys, values, punctuation)
- TypeScript-first public API

## Install

```bash
npm install react-json-virtualization
```

## Usage

```tsx
import { JSONViewer } from "react-json-virtualization";

const payload = JSON.stringify({
  users: [{ id: 1, name: "Ada" }, { id: 2, name: "Linus" }],
  stats: { total: 2, active: true }
});

export function Example() {
  return (
    <JSONViewer
      json={payload}
      height={480}
      rowHeight={24}
      initialExpandDepth={1}
      theme={{
        key: "#8a4f00",
        string: "#006b4f",
        number: "#094b9d"
      }}
    />
  );
}
```

## API

### JSONViewer props

- `json: string` Raw JSON string input.
- `height?: number | string` Container height. Default `520`.
- `rowHeight?: number` Fixed row height used by virtualization. Default `24`.
- `overscan?: number` Number of extra rows rendered around viewport. Default `8`.
- `initialExpandDepth?: number` Initial expansion depth from root. Default `1`.
- `theme?: JsonThemeOverride` Per-token color overrides.
- `selectedPath?: string` Controlled selected node path.
- `className?: string` Optional custom class.
- `onNodeClick?: (path, row) => void` Node selection callback.
- `onParseProgress?: (processed, total) => void` Parse progress callback.
- `onParseError?: (error) => void` Parse error callback.

## Development

```bash
npm install
npm run typecheck
npm run test
npm run build
```
