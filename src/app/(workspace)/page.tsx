import { Suspense } from 'react';
import { FleetWorkspace } from '@/components/fleet-workspace';
import { AsciiLoading, AsciiRevealArea } from '@/components/ascii-loading';
export default function Page() {
  return (
    <Suspense fallback={<AsciiLoading label="Loading fleet overview..." cards={4} />}>
      <AsciiRevealArea loading={false} cards={4}>
        <FleetWorkspace />
      </AsciiRevealArea>
    </Suspense>
  );
}
