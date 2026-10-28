import { Team } from '@/components/team';
import { AsciiRevealArea } from '@/components/ascii-loading';

export default function Page() {
  return (
    <AsciiRevealArea loading={false} cards={3}>
      <Team />
    </AsciiRevealArea>
  );
}
