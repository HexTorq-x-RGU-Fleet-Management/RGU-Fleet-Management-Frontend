import Link from 'next/link';
import { MapPinOff } from 'lucide-react';
export default function NotFound() {
  return (
    <main className="error-screen">
      <MapPinOff size={40} />
      <p className="eyebrow">404 / OFF ROUTE</p>
      <h1>This view is off the map.</h1>
      <p>Head back to your workspace to find your cameras.</p>
      <Link className="btn btn-primary" href="/">
        Back to overview
      </Link>
    </main>
  );
}
