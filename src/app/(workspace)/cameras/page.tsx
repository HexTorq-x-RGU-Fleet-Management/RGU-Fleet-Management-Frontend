import { Suspense } from 'react';
import { CameraHub } from '@/components/camera-hub';
import { AsciiLoading } from '@/components/ascii-loading';
export default function Page() {
  return (
    <Suspense fallback={<AsciiLoading label="Loading camera workspace..." cards={4} />}>
      <CameraHub />
    </Suspense>
  );
}
