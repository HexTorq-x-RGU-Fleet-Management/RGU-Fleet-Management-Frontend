'use client';
import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthScreen } from './auth-screen';
import { useWorkspace } from './workspace-provider';

export function SessionGate({ children }: { children: ReactNode }) {
  const { ready, user } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (ready && !user && pathname !== '/login') router.replace('/login');
  }, [pathname, ready, router, user]);
  if (!ready) return <div className="fleet-no-data" role="status">Checking account session…</div>;
  if (!user) return <AuthScreen />;
  return <>{children}</>;
}

