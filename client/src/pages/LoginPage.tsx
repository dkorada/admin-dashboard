import { ArrowRight, BarChart3, Eye, EyeOff, Lock, ShieldCheck, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";

const DEMO = [
  { label: "Admin", email: "admin@demo.dev", password: "Admin123!", note: "Full access, including user management" },
  { label: "Viewer", email: "viewer@demo.dev", password: "Viewer123!", note: "Read-only dashboard" },
];

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={from} replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login">
      <section className="login-hero" aria-hidden="true">
        <div className="login-hero-inner">
          <div className="login-brand">
            <Logo size={36} />
            <span>Pulse</span>
          </div>
          <h2>Every metric that moves your SaaS, in one place.</h2>
          <p>Track sign-ups, revenue and engagement across plans and regions, with access controls built for your team.</p>
          <ul className="login-features">
            <li>
              <BarChart3 size={18} /> Live growth and revenue analytics
            </li>
            <li>
              <Users size={18} /> Role-based access for admins and viewers
            </li>
            <li>
              <ShieldCheck size={18} /> Secure sessions with HTTP-only cookies
            </li>
          </ul>
        </div>
        <svg className="login-art" viewBox="0 0 400 140" preserveAspectRatio="none">
          <defs>
            <linearGradient id="loginArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 120 L40 108 L80 112 L120 90 L160 96 L200 70 L240 76 L280 48 L320 54 L360 26 L400 18 L400 140 L0 140Z" fill="url(#loginArea)" />
          <path d="M0 120 L40 108 L80 112 L120 90 L160 96 L200 70 L240 76 L280 48 L320 54 L360 26 L400 18" fill="none" stroke="#fff" strokeWidth="2.5" />
        </svg>
      </section>

      <section className="login-panel">
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-mobile-brand">
            <Logo size={32} />
            <span>Pulse</span>
          </div>
          <h1>Welcome back</h1>
          <p className="muted">Sign in to your admin console.</p>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoFocus
            />
          </label>

          <label className="field">
            <span>Password</span>
            <div className="input-with-action">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="input-action"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>

          <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={submitting || !email || !password}>
            {submitting ? "Signing in…" : (
              <>
                Sign in <ArrowRight size={17} />
              </>
            )}
          </button>

          <div className="demo-accounts">
            <div className="demo-title">
              <Lock size={13} /> Demo accounts: click to fill
            </div>
            {DEMO.map((d) => (
              <button
                type="button"
                key={d.email}
                className="demo-account"
                onClick={() => {
                  setEmail(d.email);
                  setPassword(d.password);
                  setError(null);
                }}
              >
                <span className={`role-badge role-${d.label.toLowerCase()}`}>{d.label}</span>
                <span className="demo-email">{d.email}</span>
                <span className="demo-note">{d.note}</span>
              </button>
            ))}
          </div>
        </form>
      </section>
    </div>
  );
}
