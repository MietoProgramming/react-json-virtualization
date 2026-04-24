import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  VirtualizeJSON,
  type FlatJsonRow,
  type JsonThemeOverride,
  type PathFilterMode
} from "react-json-virtualization";
import { VirtualizeJSONModeDoc } from "./VirtualizeJSONModeDoc";

const sampleSources = [
  {
    label: "Users + stats",
    path: `${import.meta.env.BASE_URL}samples/users-and-stats.json`
  },
  {
    label: "Nested catalog",
    path: `${import.meta.env.BASE_URL}samples/nested-catalog.json`
  },
  {
    label: "Edge cases",
    path: `${import.meta.env.BASE_URL}samples/edge-cases.json`
  },
  {
    label: "Large 2M rows (text with spaces)",
    path: `${import.meta.env.BASE_URL}samples/large-2m-rows-with-spaces.json`
  }
] as const;

const themePresets: Array<{ name: string; value: JsonThemeOverride }> = [
  { name: "Default", value: {} },
  {
    name: "Warm Sand",
    value: {
      background: "#f8f2e6",
      rowHover: "#efe3cf",
      rowSelected: "#ddeaf9",
      key: "#7a3e0d",
      punctuation: "#5f5f57",
      string: "#00664b",
      number: "#1548a8",
      boolean: "#8d3100",
      null: "#69550a",
      focusRing: "#0046b8"
    }
  },
  {
    name: "Ocean Notebook",
    value: {
      background: "#edf5f7",
      rowHover: "#dcebef",
      rowSelected: "#c7def6",
      key: "#0f4668",
      punctuation: "#3f5c67",
      string: "#0a6a3d",
      number: "#1f3cae",
      boolean: "#8b3a1f",
      null: "#4e5f11",
      focusRing: "#2558d8"
    }
  }
];

async function readFileAsText(file: File): Promise<string> {
  return await file.text();
}

export function App(): React.ReactElement {
  const [viewerMode, setViewerMode] = useState<"collapsable" | "static">("collapsable");
  const [jsonText, setJsonText] = useState<string>("{}");
  const [activeSamplePath, setActiveSamplePath] = useState<string>(sampleSources[0].path);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [sourceLabel, setSourceLabel] = useState<string>("none");

  const [height, setHeight] = useState<number>(520);
  const [rowHeight, setRowHeight] = useState<number>(24);
  const [overscan, setOverscan] = useState<number>(8);
  const [metadata, setMetadata] = useState<boolean>(true);
  const [showLineNumbers, setShowLineNumbers] = useState<boolean>(true);
  const [initialExpandDepth, setInitialExpandDepth] = useState<number>(1);

  const [pathFilterQuery, setPathFilterQuery] = useState<string>("");
  const [pathFilterCaseSensitive, setPathFilterCaseSensitive] = useState<boolean>(false);
  const [pathFilterMode, setPathFilterMode] = useState<PathFilterMode>("auto");

  const [isControlledExpansion, setIsControlledExpansion] = useState<boolean>(false);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set<string>());

  const [selectedPath, setSelectedPath] = useState<string>("$");
  const [lastClickedRow, setLastClickedRow] = useState<FlatJsonRow | null>(null);

  const [parseProgress, setParseProgress] = useState<{ processed: number; total: number } | null>(
    null
  );
  const [parseError, setParseError] = useState<string | null>(null);

  const [themePresetName, setThemePresetName] = useState<string>(themePresets[0].name);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedTheme = useMemo<JsonThemeOverride>(() => {
    return themePresets.find((preset) => preset.name === themePresetName)?.value ?? {};
  }, [themePresetName]);

  const resetInteractiveState = useCallback(() => {
    setParseError(null);
    setParseProgress(null);
    setSelectedPath("$");
    setLastClickedRow(null);
    setExpandedPaths(new Set<string>());
  }, []);

  const loadSample = useCallback(
    async (path: string, label: string) => {
      setIsLoadingSample(true);
      try {
        const response = await fetch(path);
        if (!response.ok) {
          throw new Error(`Failed to fetch sample ${label} (${response.status})`);
        }

        const text = await response.text();
        setJsonText(text);
        setActiveSamplePath(path);
        setSourceLabel(`sample: ${label}`);
        resetInteractiveState();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load sample";
        setParseError(message);
      } finally {
        setIsLoadingSample(false);
      }
    },
    [resetInteractiveState]
  );

  const onFilePicked = useCallback(
    async (file: File) => {
      try {
        const text = await readFileAsText(file);
        setJsonText(text);
        setSourceLabel(`file: ${file.name}`);
        resetInteractiveState();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to read file";
        setParseError(message);
      }
    },
    [resetInteractiveState]
  );

  const onDropZoneDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files.item(0);
      if (!file) {
        return;
      }
      await onFilePicked(file);
    },
    [onFilePicked]
  );

  const parseProgressLabel = useMemo(() => {
    if (!parseProgress || parseProgress.total === 0) {
      return "-";
    }
    const percent = Math.min(100, Math.round((parseProgress.processed / parseProgress.total) * 100));
    return `${parseProgress.processed}/${parseProgress.total} chars (${percent}%)`;
  }, [parseProgress]);

  const hasViewerError = parseError !== null;

  return (
    <main className="demo-shell">
      <header className="demo-header">
        <h1>react-json-virtualization playground</h1>
        <p>
          Drag and drop JSON, load repo samples, and test parsing, filtering, selection, expansion,
          theming, and virtualization behavior in one place.
        </p>
      </header>

      <VirtualizeJSONModeDoc />

      <section className="panel controls-panel">
        <h2>Data Source</h2>

        <div
          className="drop-zone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDropZoneDrop}
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              fileInputRef.current?.click();
            }
          }}
        >
          <strong>Drop a JSON file here</strong>
          <span>or click to choose a local file</span>
        </div>

        <input
          ref={fileInputRef}
          className="file-input"
          type="file"
          accept="application/json,.json"
          onChange={async (event) => {
            const file = event.target.files?.item(0);
            if (file) {
              await onFilePicked(file);
            }
          }}
        />

        <div className="field-grid">
          <label>
            Repo sample
            <select
              value={activeSamplePath}
              onChange={(event) => {
                setActiveSamplePath(event.target.value);
              }}
            >
              {sampleSources.map((sample) => (
                <option key={sample.path} value={sample.path}>
                  {sample.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={async () => {
              const selected = sampleSources.find((sample) => sample.path === activeSamplePath);
              if (!selected) {
                return;
              }
              await loadSample(selected.path, selected.label);
            }}
            disabled={isLoadingSample}
          >
            {isLoadingSample ? "Loading sample..." : "Load selected sample"}
          </button>
        </div>

        <p className="muted">Active source: {sourceLabel}</p>
      </section>

      <section className="panel controls-panel">
        <h2>Viewer Controls</h2>

        <div className="field-grid three-col">
          <label>
            Height
            <input
              type="number"
              min={240}
              max={1000}
              value={height}
              onChange={(event) => setHeight(Number(event.target.value))}
            />
          </label>

          <label>
            Row height
            <input
              type="number"
              min={16}
              max={48}
              value={rowHeight}
              onChange={(event) => setRowHeight(Number(event.target.value))}
            />
          </label>

          <label>
            Overscan
            <input
              type="number"
              min={0}
              max={40}
              value={overscan}
              onChange={(event) => setOverscan(Number(event.target.value))}
            />
          </label></div>

         <div className="field-grid four-col">

          <label>
            Metadata
            <select
              value={metadata ? "enabled" : "disabled"}
              onChange={(event) => setMetadata(event.target.value === "enabled")}
            >
              <option value="enabled">enabled (tree + Object/Array meta)</option>
              <option value="disabled">disabled (virtualized pretty JSON)</option>
            </select>
          </label>

          <label>
            Pretty line numbers
            <select
              value={showLineNumbers ? "on" : "off"}
              onChange={(event) => setShowLineNumbers(event.target.value === "on")}
              disabled={metadata}
            >
              <option value="on">on</option>
              <option value="off">off</option>
            </select>
          </label>

          <label>
            Viewer mode
            <select
              value={viewerMode}
              onChange={(event) =>
                setViewerMode(event.target.value as "collapsable" | "static")
              }
            >
              <option value="collapsable">Collapsable</option>
              <option value="static">Static</option>
            </select>
          </label>

          <label>
            Initial expand depth
            <input
              type="number"
              min={0}
              max={8}
              value={initialExpandDepth}
              disabled={viewerMode === "static"}
              onChange={(event) => setInitialExpandDepth(Number(event.target.value))}
            />
          </label>

          <label>
            Filter mode
            <select
              value={pathFilterMode}
              onChange={(event) => setPathFilterMode(event.target.value as PathFilterMode)}
            >
              <option value="auto">auto</option>
              <option value="prefix">prefix</option>
              <option value="includes">includes</option>
            </select>
          </label>

          <label>
            Theme preset
            <select
              value={themePresetName}
              onChange={(event) => setThemePresetName(event.target.value)}
            >
              {themePresets.map((preset) => (
                <option key={preset.name} value={preset.name}>
                  {preset.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="field-grid">
          <label>
            Path/value filter query
            <input
              type="text"
              placeholder='e.g. zero hello, "new york" name, or $.users[1]'
              value={pathFilterQuery}
              onChange={(event) => setPathFilterQuery(event.target.value)}
            />
          </label>
        </div>

        <div className="toggle-row">
          <label>
            <input
              type="checkbox"
              checked={pathFilterCaseSensitive}
              onChange={(event) => setPathFilterCaseSensitive(event.target.checked)}
            />
            Case sensitive filter
          </label>

          <label>
            <input
              type="checkbox"
              checked={isControlledExpansion}
              disabled={viewerMode === "static"}
              onChange={(event) => setIsControlledExpansion(event.target.checked)}
            />
            Use controlled expansion
          </label>

          <button
            type="button"
            onClick={() => {
              setSelectedPath("$");
              setPathFilterQuery("");
              setExpandedPaths(new Set<string>());
            }}
          >
            Reset viewer state
          </button>
        </div>
      </section>

      <section className="panel status-panel">
        <h2>Live State</h2>
        <ul>
          <li>Parse progress: {parseProgressLabel}</li>
          <li>Parse error: {hasViewerError ? parseError : "none"}</li>
          <li>Viewer mode: {viewerMode}</li>
          <li>Metadata mode: {metadata ? "enabled" : "disabled"}</li>
          <li>Pretty line numbers: {metadata ? "n/a" : showLineNumbers ? "on" : "off"}</li>
          <li>Selected path: {selectedPath}</li>
          <li>
            Controlled expanded paths: {viewerMode === "collapsable" ? expandedPaths.size : "n/a (static)"}
          </li>
          <li>
            Last clicked node: {lastClickedRow ? `${lastClickedRow.path} (${lastClickedRow.valueType})` : "none"}
          </li>
        </ul>
      </section>

      <section className="panel viewer-panel">
        <h2>JSON Viewer</h2>
        {viewerMode === "collapsable" ? (
          <VirtualizeJSON.Collapsable
            json={jsonText}
            metadata={metadata}
            showLineNumbers={showLineNumbers}
            height={height}
            rowHeight={rowHeight}
            overscan={overscan}
            initialExpandDepth={initialExpandDepth}
            expandedPaths={isControlledExpansion ? expandedPaths : undefined}
            onExpandedPathsChange={(nextPaths) => {
              setExpandedPaths(new Set<string>(nextPaths));
            }}
            pathFilterQuery={pathFilterQuery}
            pathFilterCaseSensitive={pathFilterCaseSensitive}
            pathFilterMode={pathFilterMode}
            theme={selectedTheme}
            selectedPath={selectedPath}
            onNodeClick={(path, row) => {
              setSelectedPath(path);
              setLastClickedRow(row);
            }}
            onParseProgress={(processed, total) => {
              setParseProgress({ processed, total });
            }}
            onParseError={(error) => {
              setParseError(error.message);
            }}
          />
        ) : (
          <VirtualizeJSON.Static
            json={jsonText}
            metadata={metadata}
            showLineNumbers={showLineNumbers}
            height={height}
            rowHeight={rowHeight}
            overscan={overscan}
            pathFilterQuery={pathFilterQuery}
            pathFilterCaseSensitive={pathFilterCaseSensitive}
            pathFilterMode={pathFilterMode}
            theme={selectedTheme}
            selectedPath={selectedPath}
            onNodeClick={(path, row) => {
              setSelectedPath(path);
              setLastClickedRow(row);
            }}
            onParseProgress={(processed, total) => {
              setParseProgress({ processed, total });
            }}
            onParseError={(error) => {
              setParseError(error.message);
            }}
          />
        )}
      </section>
    </main>
  );
}
