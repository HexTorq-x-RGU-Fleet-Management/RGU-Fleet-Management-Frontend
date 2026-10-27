'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthScreen } from './auth-screen';
import { useWorkspace } from './workspace-provider';
import { Button, Field } from './ui';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { AsciiLoading } from './ascii-loading';

export function SessionGate({ children }: { children: ReactNode }) {
  const { user, ready, error, refresh, signOut } = useWorkspace();
  const router = useRouter();
  const path = usePathname();
  const [busy, setBusy] = useState(false), [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (ready && !user && path !== '/login') router.replace('/login');
    else if (
      user?.role === 'superadmin' &&
      ['/', '/buses', '/cameras', '/recordings'].includes(path)
    )
      router.replace('/platform');
  }, [path, ready, router, user]);

  if (!ready) return <AsciiLoading label="Checking account session..." cards={2} compact />;

  if (!user) return <AuthScreen />;

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
            const current = String(d.get('current') || ''),
              next = String(d.get('next') || ''),
              confirmation = String(d.get('confirmation') || '');
            if (next.length < 12) {
              setPasswordError('Your new password must contain at least 12 characters.');
              return;
            }
            if (next !== confirmation) {
              setPasswordError('The new password and confirmation do not match.');
              return;
            }
            if (current === next) {
              setPasswordError('Choose a new password different from the temporary password.');
              return;
            }
            setPasswordError('');
            setBusy(true);
            try {
              await api.changePassword(current, next);
              await refresh();
              toast.success('Password changed.');
              form.reset();
            } catch (e) {
              const message = (e as Error).message;
              setPasswordError(message);
              toast.error(message);
            } finally {
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
          <Field label="Confirm new password">
            <input
              name="confirmation"
              type="password"
              autoComplete="new-password"
              minLength={12}
              required
            />
          </Field>
          {passwordError && (
            <p className="form-error" role="alert">
              {passwordError}
            </p>
          )}
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

  return <>{children}</>;
}
