import React, { useEffect, useMemo, useState } from "react";
import { VirtualizeJSON } from "react-json-virtualization";
import { createLocalDocumentProcessor, type StructuredFormat } from "react-json-virtualization/core";
import { createWorkerProcessor } from "react-json-virtualization/worker";

const samples: Record<StructuredFormat, { before: string; after: string }> = {
  json: {
    before: '{\n  "users": [{"id": 1, "name": "Ada"}, {"id": 2, "name": "Linus"}],\n  "status": "draft"\n}',
    after: '{\n  "users": [{"id": 3, "name": "Grace"}, {"id": 1, "name": "Ada Lovelace"}, {"id": 2, "name": "Linus"}],\n  "status": "published"\n}'
  },
  yaml: {
    before: "users:\n  - id: 1\n    name: Ada\n  - id: 2\n    name: Linus\nstatus: draft\n",
    after: "users:\n  - id: 3\n    name: Grace\n  - id: 1\n    name: Ada Lovelace\n  - id: 2\n    name: Linus\nstatus: published\n"
  },
  xml: {
    before: '<users><user id="1">Ada</user><user id="2">Linus</user></users>',
    after: '<users><user id="3">Grace</user><user id="1">Ada Lovelace</user><user id="2">Linus</user></users>'
  }
};

export function DiffDemoPanel(): React.ReactElement {
  const [format, setFormat] = useState<StructuredFormat>("json");
  const [before, setBefore] = useState(samples.json.before);
  const [after, setAfter] = useState(samples.json.after);
  const [arrayKey, setArrayKey] = useState("id");
  const [useWorker, setUseWorker] = useState(false);
  const [workerError, setWorkerError] = useState("");
  const processor = useMemo(() => useWorker
    ? createWorkerProcessor(() => new Worker(new URL("../document.worker.ts", import.meta.url), { type: "module" }))
    : createLocalDocumentProcessor(), [useWorker]);
  const compareOptions = useMemo(() => ({
    arrayKeys: arrayKey.trim() && format !== "xml" ? { "$.users": arrayKey.trim() } : undefined
  }), [arrayKey, format]);
  const beforeInput = useMemo(() => ({ format, text: before }), [before, format]);
  const afterInput = useMemo(() => ({ format, text: after }), [after, format]);
  const summaryOptions = useMemo(() => ({ locale: "pl" as const }), []);

  useEffect(() => () => processor.dispose?.(), [processor]);

  const changeFormat = (next: StructuredFormat): void => {
    setFormat(next);
    setBefore(samples[next].before);
    setAfter(samples[next].after);
    setWorkerError("");
  };

  return (
    <section className="panel demo-diff-panel">
      <h2>Compare documents</h2>
      <div className="demo-diff-controls">
        <label>Format
          <select value={format} onChange={(event) => changeFormat(event.target.value as StructuredFormat)}>
            <option value="json">JSON</option><option value="yaml">YAML</option><option value="xml">XML</option>
          </select>
        </label>
        {format !== "xml" && <label>Array identity field
          <input value={arrayKey} onChange={(event) => setArrayKey(event.target.value)} placeholder="id" />
        </label>}
        <label className="demo-worker-toggle">
          <input type="checkbox" checked={useWorker} onChange={(event) => setUseWorker(event.target.checked)} />
          Run comparison in Web Worker
        </label>
      </div>
      <div className="demo-diff-inputs">
        <label>Before<textarea value={before} onChange={(event) => setBefore(event.target.value)} spellCheck={false} /></label>
        <label>After<textarea value={after} onChange={(event) => setAfter(event.target.value)} spellCheck={false} /></label>
      </div>
      {workerError && <p role="alert" className="demo-error">{workerError}</p>}
      <VirtualizeJSON.Diff
        before={beforeInput}
        after={afterInput}
        compareOptions={compareOptions}
        processor={processor}
        height={520}
        summaryOptions={summaryOptions}
        onError={(error) => setWorkerError(error.message)}
      />
    </section>
  );
}
