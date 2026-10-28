import { Suspense } from 'react';
import { RecorderLibrary } from '@/components/dashboard';
import { AsciiLoading, AsciiRevealArea } from '@/components/ascii-loading';

export default function Page() {
  return (
    <Suspense fallback={<AsciiLoading label="Loading recorder library..." cards={3} />}>
      <AsciiRevealArea loading={false} cards={3}>
        <RecorderLibrary />
      </AsciiRevealArea>
    </Suspense>
  );
}
