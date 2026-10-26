'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Route, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Field } from './ui';
import { api } from '@/lib/api';
import { useWorkspace, broadcastViewerChange } from './workspace-provider';
import { GoogleAuthButton } from './google-auth-button';

export function AuthScreen() {
  const { ready, user, setupRequired, error, refresh } = useWorkspace(),
    router = useRouter();
  const [signup, setSignup] = useState(false),
    [pending, setPending] = useState(false),
    [busy, setBusy] = useState(false),
    [email, setEmail] = useState('admin@rgu.ac.in'),
    [password, setPassword] = useState('Rathinam@Admin2026!');

  async function signInWithGoogle(credential: string) {
    setBusy(true);
    try {
      const result = await api.googleLogin(credential);
      await refresh();
      broadcastViewerChange();
      router.replace(result.user.role === 'superadmin' ? '/platform' : '/');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="auth-grid" />
        <div className="auth-photo-overlay" />
        <div className="brand">
          <span className="brand-symbol">
            <img src="/rathinam-logo.svg" alt="Rathinam Logo" width={34} height={34} />
          </span>
          <span>
            RGU / Fleet<small>RATHINAM GLOBAL UNIVERSITY</small>
          </span>
        </div>
        <div className="auth-story-copy">
          <span className="auth-kicker">FLEET OPERATIONS</span>
          <h1>
            Every journey.
            <br />
            Every angle.
            <br />
            <em>One workspace.</em>
          </h1>
          <p>Your bus cameras, fleet and team, protected by workspace permissions.</p>
          <div className="auth-checks">
            <span>
              <ShieldCheck size={16} />
              Authenticated workspace access
            </span>
          </div>
        </div>
        <small className="auth-image-credit">HexTorq · RGU Fleet Management</small>
      </section>
      <section className="auth-form-section">
        <div className="auth-form-card">
          <p className="eyebrow">RGU FLEET MANAGEMENT</p>
          <h2>
            {setupRequired
              ? 'Create the platform owner'
              : pending
                ? 'Approval requested'
                : signup
                  ? 'Request a workspace'
                  : 'Sign in to your workspace'}
          </h2>
          {!ready ? (
            <p role="status">Checking account setup…</p>
          ) : pending ? (
            <>
              <p>Your request is waiting for the superadmin’s approval.</p>
              <Button
                onClick={() => {
                  setPending(false);
                  setSignup(false);
                }}
              >
                Back to sign in
              </Button>
            </>
          ) : (
            <>
              <p>
                {setupRequired
                  ? 'One initial platform owner account is allowed. This is separate from Hik-Connect.'
                  : signup
                    ? 'The superadmin must approve your workspace before you can sign in.'
                    : 'Use your verified administrator credentials to access the fleet command deck.'}
              </p>
              {error && (
                <div className="info-box" role="status">
                  <p>{error}</p>
                  <Button onClick={() => void refresh()}>Retry API connection</Button>
                </div>
              )}

              {/* Admin Credentials Quick-Fill Card */}
              {!signup && !setupRequired && (
                <div className="auth-admin-credentials-card">
                  <div className="admin-cred-header">
                    <ShieldCheck size={14} />
                    <strong>Verified Admin Credentials</strong>
                  </div>
                  <div className="admin-cred-body">
                    <div>
                      <span>Email: </span>
                      <code>admin@rgu.ac.in</code>
                    </div>
                    <div>
                      <span>Password: </span>
                      <code>Rathinam@Admin2026!</code>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-quick-fill"
                    onClick={() => {
                      setEmail('admin@rgu.ac.in');
                      setPassword('Rathinam@Admin2026!');
                      toast.success('Admin credentials populated');
                    }}
                  >
                    <KeyRound size={13} />
                    Fill Admin Credentials
                  </button>
                </div>
              )}

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget,
                    d = new FormData(form);
                  setBusy(true);
                  try {
                    if (signup && !setupRequired) {
                      await api.signup(
                        String(d.get('name')),
                        String(d.get('email')),
                        String(d.get('password')),
                        String(d.get('workspace')),
                      );
                      setPending(true);
                    } else {
                      const result = setupRequired
                        ? await api.setup(
                            String(d.get('name')),
                            String(d.get('email')),
                            String(d.get('password')),
                          )
                        : await api.login(String(d.get('email')), String(d.get('password')));
                      await refresh();
                      broadcastViewerChange();
                      router.replace(result.user.role === 'superadmin' ? '/platform' : '/');
                    }
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {(signup || setupRequired) && (
                  <Field label="Full name">
                    <input name="name" autoComplete="name" maxLength={100} required />
                  </Field>
                )}
                {signup && !setupRequired && (
                  <Field label="Workspace name">
                    <input name="workspace" maxLength={100} required />
                  </Field>
                )}
                <Field label="Email address">
                  <input
                    type="email"
                    name="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Password">
                  <input
                    type="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={signup || setupRequired ? 12 : 1}
                    autoComplete={signup || setupRequired ? 'new-password' : 'current-password'}
                    required
                  />
                </Field>
                <Button
                  variant="primary"
                  className="w-full auth-submit"
                  type="submit"
                  loading={busy}
                >
                  {setupRequired
                    ? 'Create platform owner'
                    : signup
                      ? 'Request workspace access'
                      : 'Sign in to workspace'}
                  <ArrowRight size={16} />
                </Button>
              </form>
              {!signup && !setupRequired && (
                <div className="google-auth-divider">
                  <span>or continue with</span>
                  <GoogleAuthButton onCredential={(credential) => void signInWithGoogle(credential)} />
                </div>
              )}
              {!setupRequired && (
                <Button variant="ghost" className="w-full mt-4" onClick={() => setSignup(!signup)}>
                  {signup ? 'Back to sign in' : 'Request a new workspace'}
                </Button>
              )}
              {user && (
                <Button
                  className="w-full mt-4"
                  onClick={() => router.push(user.role === 'superadmin' ? '/platform' : '/')}
                >
                  Continue to your workspace
                </Button>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
