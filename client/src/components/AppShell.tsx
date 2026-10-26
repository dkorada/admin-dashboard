import { LayoutDashboard, LogOut, Lock, Menu, Monitor, Moon, Sun, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { initials } from "../lib/format";
import { useTheme, type ThemeChoice } from "../lib/theme";
import Logo from "./Logo";

const THEMES: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => setMenuOpen(false), [location.pathname]);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className={`shell ${menuOpen ? "menu-open" : ""}`}>
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-brand">
          <Logo />
          <div>
            <div className="brand-name">Pulse</div>
            <div className="brand-sub">Admin console</div>
          </div>
          <button className="icon-btn sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="nav">
          <div className="nav-label">Workspace</div>
          <NavLink to="/" end className="nav-link">
            <LayoutDashboard size={18} /> Overview
          </NavLink>
          <NavLink to="/users" className="nav-link">
            <Users size={18} /> User management
            {!isAdmin && <Lock size={14} className="nav-lock" aria-label="Admins only" />}
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="theme-switch" role="radiogroup" aria-label="Color theme">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                role="radio"
                aria-checked={theme === value}
                className={theme === value ? "active" : ""}
                onClick={() => setTheme(value)}
                title={label}
              >
                <Icon size={15} />
                <span className="sr-only">{label}</span>
              </button>
            ))}
          </div>
          <div className="user-card">
            <div className="avatar">{initials(user?.name ?? "")}</div>
            <div className="user-meta">
              <div className="user-name">{user?.name}</div>
              <div className="user-email">{user?.email}</div>
            </div>
            <button className="icon-btn" onClick={handleLogout} aria-label="Sign out" title="Sign out">
              <LogOut size={17} />
            </button>
          </div>
          <span className={`role-badge role-${user?.role.toLowerCase()}`}>{isAdmin ? "Admin" : "Viewer · read-only"}</span>
        </div>
      </aside>
      <div className="scrim" onClick={() => setMenuOpen(false)} />

      <div className="main">
        <header className="mobile-bar">
          <button className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <Logo size={26} />
          <span className="brand-name">Pulse</span>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
