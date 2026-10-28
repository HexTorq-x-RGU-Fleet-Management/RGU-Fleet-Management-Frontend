import { ActivityLog } from '@/components/activity';
import { AsciiRevealArea } from '@/components/ascii-loading';

export default function Page() {
  return (
    <AsciiRevealArea loading={false} cards={3}>
      <ActivityLog />
    </AsciiRevealArea>
  );
}
