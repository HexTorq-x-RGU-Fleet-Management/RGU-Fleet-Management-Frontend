import { Health } from '@/components/platform';
import { AsciiRevealArea } from '@/components/ascii-loading';

export default function Page() {
  return (
    <AsciiRevealArea loading={false} cards={3} compact>
      <Health />
    </AsciiRevealArea>
  );
}
