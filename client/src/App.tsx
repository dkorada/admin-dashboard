import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AppShell from "./components/AppShell";
import { FullPageSpinner } from "./components/States";
import AccessDenied from "./pages/AccessDenied";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import UsersPage from "./pages/UsersPage";
import type { Role } from "./lib/api";
import { useAuth } from "./lib/auth";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <>{children}</>;
}

/** Renders an access-denied screen (not a redirect) so viewers understand why the page is unavailable. */
function RequireRole({ role, children }: { role: Role; children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== role) return <AccessDenied />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route
          path="users"
          element={
            <RequireRole role="ADMIN">
              <UsersPage />
            </RequireRole>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
