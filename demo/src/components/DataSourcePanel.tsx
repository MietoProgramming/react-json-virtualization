import { useRef } from "react";
import { sourceFormatFromFileName } from "react-json-virtualization";
import type { SourceFormat } from "react-json-virtualization";
import { sampleSources } from "../constants";

interface DataSourcePanelProps {
  activeSamplePath: string;
  isLoadingSample: boolean;
  sourceLabel: string;
  onSampleSelect: (path: string, label: string) => void;
  onFilePicked: (file: File) => void;
}

export function DataSourcePanel({
  activeSamplePath,
  isLoadingSample,
  sourceLabel,
  onSampleSelect,
  onFilePicked
}: DataSourcePanelProps): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <section className="panel controls-panel">
      <h2>Data Source</h2>

      <div
        className="drop-zone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={async (event) => {
          event.preventDefault();
          const file = event.dataTransfer.files.item(0);
          if (file) {
            await onFilePicked(file);
          }
        }}
        role="button"
        tabIndex={0}
        onClick={triggerFileInput}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            triggerFileInput();
          }
        }}
      >
        <strong>Drop a JSON, YAML, XML, or Markdown file here</strong>
        <span>or click to choose a local file</span>
      </div>

      <input
        ref={fileInputRef}
        className="file-input"
        type="file"
        accept="application/json,application/xml,text/xml,text/markdown,text/plain,text/yaml,application/x-yaml,.json,.xml,.yaml,.yml,.md,.markdown,.txt"
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
              const selected = sampleSources.find((s) => s.path === event.target.value);
              if (selected) {
                onSampleSelect(event.target.value, selected.label);
              }
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
            const selected = sampleSources.find((s) => s.path === activeSamplePath);
            if (selected) {
              await onSampleSelect(activeSamplePath, selected.label);
            }
          }}
          disabled={isLoadingSample}
        >
          {isLoadingSample ? "Loading sample..." : "Load selected sample"}
        </button>
      </div>

      <p className="muted">Active source: {sourceLabel}</p>
    </section>
  );
}
