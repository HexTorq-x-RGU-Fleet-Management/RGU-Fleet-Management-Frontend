'use client';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-screen">
      <TriangleAlert size={36} />
      <h1>Something interrupted this view.</h1>
      <p>Your saved preview preferences remain in this browser.</p>
      <Button onClick={reset}>Try again</Button>
      <a href="/">Return to overview</a>
    </main>
  );
}
