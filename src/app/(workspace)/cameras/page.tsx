import { Suspense } from 'react';
import { CameraWorkspace } from '@/components/camera-workspace';
export default function Page() {
  return (
    <Suspense fallback={<div className="skeleton h-96" />}>
      <CameraWorkspace />
    </Suspense>
  );
}
