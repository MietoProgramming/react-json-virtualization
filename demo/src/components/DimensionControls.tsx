interface DimensionControlsProps {
  height: number;
  rowHeight: number;
  overscan: number;
  onHeightChange: (v: number) => void;
  onRowHeightChange: (v: number) => void;
  onOverscanChange: (v: number) => void;
}

export function DimensionControls({
  height, rowHeight, overscan, onHeightChange, onRowHeightChange, onOverscanChange
}: DimensionControlsProps): JSX.Element {
  return (
    <div className="field-grid three-col">
      <label>
        Height
        <input type="number" min={240} max={1000} value={height}
          onChange={(e) => onHeightChange(Number(e.target.value))} />
      </label>
      <label>
        Row height
        <input type="number" min={16} max={48} value={rowHeight}
          onChange={(e) => onRowHeightChange(Number(e.target.value))} />
      </label>
      <label>
        Overscan
        <input type="number" min={0} max={40} value={overscan}
          onChange={(e) => onOverscanChange(Number(e.target.value))} />
      </label>
    </div>
  );
}
