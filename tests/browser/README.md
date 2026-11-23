# Search navigation in Firefox

Load [search-navigation.json](search-navigation.json) in the demo using its file picker. Leave the viewer height at 520, row height at 24, and overscan at 8. Search for `rjv-needle`. Click **Next** four times and **Prev** four times. Every selected row should be fully visible. Click **Prev** once more to wrap to the fifth result, then **Next** to return to the first.

## Measured regression

Firefox 160.0.1 on macOS reported a 518 px scroll viewport. The table shows the active row's vertical bounds in pixels relative to the top of that viewport. The baseline used the library from `2980f52` with only the demo search metadata callback restored, which enabled the navigation buttons.

| Action | Active result | Before | After |
| --- | --- | --- | --- |
| Next to 2 / 5 | `$[23]` | 576–600, below viewport | 247–271 |
| Next to 4 / 5 | `$[75]` | 535–559, below viewport | 247–271 |
| Prev to 4 / 5 | `$[75]` | −41 to −17, above viewport | 247–271 |

## Automated browser check

Start the demo from the repository root after installing dependencies.

```sh
npm run demo -- --host 127.0.0.1 --port 4179 --strictPort
```

Launch Firefox with a fresh profile and its WebDriver BiDi port. On macOS, replace `firefox` with `/Applications/Firefox.app/Contents/MacOS/firefox` if needed.

```sh
firefox --headless --no-remote --profile "$(mktemp -d)" --remote-debugging-port 9227 about:blank
```

Run the check with Node.js 22 or later.

```sh
node tests/browser/search-navigation.mjs
```

The check verifies the active path or line number and its viewport bounds at each step in tree and plain modes, at a custom row height, and with overscan disabled. It exits with status 1 for a wrong or clipped result. Use `RJV_DEMO_URL` and `RJV_BIDI_URL` to override the local endpoints.
