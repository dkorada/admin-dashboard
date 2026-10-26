import { Search, ShieldCheck, UserCheck, UserX, Users as UsersIcon } from "lucide-react";
import { useMemo, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import { EmptyState, ErrorState, Skeleton } from "../components/States";
import { useToast } from "../components/Toast";
import { api, ApiError, type ManagedUser, type Role } from "../lib/api";
import { useAuth } from "../lib/auth";
import { initials, relativeTime } from "../lib/format";
import { useAsync } from "../lib/useAsync";

type Tab = "all" | "ADMIN" | "VIEWER" | "inactive";

export default function UsersPage() {
  const { user: me } = useAuth();
  const toast = useToast();
  const { data, setData, error, loading, reload } = useAsync(() => api<{ users: ManagedUser[] }>("/users"), []);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [pending, setPending] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ManagedUser | null>(null);

  const users = data?.users ?? [];
  const counts = {
    all: users.length,
    ADMIN: users.filter((u) => u.role === "ADMIN" && u.active).length,
    VIEWER: users.filter((u) => u.role === "VIEWER" && u.active).length,
    inactive: users.filter((u) => !u.active).length,
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (tab === "inactive" && u.active) return false;
      if ((tab === "ADMIN" || tab === "VIEWER") && (u.role !== tab || !u.active)) return false;
      return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, query, tab]);

  async function patch(target: ManagedUser, changes: { role?: Role; active?: boolean }, success: string) {
    setPending(target.id);
    try {
      const { user } = await api<{ user: ManagedUser }>(`/users/${target.id}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      });
      setData((d) => d && { users: d.users.map((u) => (u.id === user.id ? user : u)) });
      toast(success);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Update failed", "error");
    } finally {
      setPending(null);
      setConfirm(null);
    }
  }

  const tabs: { value: Tab; label: string }[] = [
    { value: "all", label: "All" },
    { value: "ADMIN", label: "Admins" },
    { value: "VIEWER", label: "Viewers" },
    { value: "inactive", label: "Deactivated" },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="page-title">User management</h1>
          <p className="page-subtitle">Control who can access the dashboard and what they can do.</p>
        </div>
      </div>

      <div className="stat-row">
        <div className="card stat">
          <UsersIcon size={18} />
          <div>
            <div className="stat-value">{loading && !data ? "–" : counts.all}</div>
            <div className="stat-label">Total users</div>
          </div>
        </div>
        <div className="card stat">
          <ShieldCheck size={18} />
          <div>
            <div className="stat-value">{loading && !data ? "–" : counts.ADMIN}</div>
            <div className="stat-label">Active admins</div>
          </div>
        </div>
        <div className="card stat">
          <UserCheck size={18} />
          <div>
            <div className="stat-value">{loading && !data ? "–" : counts.VIEWER}</div>
            <div className="stat-label">Active viewers</div>
          </div>
        </div>
        <div className="card stat">
          <UserX size={18} />
          <div>
            <div className="stat-value">{loading && !data ? "–" : counts.inactive}</div>
            <div className="stat-label">Deactivated</div>
          </div>
        </div>
      </div>

      <section className="card table-card">
        <div className="table-toolbar">
          <div className="segmented" role="tablist" aria-label="Filter users">
            {tabs.map((t) => (
              <button key={t.value} role="tab" aria-selected={tab === t.value} className={tab === t.value ? "active" : ""} onClick={() => setTab(t.value)}>
                {t.label}
                <span className="count">{counts[t.value]}</span>
              </button>
            ))}
          </div>
          <div className="search">
            <Search size={16} />
            <input
              className="input input-sm"
              placeholder="Search name or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search users"
            />
          </div>
        </div>

        {error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : loading && !data ? (
          <div className="table-skeleton">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height={44} radius={10} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState title="No users match">Try a different search or filter.</EmptyState>
        ) : (
          <div className="table-scroll">
            <table className="data-table users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last sign-in</th>
                  <th className="num">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((u) => {
                  const isMe = u.id === me?.id;
                  const busy = pending === u.id;
                  return (
                    <tr key={u.id} className={u.active ? "" : "row-inactive"}>
                      <td>
                        <div className="user-cell">
                          <div className="avatar avatar-sm">{initials(u.name)}</div>
                          <div>
                            <div className="user-name">
                              {u.name} {isMe && <span className="you-tag">You</span>}
                            </div>
                            <div className="user-email">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <select
                          className={`input input-sm select role-select role-${u.role.toLowerCase()}`}
                          value={u.role}
                          disabled={isMe || busy || !u.active}
                          aria-label={`Role for ${u.name}`}
                          title={isMe ? "You can't change your own role" : undefined}
                          onChange={(e) => {
                            const role = e.target.value as Role;
                            patch(u, { role }, `${u.name} is now ${role === "ADMIN" ? "an admin" : "a viewer"}`);
                          }}
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="VIEWER">Viewer</option>
                        </select>
                      </td>
                      <td>
                        <span className={`status ${u.active ? "status-active" : "status-inactive"}`}>
                          <span className="dot" /> {u.active ? "Active" : "Deactivated"}
                        </span>
                      </td>
                      <td className="muted">{relativeTime(u.lastLoginAt)}</td>
                      <td className="num">
                        {u.active ? (
                          <button className="btn btn-ghost btn-sm btn-danger-text" disabled={isMe || busy} onClick={() => setConfirm(u)}>
                            Deactivate
                          </button>
                        ) : (
                          <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => patch(u, { active: true }, `${u.name} was reactivated`)}>
                            Reactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!confirm}
        title={`Deactivate ${confirm?.name ?? ""}?`}
        confirmLabel="Deactivate"
        tone="danger"
        busy={!!confirm && pending === confirm.id}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && patch(confirm, { active: false }, `${confirm.name} was deactivated`)}
      >
        They'll be signed out immediately and won't be able to sign in until an admin reactivates them.
      </ConfirmDialog>
    </div>
  );
}
