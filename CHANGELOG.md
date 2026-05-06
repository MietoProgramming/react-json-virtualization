# Changelog

## 0.5.0 - 2026-05-06
- Added `searchCaseSensitive` to control case sensitivity independently from path filtering. Default is `false` (previously search inherited `pathFilterCaseSensitive`), so set it explicitly to preserve prior behavior.
- Added `exact` to `pathFilterMode` to match full paths/segments and full values.
