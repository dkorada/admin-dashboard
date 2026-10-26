import { CalendarRange, Layers, RotateCcw } from "lucide-react";
import type { Meta } from "../lib/api";
import { PRESETS, type Filters } from "../lib/filters";

interface Props {
  meta: Meta;
  filters: Filters;
  onChange: (next: Partial<Filters>) => void;
  onReset: () => void;
  isDefault: boolean;
  loading: boolean;
}

export default function FilterBar({ meta, filters, onChange, onReset, isDefault, loading }: Props) {
  const min = meta.dataRange.from ?? undefined;
  const max = meta.dataRange.to ?? undefined;

  return (
    <div className="filter-bar" role="toolbar" aria-label="Dashboard filters">
      <div className="filter-group">
        <CalendarRange size={16} className="filter-icon" />
        <div className="segmented" role="radiogroup" aria-label="Date range">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              role="radio"
              aria-checked={filters.preset === p.value}
              className={filters.preset === p.value ? "active" : ""}
              onClick={() =>
                onChange(p.value === "custom" ? { preset: "custom", from: filters.from, to: filters.to } : { preset: p.value })
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {filters.preset === "custom" && (
        <div className="filter-group date-inputs">
          <label className="sr-only" htmlFor="from">
            From
          </label>
          <input
            id="from"
            type="date"
            className="input input-sm"
            value={filters.from}
            min={min}
            max={filters.to}
            onChange={(e) => e.target.value && onChange({ from: e.target.value })}
          />
          <span className="muted">to</span>
          <label className="sr-only" htmlFor="to">
            To
          </label>
          <input
            id="to"
            type="date"
            className="input input-sm"
            value={filters.to}
            min={filters.from}
            max={max}
            onChange={(e) => e.target.value && onChange({ to: e.target.value })}
          />
        </div>
      )}

      <div className="filter-group">
        <Layers size={16} className="filter-icon" />
        <label className="sr-only" htmlFor="plan">
          Plan
        </label>
        <select id="plan" className="input input-sm select" value={filters.plan} onChange={(e) => onChange({ plan: e.target.value })}>
          <option value="all">All plans</option>
          {meta.plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-spacer" />
      {loading && <div className="spinner spinner-sm" aria-label="Updating" />}
      {!isDefault && (
        <button className="btn btn-ghost btn-sm" onClick={onReset}>
          <RotateCcw size={14} /> Reset
        </button>
      )}
    </div>
  );
}
