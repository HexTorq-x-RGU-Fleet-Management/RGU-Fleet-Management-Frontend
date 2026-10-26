'use client';
import { useState, useEffect } from 'react';
import {
  Link2,
  Settings as SettingsIcon,
  HardDrive,
  RefreshCw,
  LogOut,
  SlidersHorizontal,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from './workspace-provider';
import { PageHeading, Button, Modal, Field, Badge, Confirm } from './ui';
import { api, request, fleetApi } from '@/lib/api';
import { GoogleAuthButton } from './google-auth-button';
import { formatBytes } from '@/lib/model';
export function Settings() {
  const { state, user, provider, patch, refresh, refreshDevices, signOut } = useWorkspace();
  const [tab, setTab] = useState<string>(user?.role === 'superadmin' ? 'viewing' : 'account'),
    [connection, setConnection] = useState(false),
    [playbackImport, setPlaybackImport] = useState(false),
    [busy, setBusy] = useState(false),
    [disconnect, setDisconnect] = useState(false),
    [googleLinked, setGoogleLinked] = useState(false),
    [storage, setStorage] = useState<any>(null);
  useEffect(() => {
    if (tab === 'storage' && user?.role !== 'superadmin')
      void request('/api/recordings/storage')
        .then((d) => setStorage(d.storage))
        .catch((e) => toast.error(e.message));
  }, [tab, user?.id]);
  useEffect(() => {
    if (tab === 'account' && user?.role === 'admin')
      void api.googleStatus().then((result) => setGoogleLinked(result.linked)).catch(() => undefined);
  }, [tab, user?.id]);
  async function action(work: () => Promise<unknown>) {
    setBusy(true);
    try {
      await work();
      await refresh();
      toast.success('Connection updated.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <PageHeading
        eyebrow="WORKSPACE SETTINGS"
        title="Your workspace, your way."
        description="Manage provider access and your saved viewing preferences."
      />
      <div className="settings-layout">
        <nav className="settings-tabs" aria-label="Settings sections">
          {[
            ['account', 'Hik-Connect account', 'Provider access', Link2],
            ['viewing', 'Viewing preferences', 'Appearance and playback', SlidersHorizontal],
            ['storage', 'Recording storage', 'Retention and capacity', HardDrive],
            ['security', 'Viewer password', 'Access protection', ShieldCheck],
          ]
            .filter(([id]) => user?.role !== 'superadmin' || ['viewing', 'security'].includes(String(id)))
            .map(([id, label, description, Icon]) => (
              <button
                key={String(id)}
                className={tab === id ? 'active' : ''}
                aria-current={tab === id ? 'page' : undefined}
                onClick={() => setTab(String(id))}
              >
                <Icon size={17} aria-hidden="true" />
                <span className="settings-tab-copy">
                  <strong>{String(label)}</strong>
                  <small>{String(description)}</small>
                </span>
                <ChevronRight size={15} className="settings-tab-arrow" aria-hidden="true" />
              </button>
            ))}
        </nav>
        <div>
          {tab === 'account' && user?.role !== 'superadmin' && (
            <section className="panel settings-panel">
              <h2>Hik-Connect account</h2>
              <Badge tone={provider?.connected ? 'green' : 'amber'}>
                {provider?.authorizationState || 'Disconnected'}
              </Badge>
              <p>
                {provider?.user?.email ||
                  provider?.user?.username ||
                  (provider?.connected
                    ? 'Workspace camera connection active'
                    : 'No provider account connected')}
              </p>
              {googleLinked && <Badge tone="green">Google sign-in linked</Badge>}
              <p className="muted">
                {provider?.playbackReady
                  ? 'Playback authorization saved.'
                  : provider?.connected
                    ? 'Device access is connected. Playback authorization is still required.'
                    : 'Sign in to load your owned and shared recorders.'}
              </p>
              {user?.role === 'admin' ? (
                <div className="control-actions mt-4">
                  <Button variant="primary" onClick={() => setConnection(true)}>
                    <Link2 size={15} />
                    Sign in to Hik-Connect
                  </Button>
                  <Button
                    loading={busy}
                    onClick={() =>
                      provider?.playbackRecovery === 'external-authorization'
                        ? setPlaybackImport(true)
                        : void action(() => request('/api/connect/desktop', {}))
                    }
                  >
                    {provider?.playbackRecovery === 'external-authorization'
                      ? 'Import playback authorization'
                      : 'Use iVMS playback sign-in'}
                  </Button>
                  {googleLinked ? (
                    <Button
                      loading={busy}
                      onClick={() =>
                        void action(async () => {
                          await api.unlinkGoogle();
                          setGoogleLinked(false);
                        })
                      }
                    >
                      Disconnect Google sign-in
                    </Button>
                  ) : (
                    <GoogleAuthButton
                      text="signin_with"
                      onCredential={(credential) =>
                        void action(async () => {
                          await api.linkGoogle(credential);
                          setGoogleLinked(true);
                        })
                      }
                    />
                  )}
                  <Button disabled={!provider?.connected} onClick={() => setDisconnect(true)}>
                    Disconnect Hik-Connect
                  </Button>
                  <Button
                    loading={busy}
                    onClick={() => void action(() => request('/api/provider/recovery/retry', {}))}
                  >
                    <RefreshCw size={14} />
                    Retry saved recovery
                  </Button>
                  {provider?.automaticReconnect && (
                    <Button
                      loading={busy}
                      onClick={() =>
                        void action(() => request('/api/provider/recovery/disable', {}))
                      }
                    >
                      Disable automatic recovery
                    </Button>
                  )}
                </div>
              ) : (
                <p>Your workspace administrator manages this connection.</p>
              )}
              <p className="small muted mt-4">
                Provider credentials stay on the backend. Verification challenges must be completed
                as required by Hik-Connect; playback may need separate iVMS authorization.
              </p>
            </section>
          )}
          {tab === 'viewing' && (
            <section className="panel settings-panel">
              <h2>Viewing preferences</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const d = new FormData(e.currentTarget);
                  await patch({
                    settings: {
                      ...state.settings,
                      theme: String(d.get('theme')) as 'dark' | 'light',
                      quality: String(d.get('quality')) as 'auto' | 'sd' | 'hd',
                      rotation: Number(d.get('rotation')),
                      reduceMotion: d.get('motion') === 'on',
                    },
                  });
                  toast.success('Preferences saved to your account.');
                }}
              >
                <Field label="Appearance">
                  <select name="theme" defaultValue={state.settings.theme}>
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </Field>
                <Field label="Default quality">
                  <select name="quality" defaultValue={state.settings.quality}>
                    <option value="auto">Adaptive</option>
                    <option value="sd">SD</option>
                    <option value="hd">HD</option>
                  </select>
                </Field>
                <Field label="Rotation interval">
                  <select name="rotation" defaultValue={state.settings.rotation}>
                    {[15, 30, 60, 120].map((n) => (
                      <option key={n} value={n}>
                        {n} seconds
                      </option>
                    ))}
                  </select>
                </Field>
                <label className="setting-row">
                  <span>Reduce motion</span>
                  <input
                    type="checkbox"
                    name="motion"
                    defaultChecked={state.settings.reduceMotion}
                  />
                </label>
                <Button type="submit" variant="primary">
                  Save preferences
                </Button>
              </form>
            </section>
          )}
          {tab === 'storage' && (
            <section className="panel settings-panel">
              <h2>Server recording storage</h2>
              {storage ? (
                <>
                  <p>
                    {formatBytes(storage.usedBytes)} / {formatBytes(storage.maxBytes)}
                  </p>
                  <p>{storage.clipCount} stored clips</p>
                  {user?.role === 'admin' && (
                    <Field label="Retention period">
                      <select
                        value={storage.retentionDays}
                        onChange={async (e) => {
                          try {
                            const d = await request('/api/recordings/settings', {
                              retentionDays: Number(e.target.value),
                              maxBytes: storage.maxBytes,
                            });
                            setStorage(d.storage || d);
                            toast.success('Retention saved.');
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                      >
                        {[1, 7, 30, 90].map((n) => (
                          <option value={n} key={n}>
                            {n} days
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                  <Button
                    onClick={() =>
                      void fleetApi
                        .pollMock()
                        .then(() => refresh())
                        .then(() => toast.success('Mock telemetry stored in PostgreSQL.'))
                        .catch((e) => toast.error(e.message))
                    }
                    disabled={user?.role !== 'admin'}
                  >
                    Generate backend GPS/fuel samples
                  </Button>
                  <p className="small muted">
                    Optional simulator for mapped telemetry devices only. Real GPS/fuel vendor
                    integration is phase 2.
                  </p>
                </>
              ) : (
                <p>Storage summary unavailable or not permitted.</p>
              )}
            </section>
          )}
          {tab === 'security' && (
            <section className="panel settings-panel">
              <h2>Change viewer password</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget,
                    d = new FormData(form);
                  setBusy(true);
                  try {
                    await api.changePassword(String(d.get('current')), String(d.get('new')));
                    await refresh();
                    form.reset();
                    toast.success('Password changed; other viewer sessions were signed out.');
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Field label="Current password">
                  <input type="password" name="current" autoComplete="current-password" required />
                </Field>
                <Field label="New password">
                  <input
                    type="password"
                    name="new"
                    autoComplete="new-password"
                    minLength={12}
                    required
                  />
                </Field>
                <Button type="submit" loading={busy}>
                  Save new password
                </Button>
              </form>
              <Button className="mt-4" onClick={() => void signOut()}>
                <LogOut size={15} />
                Sign out
              </Button>
            </section>
          )}
        </div>
      </div>
      <Modal
        open={connection}
        onOpenChange={setConnection}
        title="Sign in to Hik-Connect"
        description="Connect your workspace’s owned and shared recorders."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget,
              d = new FormData(form);
            setBusy(true);
            try {
              await request('/api/connect/personal', {
                account: String(d.get('account')),
                password: String(d.get('password')),
                origin: String(d.get('origin')),
                automaticReconnect: d.get('recover') === 'on',
              });
              await refresh();
              await refreshDevices();
              setConnection(false);
              toast.success('Hik-Connect account connected.');
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              const input = form.elements.namedItem('password') as HTMLInputElement;
              if (input) input.value = '';
              setBusy(false);
            }
          }}
        >
          <Field label="Hik-Connect ID">
            <input name="account" autoComplete="username" required />
          </Field>
          <Field label="Hik-Connect password">
            <input type="password" name="password" autoComplete="current-password" required />
          </Field>
          <Field label="Region">
            <select name="origin">
              <option value="https://iindia.hik-connect.com">India</option>
              <option value="https://www.hik-connect.com">Global</option>
            </select>
          </Field>
          <label className="setting-row">
            <span>Save encrypted credentials for account recovery</span>
            <input type="checkbox" name="recover" />
          </label>
          <Button variant="primary" loading={busy} type="submit">
            Connect account
          </Button>
        </form>
      </Modal>
      <Modal
        open={playbackImport}
        onOpenChange={setPlaybackImport}
        title="Import playback authorization"
        description="Linux cannot read a Windows iVMS session. Import an authorized grant for this account; the backend verifies a shared channel before saving it."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget,
              file = (form.elements.namedItem('grant') as HTMLInputElement).files?.[0];
            if (!file || file.size > 4096) {
              toast.error('Choose a playback JSON file smaller than 4 KB.');
              return;
            }
            setBusy(true);
            try {
              const value = JSON.parse(await file.text());
              if (typeof value.accessToken !== 'string')
                throw new Error('The file does not contain a playback grant.');
              await request('/api/connect/playback', {
                accessToken: value.accessToken,
                expiresAt: value.expiresAt ?? null,
              });
              await refresh();
              setPlaybackImport(false);
              toast.success('Playback authorization verified and saved.');
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : 'Could not import playback authorization.',
              );
            } finally {
              form.reset();
              setBusy(false);
            }
          }}
        >
          <Field
            label="Playback authorization file"
            hint="Private JSON containing accessToken and optional expiresAt in Unix milliseconds. Never send this file in chat or commit it."
          >
            <input name="grant" type="file" accept="application/json,.json" required />
          </Field>
          <Button type="submit" variant="primary" loading={busy}>
            Verify and import
          </Button>
        </form>
      </Modal>
      <Confirm
        open={disconnect}
        onOpenChange={setDisconnect}
        title="Disconnect Hik-Connect?"
        description="Camera streams stop and this saved provider connection is removed. Your viewer account remains."
        action="Disconnect"
        onConfirm={() =>
          action(() => request('/api/disconnect', {})).then(() => setDisconnect(false))
        }
      />
    </div>
  );
}
