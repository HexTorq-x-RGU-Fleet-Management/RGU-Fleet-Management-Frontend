import { Settings } from '@/components/settings';
import { AsciiRevealArea } from '@/components/ascii-loading';

export default function Page() {
  return (
    <AsciiRevealArea loading={false} cards={3} compact>
      <Settings />
    </AsciiRevealArea>
  );
}
