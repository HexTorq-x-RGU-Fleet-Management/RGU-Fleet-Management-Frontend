import { Suspense } from 'react';
import { CameraHub } from '@/components/camera-hub';
import { AsciiLoading, AsciiRevealArea } from '@/components/ascii-loading';
export default function Page() {
  return (
    <Suspense fallback={<AsciiLoading label="Loading camera workspace..." cards={4} />}>
      <AsciiRevealArea loading={false} cards={4}>
        <CameraHub />
      </AsciiRevealArea>
    </Suspense>
  );
}
