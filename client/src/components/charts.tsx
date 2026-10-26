import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReactNode } from "react";
import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { DashboardData } from "../lib/api";
import { fmt, monthLabel } from "../lib/format";

// Categorical slots in fixed order (see styles: --series-1..5). Regions keep their
// color even when filters change, because color follows the entity, not its rank.
const REGION_ORDER = ["North America", "Europe", "Asia Pacific", "Latin America", "Middle East & Africa"];
export const regionColor = (region: string) => {
  const i = REGION_ORDER.indexOf(region);
  return `var(--series-${i === -1 ? 6 : i + 1})`;
};

const axis = { stroke: "var(--axis)", tick: { fill: "var(--text-muted)", fontSize: 12 }, tickLine: false };

interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

function TooltipBox({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{title}</div>
      {rows.map((r) => (
        <div className="chart-tooltip-row" key={r.label}>
          {r.color && <span className="swatch" style={{ background: r.color }} />}
          <span className="chart-tooltip-label">{r.label}</span>
          <span className="chart-tooltip-value">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Adapts a renderer for one hovered data row into Recharts tooltip content. */
function tip<T>(render: (row: T) => ReactNode) {
  return ({ active, payload }: TooltipContentProps<ValueType, NameType>) => {
    const row = payload?.[0]?.payload as T | undefined;
    return active && row ? render(row) : null;
  };
}

export function SignupsChart({ data }: { data: DashboardData["signupsByMonth"] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="signupsFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--series-1)" stopOpacity={0.22} />
            <stop offset="1" stopColor="var(--series-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="month" {...axis} tickFormatter={(m: string) => monthLabel(m)} minTickGap={12} />
        <YAxis {...axis} axisLine={false} allowDecimals={false} width={48} tickFormatter={fmt.compact} />
        <Tooltip
          cursor={{ stroke: "var(--axis)", strokeWidth: 1 }}
          content={tip<DashboardData["signupsByMonth"][number]>((r) => (
            <TooltipBox
              title={monthLabel(r.month, true)}
              rows={[{ label: "Sign-ups", value: fmt.number(r.signups), color: "var(--series-1)" }]}
            />
          ))}
        />
        <Area
          type="monotone"
          dataKey="signups"
          name="Sign-ups"
          stroke="var(--series-1)"
          strokeWidth={2}
          fill="url(#signupsFill)"
          dot={data.length <= 6 ? { r: 3.5, strokeWidth: 2, stroke: "var(--surface)", fill: "var(--series-1)" } : false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)", fill: "var(--series-1)" }}
          animationDuration={600}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RevenueByPlanChart({ data }: { data: DashboardData["revenueByPlan"] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 24, right: 12, bottom: 0, left: -4 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="name" {...axis} />
        <YAxis {...axis} axisLine={false} width={56} tickFormatter={(v: number) => fmt.moneyCompact(v)} />
        <Tooltip
          cursor={{ fill: "var(--hover-wash)" }}
          content={tip<DashboardData["revenueByPlan"][number]>((r) => (
            <TooltipBox
              title={`${r.name} plan`}
              rows={[{ label: "Revenue", value: fmt.money(r.revenueCents), color: "var(--series-1)" }]}
            />
          ))}
        />
        <Bar dataKey="revenueCents" name="Revenue" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={72} animationDuration={600}>
          <LabelList
            dataKey="revenueCents"
            position="top"
            formatter={(v: unknown) => fmt.moneyCompact(Number(v))}
            style={{ fill: "var(--text-secondary)", fontSize: 12, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RegionDonut({ data }: { data: DashboardData["activeByRegion"] }) {
  const total = data.reduce((s, d) => s + d.customers, 0);
  return (
    <div className="donut-wrap">
      <div className="donut">
        <ResponsiveContainer width="100%" height={210}>
          <PieChart>
            <Tooltip
              content={tip<DashboardData["activeByRegion"][number]>((r) => (
                <TooltipBox
                  title={r.region}
                  rows={[
                    { label: "Active", value: fmt.number(r.customers), color: regionColor(r.region) },
                    { label: "Share", value: fmt.percent(r.customers / total) },
                  ]}
                />
              ))}
            />
            <Pie
              data={data}
              dataKey="customers"
              nameKey="region"
              innerRadius="64%"
              outerRadius="98%"
              stroke="var(--surface)"
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
              animationDuration={600}
            >
              {data.map((d) => (
                <Cell key={d.region} fill={regionColor(d.region)} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <div className="donut-total">{fmt.compact(total)}</div>
          <div className="donut-caption">active</div>
        </div>
      </div>
      <ul className="legend-list">
        {data.map((d) => (
          <li key={d.region}>
            <span className="swatch" style={{ background: regionColor(d.region) }} />
            <span className="legend-name">{d.region}</span>
            <span className="legend-value">{fmt.number(d.customers)}</span>
            <span className="legend-pct">{fmt.percent(d.customers / total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
