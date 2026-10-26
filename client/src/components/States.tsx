import { AlertTriangle, Inbox, RotateCw } from "lucide-react";
import type { ReactNode } from "react";

export function FullPageSpinner() {
  return (
    <div className="full-page-center" role="status" aria-live="polite">
      <div className="spinner" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function Skeleton({ height = 16, width = "100%", radius = 8 }: { height?: number; width?: number | string; radius?: number }) {
  return <div className="skeleton" style={{ height, width, borderRadius: radius }} aria-hidden="true" />;
}

export function EmptyState({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon ?? <Inbox size={20} />}</div>
      <p className="empty-title">{title}</p>
      {children && <p className="empty-text">{children}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="empty-state" role="alert">
      <div className="empty-icon danger">
        <AlertTriangle size={20} />
      </div>
      <p className="empty-title">Couldn't load this data</p>
      <p className="empty-text">{message}</p>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" onClick={onRetry}>
          <RotateCw size={14} /> Try again
        </button>
      )}
    </div>
  );
}
