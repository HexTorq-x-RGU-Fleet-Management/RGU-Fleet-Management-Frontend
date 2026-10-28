'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Route, ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Field } from './ui';
import { api } from '@/lib/api';
import { useWorkspace, broadcastViewerChange } from './workspace-provider';
import { GoogleAuthButton } from './google-auth-button';
import GradientASCII from './gradient-ascii';

export function AuthScreen() {
  const { ready, user, setupRequired, error, refresh } = useWorkspace(),
    router = useRouter();
  const [signup, setSignup] = useState(false),
    [pending, setPending] = useState(false),
    [busy, setBusy] = useState(false),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState('');

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
    <main className="auth-page auth-ambient-page">
      <div className="auth-ambient" aria-hidden="true">
        <GradientASCII
          colors={['#06080e', '#71307e', '#2096db', '#f6f8ff']}
          shape="horizon"
          cellSize={18}
          density={0.74}
          glyphOpacity={0.8}
          glow={0.5}
          softness={0.55}
          flow={0.6}
          speed={0.9}
          gradientOpacity={0.78}
          grain={0.07}
        />
      </div>
      <section className="auth-story">
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
                  <GoogleAuthButton
                    onCredential={(credential) => void signInWithGoogle(credential)}
                  />
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
