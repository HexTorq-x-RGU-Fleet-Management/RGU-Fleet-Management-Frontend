import { Recordings } from '@/components/recordings';
import { AsciiRevealArea } from '@/components/ascii-loading';

export default function Page() {
  return (
    <AsciiRevealArea loading={false} cards={3}>
      <Recordings />
    </AsciiRevealArea>
  );
}
