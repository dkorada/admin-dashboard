import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import type { Kpi } from "../lib/api";
import { Skeleton } from "./States";

interface Props {
  label: string;
  icon: ReactNode;
  kpi?: Kpi;
  format: (n: number) => string;
  spark?: number[];
  hint: string;
  /** Shown instead of the hint when there's no previous period to compare against. */
  hintNoCompare?: string;
  loading?: boolean;
}

export default function KpiCard({ label, icon, kpi, format, spark, hint, hintNoCompare, loading }: Props) {
  if (loading || !kpi) {
    return (
      <div className="card kpi">
        <Skeleton width={110} height={14} />
        <Skeleton width={140} height={30} />
        <Skeleton width={90} height={14} />
      </div>
    );
  }

  const change = kpi.previous ? (kpi.value - kpi.previous) / kpi.previous : null;
  const direction = change === null ? "none" : Math.abs(change) < 0.005 ? "flat" : change > 0 ? "up" : "down";
  const sparkData = spark?.map((v, i) => ({ i, v }));
  const gradientId = `spark-${label.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <div className="card kpi">
      <div className="kpi-head">
        <span className="kpi-label">{label}</span>
        <span className="kpi-icon">{icon}</span>
      </div>
      <div className="kpi-value">{format(kpi.value)}</div>
      <div className="kpi-foot">
        {direction === "none" ? null : (
          <span className={`delta delta-${direction}`}>
            {direction === "up" ? <ArrowUpRight size={14} /> : direction === "down" ? <ArrowDownRight size={14} /> : <Minus size={14} />}
            {change! > 0 ? "+" : ""}
            {(change! * 100).toFixed(1)}%
          </span>
        )}
        <span className="kpi-hint">{direction === "none" ? (hintNoCompare ?? hint) : hint}</span>
      </div>
      {sparkData && sparkData.length > 1 && (
        <div className="kpi-spark" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="var(--series-1)" stopOpacity={0.25} />
                  <stop offset="1" stopColor="var(--series-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke="var(--series-1)"
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
