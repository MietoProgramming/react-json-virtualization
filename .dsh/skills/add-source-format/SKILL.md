---
name: add-source-format
description: Add or extend a data source format (for example markdown, yaml, xml, text, or html) in the react-json-virtualization library and demo. Use when a new plain-text source format must be recognized by content or file extension, rendered as pretty text (not a tree), detected before JSON/XML/anything it might resemble, wired into the demo (options, samples, drag-accept), covered by tests, and passes typecheck + tests + build. Handles the distinction between structured (tree-metadata) and plain (pretty-line) formats.
whenToUse: Adding a new SourceFormat/ResolvedSourceFormat member, wiring content-detection (resolveSourceFormat) or filename detection (sourceFormatFromFileName) in src/core/sourceFormat.ts, implementing the parser entry point in src/core/sourceParser.ts, or making a plain text format (markdown/yaml/xml/text/html) available end-to-end in the demo.
metadata:
  repo: react-json-virtualization
  referenceFormat: html
---

# Add a source format

Teach `react-json-virtualization` to recognize and render a new data **source format** (e.g. markdown, yaml, xml, text, html). The canonical completed example in this repo is **HTML**, which is added as a *plain* (pretty-line) format — only `json` produces the expandable tree. Follow this workflow to add any other format the same way.

## Mental model: two rendering paths

`SourceFormat` is the user-facing enum (including the special `"auto"` hint). `ResolvedSourceFormat` excludes `"auto"`. Every other format maps to one of two rendering behaviors:

- **Tree-metadata** (expandable, searchable tree) — only `"json"`.
- **Plain** (pretty text, one line per source line) — `"yaml" | "xml" | "markdown" | "text" | "html"`.

The gate is `supportsTreeMetadata(format)` in `src/core/sourceFormat.ts`: it returns `true` **only** for `"json"`. **A format becomes "tree" capable simply by NOT returning `false` here — so add a plain format by leaving this function unchanged.** For tree formats there is a separate `ParseOptions` block (`yieldIntervalMs?`, `signal?`, `onProgress?`) used only by JSON parsers; plain formats ignore it.

## Architecture map

| File | Responsibility |
|---|---|
| `src/core/sourceFormat.ts` | The `SourceFormat`/`ResolvedSourceFormat` type union; detection functions `looksLike*`, `resolveSourceFormat`, `sourceFormatFromFileName`, and `supportsTreeMetadata`. |
| `src/core/sourceParser.ts` | `parseSourceIncremental(source, format, options)` — the single entry point. |
| `src/core/types.ts` | `ParseOptions` shape (`yieldIntervalMs?`, `signal?`, `onProgress?`); plain formats pass `{}`. |
| `src/index.ts` | Public re-exports, including `SourceFormat` and `ResolvedSourceFormat` line 36. |
| `demo/src/constants.ts` | `sourceFormatOptions` + sample entries (HTML sample path). |
| `demo/src/components/DataSourcePanel.tsx` | The drop-zone `accept` list and drop-format labels. |
| `demo/src/components/DemoHeader.tsx` | Header text listing formats. |
| `tests/source-format.test.ts` | Auto-detect, filename mapping, `supportsTreeMetadata`, and incremental parse. |
| `demo/public/samples/webpage-demo.html` | HTML fixture used by the demo sample. |

## Workflow: add one format

Work from detection outward, validating after each layer. Use HTML as the concrete reference at every step.

### 1. Extend the type union

Add the new format string to the `SourceFormat` union in `src/core/sourceFormat.ts` (keep it alphabetically mixed into the existing list). Example:

```ts
export type SourceFormat =
  "auto" | "json" | "yaml" | "xml" | "markdown" | "text" | "html";
```

No change to `ResolvedSourceFormat = Exclude<SourceFormat, "auto">`.

### 2. Write a content detector

Add a private `looksLike<Format>(source)` helper. Detect by a **strong signal** only (a distinctive prefix) to avoid false positives. HTML uses a doctype check plus an `<html…>` root-tag check:

```ts
const HTML_DOCTYPE_PATTERN = /<!DOCTYPE\s+HTML/i;
const HTML_ROOT_TAG_PATTERN = /^\s*(?:<!--[\s\S]*?-->)*?<html[\s/>]/i;
```

### 3. Register content detection — and worry about ordering

In `resolveSourceFormat`, after the empty-string guard, detect the **new** format **before** any generic prefix that it might also match. This is the single most common bug: a format whose text starts with a character another format keys on (HTML starts with `<`, which XML also keys on) must be tried first.

```ts
// for HTML, placed BEFORE the "<"-prefixed xml branch:
if (looksLikeHtml(trimmed)) return "html";
if (trimmed.startsWith("<")) return "xml";   // <htmlX> is XML, <html> is HTML
if (JSON_START_PATTERN.test(trimmed)) return "json";
...
```

Gotchas to preserve:
- **Must precede** the `<`→xml branch. If placed after, an HTML document would be misclassified as XML.
- **Must not catch JSON.** JSON text starts with `{`/`[` — the doctype/root-tag guards already exclude it, but re-check the strong signal.
- **Precisely distinguish close XML.** Guard the root tag with a trailing `[\s/>]` so `<html>` matches but a genuinely-XML tag like `<htmlX>` or `<htmlFoo>` does **not**.

### 4. Register filename detection

In `sourceFormatFromFileName`, map the new extension before more generic ones, and accept the common alternates:

```ts
if (normalized.endsWith(".html") || normalized.endsWith(".htm")) {
    return "html";
}
```

### 5. Leave the parser entry point alone (plain formats)

In `src/core/sourceParser.ts`, `parseSourceIncremental` already branches: if `resolvedFormat !== "json"` it returns `{ root: null, format: resolvedFormat }` (plain rendering) and never touches `ParseOptions`. **Adding a plain format requires no parser code** — the new detection from steps 2–4 is sufficient. If you later add a *tree* format, you would instead implement a parser and branch on it here.

### 6. Leave `supportsTreeMetadata` as the one-line gate

Because `supportsTreeMetadata(format)` returns `true` only for `"json"`, a plain format is fully "tree-disabled" by default. **Do not modify it** for a plain format. (A tree format would add an OR case.)

## Wire the demo

1. **`demo/src/constants.ts`** — add `{ label: "html", value: "html" }` to `sourceFormatOptions`, and a sample entry: `{ label: "Webpage (HTML)", path: `${import.meta.env.BASE_URL}samples/webpage-demo.html` }`.
2. **`demo/src/components/DataSourcePanel.tsx`** — add the new extensions/mime types (`.html`, `.htm`, `text/html`, `application/xhtml+xml`) to the drop-zone `accept` attribute and to the plain-format drop labels.
3. **`demo/src/components/DemoHeader.tsx`** — list the new format in the header's format prose.
4. **`demo/public/samples/…`** — add a representative fixture (a minimal `<!DOCTYPE html>` page).

## Write the tests

In `tests/source-format.test.ts` cover, for the new format:

- **Auto-detect** from source text (`resolveSourceFormat(htmlString) === "html"`).
- **Filename mapping** (`sourceFormatFromFileName("page.html") === "html"`, and any `.htm` alternate).
- **`supportsTreeMetadata("html") === false`** (proves plain behavior).
- **Incremental parse** → `{ format: "html", root: null }` via `parseSourceIncremental(source, "html")`, and via `resolveSourceFormat(..., "auto")` when the sample actually looks like HTML.

## Validate before finishing

Run, in order, and confirm each exits `0`:

```bash
npm run typecheck   # tsc --noEmit
npm run test        # vitest run (jsdom) — assert the new cases pass
npm run build       # tsup -> dist/ (d.ts, cjs, esm)
npm run demo:build  # vite build demo/dist
```

Optional full gate: `npm run prepublishOnly` (typecheck + test + build).
