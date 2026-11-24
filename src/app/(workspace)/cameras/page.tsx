import { Suspense } from 'react';
import { CameraHub } from '@/components/camera-hub';
import { LoadingBlock } from '@/components/ascii-loading';

export default function Page() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading camera workspace..." rows={4} />}>
      <CameraHub />
    </Suspense>
  );
}
