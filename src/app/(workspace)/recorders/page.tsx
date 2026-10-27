import { Suspense } from 'react';
import { RecorderLibrary } from '@/components/dashboard';
import { AsciiLoading } from '@/components/ascii-loading';

export default function Page() {
  return (
    <Suspense fallback={<AsciiLoading label="Loading recorder library..." cards={3} />}>
      <RecorderLibrary />
    </Suspense>
  );
}
