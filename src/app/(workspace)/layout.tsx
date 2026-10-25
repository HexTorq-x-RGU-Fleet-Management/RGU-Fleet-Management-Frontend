import { AppShell } from '@/components/app-shell';
import { SessionGate } from '@/components/session-gate';
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGate>
      <AppShell>{children}</AppShell>
    </SessionGate>
  );
}
