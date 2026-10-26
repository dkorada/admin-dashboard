export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();

/** Called whenever the API reports the session is gone, so the app can return to the login screen. */
export function onUnauthorized(listener: Listener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "same-origin",
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith("/auth/")) unauthorizedListeners.forEach((l) => l());
    throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`);
  }
  return body as T;
}

export type Role = "ADMIN" | "VIEWER";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface ManagedUser extends User {
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Kpi {
  value: number;
  previous: number | null;
}

export interface DashboardData {
  filters: { from: string; to: string; plan: string };
  kpis: { signups: Kpi; revenueCents: Kpi; activeCustomers: Kpi; arpaCents: Kpi };
  signupsByMonth: { month: string; signups: number }[];
  revenueByMonth: { month: string; revenueCents: number }[];
  revenueByPlan: { plan: string; name: string; revenueCents: number }[];
  activeByRegion: { region: string; customers: number }[];
}

export interface Meta {
  plans: { id: string; name: string; priceCents: number }[];
  regions: string[];
  dataRange: { from: string | null; to: string | null };
}
