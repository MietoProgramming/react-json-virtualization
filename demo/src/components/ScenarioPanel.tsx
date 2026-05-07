import { demoScenarios } from "../constants";

interface ScenarioPanelProps {
  onScenarioApply: (scenario: typeof demoScenarios[0]) => void;
}

export function ScenarioPanel({ onScenarioApply }: ScenarioPanelProps): JSX.Element {
  return (
    <section className="panel controls-panel">
      <h2>Search + Filter Scenarios</h2>
      <p className="muted">
        Quick presets for validating that search matches are limited to filtered lines in plain
        mode.
      </p>
      <div className="scenario-grid">
        {demoScenarios.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            className="scenario-card"
            onClick={() => onScenarioApply(scenario)}
          >
            <strong>{scenario.label}</strong>
            <span>{scenario.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
