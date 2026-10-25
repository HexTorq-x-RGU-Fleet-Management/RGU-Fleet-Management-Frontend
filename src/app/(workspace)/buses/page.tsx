import { Suspense } from 'react';
import { FleetWorkspace } from '@/components/fleet-workspace';
export default function Page() {
  return (
    <Suspense fallback={<div className="skeleton h-96" />}>
      <FleetWorkspace />
    </Suspense>
  );
}
