import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

export default function AccessDenied() {
  return (
    <div className="denied">
      <div className="denied-icon">
        <ShieldAlert size={28} />
      </div>
      <h1>Access denied</h1>
      <p>
        This page is only available to administrators. Your account has <strong>viewer</strong> access, which includes the
        dashboard but not user management.
      </p>
      <p className="muted">If you need admin access, ask a workspace admin to change your role.</p>
      <Link to="/" className="btn btn-primary">
        <ArrowLeft size={16} /> Back to overview
      </Link>
    </div>
  );
}
