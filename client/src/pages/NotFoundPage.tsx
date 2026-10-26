import { Compass } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="denied">
      <div className="denied-icon neutral">
        <Compass size={28} />
      </div>
      <h1>Page not found</h1>
      <p>The page you're looking for doesn't exist or has moved.</p>
      <Link to="/" className="btn btn-primary">
        Go to overview
      </Link>
    </div>
  );
}
