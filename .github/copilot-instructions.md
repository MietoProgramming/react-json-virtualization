# Copilot Instructions for react-json-virtualization

These rules keep the library maintainable, predictable, and release-safe.

## Architecture and file size

- Keep every source file under 200 lines.
- If a file approaches 180 lines, split by responsibility:
  - UI rendering into small components.
  - data derivation into hooks.
  - pure logic into core utilities.
- Do not merge unrelated concerns into one module.

## Public API discipline

- Treat exports in src/index.ts as the stable public API.
- Avoid breaking API changes unless explicitly requested.
- For any API change, update README API docs and add or update tests in tests/.

## TypeScript and React standards

- Use strict TypeScript patterns and explicit public types.
- Prefer immutable data flows and pure functions in core logic.
- Keep React components focused on orchestration and rendering.
- Move expensive derived data into useMemo or pure helpers.
- Keep hooks side effects isolated and cancellable when async work is involved.

## Performance and large JSON handling

- Preserve virtualization behavior and fixed row-height assumptions.
- Avoid repeated heavy parsing or flattening in render paths.
- Reuse indexes for filtering when available.
- Do not introduce O(n^2) work for common interactions.

## Testing expectations

- Add or update tests for every behavior change.
- Cover both metadata=true and metadata=false paths when relevant.
- Verify controlled and uncontrolled expansion behavior when touched.
- Run npm run test and npm run build after non-trivial changes.

## Styling and UX consistency

- Reuse existing CSS token variables and class naming conventions.
- Do not introduce inline styles unless they are truly dynamic.
- Keep keyboard/accessibility behavior intact for tree interactions.

## Change hygiene

- Keep diffs small and focused.
- Avoid broad refactors unless requested.
- Include short comments only for non-obvious logic.
- Never add dependencies without clear justification.
