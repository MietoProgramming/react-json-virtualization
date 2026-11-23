# Changelog

## 0.9.0
- Keep the active search result in view when navigating in either direction, including results rendered just outside the viewport.
- Keep rendered tree rows aligned with the configured virtualization row height.
- Restore search navigation controls in the demo.

## 0.5.0 - 2026-05-06
- Added `searchCaseSensitive` to control case sensitivity independently from path filtering. Default is `false` (previously search inherited `pathFilterCaseSensitive`), so set it explicitly to preserve prior behavior.
- Added `exact` to `pathFilterMode` to match full paths/segments and full values.
