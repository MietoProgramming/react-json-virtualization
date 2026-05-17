interface RowCustomizationPanelProps {
  rowHighlightQuery: string;
  rowHideQuery: string;
  rowHighlightEnabled: boolean;
  rowActionsEnabled: boolean;
  rowRendererEnabled: boolean;
  rowHideEnabled: boolean;
  rowToggleStyleEnabled: boolean;
  onRowHighlightQueryChange: (v: string) => void;
  onRowHideQueryChange: (v: string) => void;
  onRowHighlightEnabledChange: (v: boolean) => void;
  onRowActionsEnabledChange: (v: boolean) => void;
  onRowRendererEnabledChange: (v: boolean) => void;
  onRowHideEnabledChange: (v: boolean) => void;
  onRowToggleStyleEnabledChange: (v: boolean) => void;
}

export function RowCustomizationPanel({
  rowHighlightQuery,
  rowHideQuery,
  rowHighlightEnabled,
  rowActionsEnabled,
  rowRendererEnabled,
  rowHideEnabled,
  rowToggleStyleEnabled,
  onRowHighlightQueryChange,
  onRowHideQueryChange,
  onRowHighlightEnabledChange,
  onRowActionsEnabledChange,
  onRowRendererEnabledChange,
  onRowHideEnabledChange,
  onRowToggleStyleEnabledChange
}: RowCustomizationPanelProps): JSX.Element {
  return (
    <section className="panel row-customization-panel">
      <h2>Row Customization</h2>
      <p className="row-customization-note">
        Use this panel to highlight, hide, or override individual rows/lines. Rules match against
        row text (key + value in tree mode, raw line text in plain mode).
      </p>
      <div className="field-grid">
        <label>
          Highlight query (e.g. craw)
          <input
            type="text"
            placeholder="Text to highlight and decorate"
            value={rowHighlightQuery}
            onChange={(e) => onRowHighlightQueryChange(e.target.value)}
          />
        </label>
        <label>
          Hide query
          <input
            type="text"
            placeholder="Text to hide from view"
            value={rowHideQuery}
            onChange={(e) => onRowHideQueryChange(e.target.value)}
          />
        </label>
      </div>
      <div className="row-customization-hints">
        <p>Quick test ideas:</p>
        <ul>
          <li>Users + stats sample: highlight "name" or "Ada", hide "roles".</li>
          <li>Expand/collapse users to see nested rows update.</li>
          <li>Toggle alternate expand/collapse styling for visibility.</li>
          <li>Nested catalog sample: highlight "name" or "Wireless".</li>
          <li>Plain mode: switch Metadata off and try "2026".</li>
        </ul>
      </div>
      <div className="toggle-row">
        <label>
          <input
            type="checkbox"
            checked={rowHighlightEnabled}
            onChange={(e) => onRowHighlightEnabledChange(e.target.checked)}
          />
          Highlight matches
        </label>
        <label>
          <input
            type="checkbox"
            checked={rowActionsEnabled}
            onChange={(e) => onRowActionsEnabledChange(e.target.checked)}
          />
          Add action button
        </label>
        <label>
          <input
            type="checkbox"
            checked={rowRendererEnabled}
            onChange={(e) => onRowRendererEnabledChange(e.target.checked)}
          />
          Use custom renderer
        </label>
        <label>
          <input
            type="checkbox"
            checked={rowHideEnabled}
            onChange={(e) => onRowHideEnabledChange(e.target.checked)}
          />
          Hide matches
        </label>
        <label>
          <input
            type="checkbox"
            checked={rowToggleStyleEnabled}
            onChange={(e) => onRowToggleStyleEnabledChange(e.target.checked)}
          />
          Alternate expand/collapse style
        </label>
      </div>
      <p className="row-customization-note">
        Custom render output should stay within the fixed row height.
      </p>
    </section>
  );
}
