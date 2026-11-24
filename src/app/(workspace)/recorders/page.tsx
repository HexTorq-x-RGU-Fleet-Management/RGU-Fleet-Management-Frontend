import { Suspense } from 'react';
import { RecorderLibrary } from '@/components/dashboard';
import { LoadingBlock } from '@/components/ascii-loading';

export default function Page() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading recorder library..." rows={3} />}>
      <RecorderLibrary />
    </Suspense>
  );
}
