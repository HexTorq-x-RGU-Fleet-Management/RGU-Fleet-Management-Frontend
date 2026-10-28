'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BusFront, Cctv, Eye, EyeOff, Fuel, Route, ShieldCheck } from 'lucide-react';
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
    [password, setPassword] = useState(''),
    [showPassword, setShowPassword] = useState(false);

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
          colors={['#ed22c6', '#f6f8ff', '#a5d8ff', '#38bdf8']}
          shape="horizon"
          characters=" =+xX0S8#@"
          cellSize={18}
          density={0.8}
          glow={0.25}
          flicker={0.14}
          scale={1.15}
          flow={0}
        />
      </div>
      <section className="auth-story">
        <div className="auth-story-top">
          <div className="brand">
            <span className="brand-symbol">
              <img src="/rathinam-logo.svg" alt="Rathinam Logo" width={34} height={34} />
            </span>
            <span>
              RGU / Fleet<small>RATHINAM GROUP OF INSTITUTIONS</small>
            </span>
          </div>
          <span className="auth-powered">Powered by HexTorq Technologies</span>
        </div>
        <div className="auth-story-copy">
          <div className="auth-heading-lockup">
            <span className="auth-heading-rule" aria-hidden="true" />
            <div>
              <span className="auth-kicker">Fleet operations platform</span>
              <h1>
                Your campus fleet.
                <br />
                <em>Connected.</em>
              </h1>
            </div>
          </div>
          <p>
            A unified operations workspace for Rathinam&apos;s transport fleet, vehicle cameras, GPS
            visibility, and fuel observations.
          </p>
          <ul className="auth-capabilities">
            <li>
              <span className="auth-capability-icon fleet">
                <BusFront size={22} />
              </span>
              <span>
                <strong>Fleet &amp; Bus Management</strong>
                <small>Monitor and manage your institution&apos;s fleet</small>
              </span>
            </li>
            <li>
              <span className="auth-capability-icon camera">
                <Cctv size={22} />
              </span>
              <span>
                <strong>CCTV &amp; Recorder Monitoring</strong>
                <small>Access live and recorded camera feeds</small>
              </span>
            </li>
            <li>
              <span className="auth-capability-icon route">
                <Route size={22} />
              </span>
              <span>
                <strong>GPS Tracking &amp; Route Visibility</strong>
                <small>Track movement and stored observations</small>
              </span>
            </li>
            <li>
              <span className="auth-capability-icon fuel">
                <Fuel size={22} />
              </span>
              <span>
                <strong>Fuel Analytics &amp; Observations</strong>
                <small>View fuel usage and stored data</small>
              </span>
            </li>
          </ul>
          <div className="auth-capability-rail" aria-label="Fleet workspace capabilities">
            <span>Fleet-ready</span>
            <span>Camera-aware</span>
            <span>Route-visible</span>
            <span>Audit-ready</span>
          </div>
        </div>
        <div className="auth-image-credit">
          <span>
            <ShieldCheck size={18} />
            <small>
              Secure &amp; authorized access
              <br />
              For authorized institution staff only
            </small>
          </span>
          <small>
            RGU Fleet Management
            <br />
            Engineered by HexTorq Technologies
          </small>
        </div>
      </section>
      <section className="auth-form-section">
        <div className="auth-form-card">
          <p className="eyebrow">RGU FLEET MANAGEMENT</p>
          <h2 className="auth-card-title">
            {setupRequired ? (
              'Create the platform owner'
            ) : pending ? (
              'Approval requested'
            ) : signup ? (
              'Request a workspace'
            ) : (
              <>
                <span>Welcome</span> back
              </>
            )}
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
                    : 'Sign in to your authorized fleet workspace.'}
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
                  <div className="password-input">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={signup || setupRequired ? 12 : 1}
                      autoComplete={signup || setupRequired ? 'new-password' : 'current-password'}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
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
