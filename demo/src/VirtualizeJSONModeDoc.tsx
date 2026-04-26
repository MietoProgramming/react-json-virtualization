import React from "react";

const behaviorRows: Array<{
  topic: string;
  collapsable: string;
  staticMode: string;
}> = [
  {
    topic: "Expansion interaction",
    collapsable: "Users can expand/collapse nodes.",
    staticMode: "Tree is always expanded; toggles are disabled."
  },
  {
    topic: "Initial expansion",
    collapsable: "Starts from initialExpandDepth or defaultExpandedPaths.",
    staticMode: "Always expands to full depth."
  },
  {
    topic: "Controlled expansion",
    collapsable: "Supports expandedPaths and onExpandedPathsChange.",
    staticMode: "Expansion control props are intentionally omitted."
  },
  {
    topic: "Tree shape over time",
    collapsable: "Changes as users or parent state toggles paths.",
    staticMode: "Stays fully expanded after parse."
  },
  {
    topic: "metadata=false",
    collapsable: "Behaves like virtualized pretty JSON text.",
    staticMode: "Same behavior as Collapsable in this mode."
  }
];

const performanceRows: Array<{
  title: string;
  details: string;
}> = [
  {
    title: "Collapsable",
    details:
      "Can keep fewer branches open at first, which often reduces flattened row count and filtering/indexing work on deep JSON."
  },
  {
    title: "Static",
    details:
      "Keeps all branches open, which can increase flatten/filter/index cost on very large deep trees, but gives full context without expansion state management."
  }
];

type BenchmarkRow = {
  mode: string;
  avgMs: string;
  relative: string;
  outputSize: string;
};

const benchmarkSnapshots: Array<{
  fixture: string;
  sizeMb: string;
  rows: BenchmarkRow[];
}> = [
  {
    fixture: "large-10mb.json",
    sizeMb: "10.00",
    rows: [
      { mode: "Collapsable (metadata=true, depth=1)", avgMs: "1024.77", relative: "1.00x", outputSize: "64,838 rows" },
      { mode: "Static (metadata=true, alwaysExpanded)", avgMs: "1384.20", relative: "1.35x", outputSize: "842,834 rows" },
      { mode: "Plain (metadata=false)", avgMs: "136.72", relative: "0.13x", outputSize: "1,037,335 lines" }
    ]
  },
  {
    fixture: "large-50mb.json",
    sizeMb: "50.00",
    rows: [
      { mode: "Collapsable (metadata=true, depth=1)", avgMs: "5230.99", relative: "1.00x", outputSize: "324,181 rows" },
      { mode: "Static (metadata=true, alwaysExpanded)", avgMs: "7630.65", relative: "1.46x", outputSize: "4,214,293 rows" },
      { mode: "Plain (metadata=false)", avgMs: "911.44", relative: "0.17x", outputSize: "5,186,823 lines" }
    ]
  },
  {
    fixture: "large-100mb.json",
    sizeMb: "100.00",
    rows: [
      { mode: "Collapsable (metadata=true, depth=1)", avgMs: "10771.17", relative: "1.00x", outputSize: "648,359 rows" },
      { mode: "Static (metadata=true, alwaysExpanded)", avgMs: "16062.59", relative: "1.49x", outputSize: "8,428,607 rows" },
      { mode: "Plain (metadata=false)", avgMs: "1776.98", relative: "0.16x", outputSize: "10,373,671 lines" }
    ]
  }
];

const sharedCapabilities = [
  "Incremental parsing callbacks (progress + errors)",
  "Path/value filtering",
  "Selection callbacks",
  "Theme overrides",
  "Virtualization controls (height, rowHeight, overscan)"
] as const;

export function VirtualizeJSONModeDoc(): React.ReactElement {
  const docPath = `${import.meta.env.BASE_URL}docs/virtualizejson-modes.md`;

  return (
    <section className="panel mode-doc-panel" aria-labelledby="mode-doc-title">
      <div className="mode-doc-header">
        <h2 id="mode-doc-title">Collapsable vs Static</h2>
        <a href={docPath} target="_blank" rel="noreferrer" className="mode-doc-link">
          Open full markdown doc
        </a>
      </div>

      <p className="mode-doc-intro">
        Choose mode by interaction needs first, then by expansion workload. Both modes stay
        virtualized; the biggest practical difference is whether the tree can stay partially
        collapsed.
      </p>

      <div className="mode-doc-table-wrap">
        <table className="mode-doc-table">
          <thead>
            <tr>
              <th scope="col">Topic</th>
              <th scope="col">VirtualizeJSON.Collapsable</th>
              <th scope="col">VirtualizeJSON.Static</th>
            </tr>
          </thead>
          <tbody>
            {behaviorRows.map((row) => (
              <tr key={row.topic}>
                <th scope="row">{row.topic}</th>
                <td>{row.collapsable}</td>
                <td>{row.staticMode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Performance notes</h3>
      <ul>
        {performanceRows.map((row) => (
          <li key={row.title}>
            <strong>{row.title}:</strong> {row.details}
          </li>
        ))}
      </ul>

      <h3>Shared capabilities</h3>
      <ul>
        {sharedCapabilities.map((capability) => (
          <li key={capability}>{capability}</li>
        ))}
      </ul>

      <h3>Benchmark snapshot</h3>
      <p className="mode-doc-benchmark-caption">
        End-to-end viewer-like benchmark: tree modes include parse + expansion + flatten,
        plain mode includes pretty-line generation. Node v24.14.1, linux x64, 5 iterations.
      </p>
      {benchmarkSnapshots.map((snapshot) => (
        <div className="mode-doc-benchmark-block" key={snapshot.fixture}>
          <h4>
            {snapshot.fixture} ({snapshot.sizeMb} MB)
          </h4>
          <div className="mode-doc-table-wrap">
            <table className="mode-doc-table benchmark-table">
              <thead>
                <tr>
                  <th scope="col">Mode</th>
                  <th scope="col">Avg ms</th>
                  <th scope="col">vs Collapsable</th>
                  <th scope="col">Output size</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.rows.map((row) => (
                  <tr key={`${snapshot.fixture}-${row.mode}`}>
                    <th scope="row">{row.mode}</th>
                    <td>{row.avgMs}</td>
                    <td>{row.relative}</td>
                    <td>{row.outputSize}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  );
}
