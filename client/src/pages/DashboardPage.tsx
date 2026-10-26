import { Activity, DollarSign, Receipt, Sparkles, UserPlus } from "lucide-react";
import ChartCard from "../components/ChartCard";
import { RegionDonut, RevenueByPlanChart, SignupsChart, regionColor } from "../components/charts";
import FilterBar from "../components/FilterBar";
import KpiCard from "../components/KpiCard";
import { ErrorState, Skeleton } from "../components/States";
import { api, type DashboardData, type Meta } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useFilters } from "../lib/filters";
import { dayLabel, fmt, monthLabel } from "../lib/format";
import { useAsync } from "../lib/useAsync";

export default function DashboardPage() {
  const { user } = useAuth();
  const meta = useAsync(() => api<Meta>("/metrics/meta"), []);
  const { filters, update, reset, isDefault } = useFilters(meta.data?.dataRange.to ?? null);

  const query = filters ? new URLSearchParams({ from: filters.from, to: filters.to, plan: filters.plan }).toString() : null;
  const dash = useAsync(
    () => (query ? api<DashboardData>(`/metrics/dashboard?${query}`) : new Promise<never>(() => {})),
    [query],
  );
  const d = dash.data;
  const loading = dash.loading || meta.loading;
  const firstLoad = !d;

  const planName =
    filters?.plan === "all" ? "All plans" : meta.data?.plans.find((p) => p.id === filters?.plan)?.name ?? filters?.plan;

  if (meta.error) {
    return (
      <div className="card">
        <ErrorState message={meta.error.message} onRetry={meta.reload} />
      </div>
    );
  }

  const totalSignups = d?.kpis.signups.value ?? 0;
  const totalRevenue = d?.kpis.revenueCents.value ?? 0;
  const bestMonth = d?.signupsByMonth.reduce((a, b) => (b.signups > a.signups ? b : a), d.signupsByMonth[0]);
  const topPlan = d?.revenueByPlan.reduce((a, b) => (b.revenueCents > a.revenueCents ? b : a), d.revenueByPlan[0]);
  const topRegion = d?.activeByRegion[0];
  const activeTotal = d?.kpis.activeCustomers.value ?? 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Hi {user?.name.split(" ")[0]} 👋</p>
          <h1 className="page-title">Overview</h1>
          <div className="page-subtitle">
            {filters ? (
              <>
                {dayLabel(filters.from)} – {dayLabel(filters.to)} · {planName}
              </>
            ) : (
              <Skeleton width={260} height={14} />
            )}
          </div>
        </div>
      </div>

      {meta.data && filters ? (
        <FilterBar meta={meta.data} filters={filters} onChange={update} onReset={reset} isDefault={isDefault} loading={loading && !firstLoad} />
      ) : (
        <div className="filter-bar">
          <Skeleton width={320} height={34} />
        </div>
      )}

      {dash.error && (
        <div className="card">
          <ErrorState message={dash.error.message} onRetry={dash.reload} />
        </div>
      )}

      <div className="kpi-grid">
        <KpiCard
          label="New sign-ups"
          icon={<UserPlus size={16} />}
          kpi={d?.kpis.signups}
          format={fmt.number}
          spark={d?.signupsByMonth.map((m) => m.signups)}
          hint="vs previous period"
          hintNoCompare="in selected period"
          loading={firstLoad}
        />
        <KpiCard
          label="Revenue"
          icon={<DollarSign size={16} />}
          kpi={d?.kpis.revenueCents}
          format={fmt.moneyCompact}
          spark={d?.revenueByMonth.map((m) => m.revenueCents)}
          hint="vs previous period"
          hintNoCompare="in selected period"
          loading={firstLoad}
        />
        <KpiCard
          label="Active customers"
          icon={<Activity size={16} />}
          kpi={d?.kpis.activeCustomers}
          format={fmt.number}
          hint="seen in last 30 days"
          loading={firstLoad}
        />
        <KpiCard
          label="Avg. revenue / account"
          icon={<Receipt size={16} />}
          kpi={d?.kpis.arpaCents}
          format={fmt.money}
          hint="per month"
          loading={firstLoad}
        />
      </div>

      <div className="chart-grid">
        <ChartCard
          className="span-2"
          title="Sign-ups per month"
          subtitle="New customer accounts created"
          headline={<>{fmt.number(totalSignups)} <span>total</span></>}
          loading={loading}
          empty={d ? totalSignups === 0 : undefined}
          chart={d && <SignupsChart data={d.signupsByMonth} />}
          table={
            d && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th className="num">Sign-ups</th>
                  </tr>
                </thead>
                <tbody>
                  {d.signupsByMonth.map((r) => (
                    <tr key={r.month}>
                      <td>{monthLabel(r.month, true)}</td>
                      <td className="num">{fmt.number(r.signups)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        />

        <ChartCard
          title="Active users by region"
          subtitle="Customers active at period end"
          loading={loading}
          empty={d ? activeTotal === 0 : undefined}
          chart={d && <RegionDonut data={d.activeByRegion} />}
          table={
            d && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Region</th>
                    <th className="num">Active</th>
                    <th className="num">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {d.activeByRegion.map((r) => (
                    <tr key={r.region}>
                      <td>
                        <span className="swatch" style={{ background: regionColor(r.region) }} /> {r.region}
                      </td>
                      <td className="num">{fmt.number(r.customers)}</td>
                      <td className="num">{fmt.percent(r.customers / activeTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        />

        <ChartCard
          className="span-2"
          title="Revenue by plan"
          subtitle="Paid invoices in the selected period"
          headline={<>{fmt.moneyCompact(totalRevenue)} <span>total</span></>}
          loading={loading}
          empty={d ? totalRevenue === 0 : undefined}
          chart={d && <RevenueByPlanChart data={d.revenueByPlan} />}
          table={
            d && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th className="num">Revenue</th>
                    <th className="num">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {d.revenueByPlan.map((r) => (
                    <tr key={r.plan}>
                      <td>{r.name}</td>
                      <td className="num">{fmt.money(r.revenueCents)}</td>
                      <td className="num">{totalRevenue ? fmt.percent(r.revenueCents / totalRevenue) : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        />

        <section className="card highlights" aria-label="Highlights">
          <header className="chart-head">
            <div>
              <h2 className="chart-title">
                <Sparkles size={16} className="title-icon" /> Highlights
              </h2>
              <p className="chart-subtitle">What stands out in this period</p>
            </div>
          </header>
          {firstLoad ? (
            <div className="highlight-list">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height={48} radius={10} />
              ))}
            </div>
          ) : (
            <ul className="highlight-list">
              <li>
                <span className="hl-label">Best month for sign-ups</span>
                <span className="hl-value">
                  {bestMonth && bestMonth.signups > 0 ? `${monthLabel(bestMonth.month, true)} · ${fmt.number(bestMonth.signups)}` : "–"}
                </span>
              </li>
              <li>
                <span className="hl-label">Top plan by revenue</span>
                <span className="hl-value">
                  {topPlan && topPlan.revenueCents > 0
                    ? `${topPlan.name} · ${fmt.percent(topPlan.revenueCents / totalRevenue)}`
                    : "–"}
                </span>
              </li>
              <li>
                <span className="hl-label">Largest region</span>
                <span className="hl-value">
                  {topRegion ? `${topRegion.region} · ${fmt.percent(topRegion.customers / activeTotal)}` : "–"}
                </span>
              </li>
              <li>
                <span className="hl-label">Average monthly revenue</span>
                <span className="hl-value">{d ? fmt.money(totalRevenue / Math.max(1, d.revenueByMonth.length)) : "–"}</span>
              </li>
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
