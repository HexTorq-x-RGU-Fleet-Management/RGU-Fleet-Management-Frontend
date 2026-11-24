import { Suspense } from 'react';
import { FleetWorkspace } from '@/components/fleet-workspace';
import { FleetOverviewSkeleton } from '@/components/ascii-loading';

export default function Page() {
  return (
    <Suspense fallback={<FleetOverviewSkeleton directory />}>
      <FleetWorkspace busesOnly />
    </Suspense>
  );
}
