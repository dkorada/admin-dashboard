import { BarChart3, Table2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { EmptyState, ErrorState, Skeleton } from "./States";

interface Props {
  title: string;
  subtitle?: string;
  headline?: ReactNode;
  loading: boolean;
  error?: Error | null;
  onRetry?: () => void;
  empty?: boolean;
  className?: string;
  chart: ReactNode;
  table: ReactNode;
}

/** Card wrapper for a chart with loading/empty/error states and a chart ↔ table toggle. */
export default function ChartCard({ title, subtitle, headline, loading, error, onRetry, empty, className = "", chart, table }: Props) {
  const [view, setView] = useState<"chart" | "table">("chart");

  let body: ReactNode;
  if (error) body = <ErrorState message={error.message} onRetry={onRetry} />;
  else if (loading && empty !== false) body = <div className="chart-skeleton"><Skeleton height={220} radius={12} /></div>;
  else if (empty) body = <EmptyState title="No data for these filters">Try a wider date range or a different plan.</EmptyState>;
  else body = view === "chart" ? chart : <div className="table-scroll">{table}</div>;

  return (
    <section className={`card chart-card ${className} ${loading ? "is-loading" : ""}`} aria-label={title}>
      <header className="chart-head">
        <div>
          <h2 className="chart-title">{title}</h2>
          {subtitle && <p className="chart-subtitle">{subtitle}</p>}
        </div>
        <div className="chart-head-right">
          {headline && !loading && !error && !empty && <div className="chart-headline">{headline}</div>}
          <div className="view-toggle" role="radiogroup" aria-label={`${title} view`}>
            <button role="radio" aria-checked={view === "chart"} className={view === "chart" ? "active" : ""} onClick={() => setView("chart")} title="Chart view">
              <BarChart3 size={14} />
              <span className="sr-only">Chart</span>
            </button>
            <button role="radio" aria-checked={view === "table"} className={view === "table" ? "active" : ""} onClick={() => setView("table")} title="Table view">
              <Table2 size={14} />
              <span className="sr-only">Table</span>
            </button>
          </div>
        </div>
      </header>
      <div className="chart-body">{body}</div>
    </section>
  );
}
