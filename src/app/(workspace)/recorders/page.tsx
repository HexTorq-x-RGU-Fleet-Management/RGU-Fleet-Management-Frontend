import { Suspense } from 'react';
import { RecorderLibrary } from '@/components/dashboard';

export default function Page() {
  return (
    <Suspense fallback={<div className="skeleton h-96" />}>
      <RecorderLibrary />
    </Suspense>
  );
}
