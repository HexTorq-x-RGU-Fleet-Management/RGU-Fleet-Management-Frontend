import { Suspense } from 'react';
import { CameraHub } from '@/components/camera-hub';
export default function Page() {
  return (
    <Suspense fallback={<div className="skeleton h-96" />}>
      <CameraHub />
    </Suspense>
  );
}
