'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button, Field } from './ui';
import { useWorkspace } from './workspace-provider';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function SessionGate({ children }: { children: ReactNode }) {
  const { user, ready, error, refresh, signOut } = useWorkspace(),
    router = useRouter(),
    path = usePathname();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && !user) router.replace('/login');
    else if (
      user?.role === 'superadmin' &&
      ['/', '/buses', '/cameras', '/recordings'].includes(path)
    )
      router.replace('/platform');
  }, [ready, user, path, router]);

  if (!ready)
    return (
      <div className="fleet-no-data" role="status">
        Checking your viewer session…
      </div>
    );

  if (!user)
    return (
      <div className="fleet-no-data">
        <h2>Sign in required</h2>
        {error && <p>{error}</p>}
        <Button onClick={() => router.replace('/login')}>Sign in</Button>
      </div>
    );

  if (user.mustChangePassword)
    return (
      <main className="fleet-no-data">
        <h1>Set your own password</h1>
        <p>
          Your administrator issued a temporary password. Change it before entering the workspace.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget,
              d = new FormData(form);
            setBusy(true);
            try {
              await api.changePassword(String(d.get('current')), String(d.get('next')));
              await refresh();
              toast.success('Password changed.');
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              form.reset();
              setBusy(false);
            }
          }}
        >
          <Field label="Current password">
            <input name="current" type="password" autoComplete="current-password" required />
          </Field>
          <Field label="New password">
            <input
              name="next"
              type="password"
              autoComplete="new-password"
              minLength={12}
              required
            />
          </Field>
          <Button type="submit" loading={busy}>
            Save new password
          </Button>
        </form>
        <Button onClick={() => void signOut()}>Sign out</Button>
      </main>
    );

  if (error)
    return (
      <main className="fleet-no-data">
        <h2>Workspace connection needs attention</h2>
        <p>{error}</p>
        <Button onClick={() => void refresh()}>Retry workspace</Button>
        <Button onClick={() => void signOut()}>Sign out</Button>
      </main>
    );

  return children;
}
