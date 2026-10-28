import { Platform } from '@/components/platform';
import { AsciiRevealArea } from '@/components/ascii-loading';

export default function Page() {
  return (
    <AsciiRevealArea loading={false} cards={4} compact>
      <Platform />
    </AsciiRevealArea>
  );
}
