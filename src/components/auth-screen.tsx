'use client';
import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Route,
  ArrowUpRight,
  ArrowLeft,
  ShieldCheck,
  Eye,
  EyeOff,
  Check,
  Mail,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { Button, Field, Reveal } from './ui';
import { api, apiBase } from '@/lib/api';
export function AuthScreen() {
  const [signup, setSignup] = useState(false);
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="auth-grid" aria-hidden="true" />
        <div className="auth-photo-overlay" />
        <Link href="/" className="brand">
          <span className="brand-symbol">
            <Route size={22} />
          </span>
          <span>
            RGU / Fleet<small>TRANSPORT INTELLIGENCE</small>
          </span>
        </Link>
        <div className="auth-story-copy">
          <span className="auth-kicker">
            <span className="tiny-live" />A CLEARER VIEW OF CAMPUS
          </span>
          <h1>
            Every journey.
            <br />
            Every angle.
            <br />
            <em>One workspace.</em>
          </h1>
          <p>Bring your camera views, your team and your everyday operations together.</p>
          <div className="auth-checks">
            <span>
              <ShieldCheck size={16} />
              Workspace-level access
            </span>
            <span>
              <Check size={16} />
              Windows & Linux backends
            </span>
          </div>
        </div>
        <small className="auth-image-credit">RGU / Campus operations workspace</small>
      </section>
      <section className="auth-form-section">
        <Link href="/" className="text-link">
          <ArrowLeft size={15} />
          Back to workspace preview
        </Link>
        <Reveal className="auth-form-card">
          <p className="eyebrow">YOUR CAMPUS, CONNECTED</p>
          <h2>
            {pending
              ? 'You are on the list.'
              : signup
                ? 'Make room for your team.'
                : 'Welcome to a clearer view.'}
          </h2>
          <p>
            {pending
              ? 'Your request is waiting for a platform administrator to review.'
              : signup
                ? 'Request a workspace. Your administrator will approve access.'
                : 'Sign in to your viewer account, separate from Hik-Connect.'}
          </p>
          {pending ? (
            <Button
              className="w-full mt-6"
              onClick={() => {
                setPending(false);
                setSignup(false);
              }}
            >
              Back to sign in
            </Button>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const data = new FormData(form);
                setBusy(true);
                try {
                  if (signup) {
                    await api.signup(
                      String(data.get('name')),
                      String(data.get('email')),
                      String(data.get('password')),
                      String(data.get('workspace')),
                    );
                    setPending(true);
                  } else {
                    await api.login(String(data.get('email')), String(data.get('password')));
                    toast.success(
                      'Backend sign-in completed. The new camera workspace is still in preview integration.',
                    );
                  }
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : 'This request could not be completed.',
                  );
                } finally {
                  const field = form.elements.namedItem('password') as HTMLInputElement | null;
                  if (field) field.value = '';
                  setBusy(false);
                }
              }}
            >
              {signup && (
                <>
                  <Field label="Full name">
                    <input
                      name="name"
                      required
                      autoComplete="name"
                      maxLength={80}
                      placeholder="Your full name"
                    />
                  </Field>
                  <Field label="Workspace name">
                    <input
                      name="workspace"
                      required
                      maxLength={100}
                      placeholder="Campus transport team"
                    />
                  </Field>
                </>
              )}
              <Field label="Email address">
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="you@your-organization.com"
                />
              </Field>
              <Field label="Password">
                <span className="password-input">
                  <input
                    type={show ? 'text' : 'password'}
                    name="password"
                    required
                    minLength={signup ? 12 : 1}
                    autoComplete={signup ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    aria-label={show ? 'Hide password' : 'Show password'}
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </Field>
              {signup && (
                <p className="muted small">
                  Use at least 12 characters. Approval is required before account access.
                </p>
              )}
              <Button variant="primary" type="submit" className="w-full auth-submit" loading={busy}>
                {signup ? 'Request workspace access' : 'Sign in to workspace'}
                <ArrowRight size={16} />
              </Button>
            </form>
          )}
          {!pending && (
            <p className="auth-switch">
              {signup ? 'Already have access?' : 'New to the workspace?'}{' '}
              <button
                onClick={() => {
                  setSignup(!signup);
                  setShow(false);
                }}
              >
                {signup ? 'Sign in' : 'Request access'}
              </button>
            </p>
          )}
          <div className="auth-divider">
            <span>or explore first</span>
          </div>
          <Link href="/" className="btn btn-secondary w-full">
            Open preview workspace
            <ArrowUpRight size={16} />
          </Link>
          <div className="auth-connection-note">
            <span className={`status-dot ${apiBase ? '' : 'offline'}`} />
            {apiBase
              ? 'Backend address configured; authorization requires server access.'
              : 'Backend not configured. Preview requires no password.'}
          </div>
        </Reveal>
        <p className="auth-help">Password help? Contact your platform administrator.</p>
      </section>
    </main>
  );
}
