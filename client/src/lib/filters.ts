import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export type Preset = "3m" | "6m" | "12m" | "ytd" | "custom";

export const PRESETS: { value: Preset; label: string }[] = [
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "12m", label: "12M" },
  { value: "ytd", label: "YTD" },
  { value: "custom", label: "Custom" },
];

export interface Filters {
  preset: Preset;
  from: string;
  to: string;
  plan: string;
}

function monthStart(anchor: string, monthsBack: number): string {
  const [y, m] = anchor.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 - monthsBack, 1));
  return d.toISOString().slice(0, 10);
}

export function presetRange(preset: Exclude<Preset, "custom">, anchor: string) {
  switch (preset) {
    case "3m":
      return { from: monthStart(anchor, 2), to: anchor };
    case "6m":
      return { from: monthStart(anchor, 5), to: anchor };
    case "12m":
      return { from: monthStart(anchor, 11), to: anchor };
    case "ytd":
      return { from: `${anchor.slice(0, 4)}-01-01`, to: anchor };
  }
}

/**
 * Filter state lives in the URL (?range=6m&plan=pro or ?range=custom&from=…&to=…)
 * so a filtered view can be bookmarked or shared.
 */
function parse(params: URLSearchParams, anchor: string): Filters {
  const raw = params.get("range") as Preset | null;
  const preset: Preset = raw && PRESETS.some((p) => p.value === raw) ? raw : "12m";
  const plan = params.get("plan") ?? "all";
  if (preset === "custom") {
    const fallback = presetRange("12m", anchor);
    return { preset, plan, from: params.get("from") ?? fallback.from, to: params.get("to") ?? fallback.to };
  }
  return { preset, plan, ...presetRange(preset, anchor) };
}

function serialize(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.preset !== "12m") p.set("range", f.preset);
  if (f.preset === "custom") {
    p.set("from", f.from);
    p.set("to", f.to);
  }
  if (f.plan !== "all") p.set("plan", f.plan);
  return p;
}

/**
 * Filter state lives in the URL (?range=6m&plan=pro or ?range=custom&from=…&to=…)
 * so a filtered view can be bookmarked or shared.
 */
export function useFilters(anchor: string | null) {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => (anchor ? parse(params, anchor) : null), [params, anchor]);

  function update(next: Partial<Filters>) {
    if (!anchor) return;
    // Merge against the latest URL, not this render's copy, so quick successive changes all stick.
    setParams((prev) => serialize({ ...parse(prev, anchor), ...next }), { replace: true });
  }

  const isDefault = filters?.preset === "12m" && filters.plan === "all";
  return { filters, update, reset: () => setParams(new URLSearchParams(), { replace: true }), isDefault };
}
