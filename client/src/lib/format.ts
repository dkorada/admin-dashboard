const number = new Intl.NumberFormat("en-US");
const compactNumber = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export const fmt = {
  number: (n: number) => number.format(n),
  compact: (n: number) => compactNumber.format(n),
  money: (cents: number) => currency.format(cents / 100),
  moneyCompact: (cents: number) => compactCurrency.format(cents / 100),
  percent: (n: number) => `${(n * 100).toFixed(1)}%`,
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-03" → "Mar" (or "Mar 2026" with year). */
export function monthLabel(key: string, withYear = false): string {
  const [y, m] = key.split("-").map(Number);
  return withYear ? `${MONTHS[m - 1]} ${y}` : MONTHS[m - 1];
}

/** "2026-03-05" → "Mar 5, 2026" */
export function dayLabel(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export function relativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
