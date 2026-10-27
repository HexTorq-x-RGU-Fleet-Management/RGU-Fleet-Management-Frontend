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
  Route,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  Check,
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
    [storage, setStorage] = useState<any>(null),
    [wheelseyeSources, setWheelseyeSources] = useState<any[]>([]),
    [wheelseyeBusy, setWheelseyeBusy] = useState(false),
    [deviceView, setDeviceView] = useState<{ sourceId: string; device: any } | null>(null),
    [deviceDetail, setDeviceDetail] = useState<any>(null),
    [deviceBusy, setDeviceBusy] = useState(false);
  useEffect(() => {
    if (tab === 'storage' && user?.role !== 'superadmin')
      void request('/api/recordings/storage')
        .then((d) => setStorage(d.storage))
        .catch((e) => toast.error(e.message));
  }, [tab, user?.id]);
  useEffect(() => {
    if (tab === 'fleet' && user?.role === 'admin')
      void fleetApi
        .wheelseyeSources()
        .then((result) => setWheelseyeSources(result.sources || []))
        .catch((e) => toast.error(e.message));
  }, [tab, user?.id]);
  useEffect(() => {
    if (!deviceView) return;
    const controller = new AbortController();
    setDeviceBusy(true);
    void fleetApi
      .wheelseyeDevice(deviceView.sourceId, String(deviceView.device.deviceNumber), controller.signal)
      .then(setDeviceDetail)
      .catch((e) => {
        if (e.name !== 'AbortError') toast.error(e.message);
      })
      .finally(() => setDeviceBusy(false));
    return () => controller.abort();
  }, [deviceView]);
  useEffect(() => {
    if (tab === 'account' && user?.role === 'admin')
      void api
        .googleStatus()
        .then((result) => setGoogleLinked(result.linked))
        .catch(() => undefined);
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

  async function updatePreference(key: string, value: any) {
    try {
      await patch({
        settings: {
          ...state.settings,
          [key]: value,
        },
      });
      toast.success('Preference updated');
    } catch (e) {
      toast.error((e as Error).message);
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
            ['fleet', 'Fleet telemetry', 'WheelsEye connections and devices', Route],
            ['security', 'Viewer password', 'Access protection', ShieldCheck],
          ]
            .filter(
              ([id]) => user?.role !== 'superadmin' || ['viewing', 'security'].includes(String(id)),
            )
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
              <p className="muted" style={{ marginBottom: 20 }}>
                Preferences update instantly across your session and are automatically saved to your
                account.
              </p>

              <div className="setting-block" style={{ marginBottom: 22 }}>
                <span
                  className="setting-label-bold"
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--text)',
                    marginBottom: 8,
                  }}
                >
                  Appearance
                </span>
                <div className="settings-button-group" role="radiogroup" aria-label="Appearance">
                  {[
                    { id: 'dark', label: 'Dark theme', icon: Moon },
                    { id: 'light', label: 'Light theme', icon: Sun },
                  ].map((opt) => {
                    const active = state.settings.theme === opt.id;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className={`settings-option-btn ${active ? 'active' : ''}`}
                        onClick={() => void updatePreference('theme', opt.id)}
                      >
                        <Icon size={15} />
                        <span>{opt.label}</span>
                        {active && <Check size={14} className="active-check" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="setting-block" style={{ marginBottom: 22 }}>
                <span
                  className="setting-label-bold"
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--text)',
                    marginBottom: 8,
                  }}
                >
                  Default video quality
                </span>
                <div className="settings-button-group" role="radiogroup" aria-label="Video quality">
                  {[
                    { id: 'auto', label: 'Adaptive (Auto)' },
                    { id: 'sd', label: 'SD (Standard Def)' },
                    { id: 'hd', label: 'HD (High Def)' },
                  ].map((opt) => {
                    const active = state.settings.quality === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className={`settings-option-btn ${active ? 'active' : ''}`}
                        onClick={() => void updatePreference('quality', opt.id)}
                      >
                        <span>{opt.label}</span>
                        {active && <Check size={14} className="active-check" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="setting-block" style={{ marginBottom: 22 }}>
                <span
                  className="setting-label-bold"
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--text)',
                    marginBottom: 8,
                  }}
                >
                  Camera rotation interval
                </span>
                <div
                  className="settings-button-group"
                  role="radiogroup"
                  aria-label="Rotation interval"
                >
                  {[
                    { id: 15, label: '15 seconds' },
                    { id: 30, label: '30 seconds' },
                    { id: 60, label: '60 seconds' },
                    { id: 120, label: '120 seconds' },
                  ].map((opt) => {
                    const active = state.settings.rotation === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className={`settings-option-btn ${active ? 'active' : ''}`}
                        onClick={() => void updatePreference('rotation', opt.id)}
                      >
                        <span>{opt.label}</span>
                        {active && <Check size={14} className="active-check" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="setting-block" style={{ marginBottom: 22 }}>
                <span
                  className="setting-label-bold"
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--text)',
                    marginBottom: 8,
                  }}
                >
                  Command deck view mode
                </span>
                <div
                  className="settings-button-group"
                  role="radiogroup"
                  aria-label="Command deck view mode"
                >
                  {[
                    { id: true, label: 'Pure Site View', icon: Maximize2 },
                    { id: false, label: 'Standard View', icon: Minimize2 },
                  ].map((opt) => {
                    const isPure = state.settings.pureSite ?? true;
                    const active = isPure === opt.id;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={String(opt.id)}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className={`settings-option-btn ${active ? 'active' : ''}`}
                        onClick={() => void updatePreference('pureSite', opt.id)}
                      >
                        <Icon size={14} />
                        <span>{opt.label}</span>
                        {active && <Check size={14} className="active-check" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="setting-block" style={{ marginBottom: 12 }}>
                <span
                  className="setting-label-bold"
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--text)',
                    marginBottom: 8,
                  }}
                >
                  Interface animation motion
                </span>
                <div
                  className="settings-button-group"
                  role="radiogroup"
                  aria-label="Interface motion"
                >
                  {[
                    { id: false, label: 'Full animations' },
                    { id: true, label: 'Reduced motion' },
                  ].map((opt) => {
                    const active = !state.settings.reduceMotion === !opt.id;
                    return (
                      <button
                        key={String(opt.id)}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className={`settings-option-btn ${active ? 'active' : ''}`}
                        onClick={() => void updatePreference('reduceMotion', opt.id)}
                      >
                        <span>{opt.label}</span>
                        {active && <Check size={14} className="active-check" />}
                      </button>
                    );
                  })}
                </div>
              </div>
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
                </>
              ) : (
                <p>Storage summary unavailable or not permitted.</p>
              )}
            </section>
          )}
          {tab === 'fleet' && (
            <section className="panel settings-panel">
              <div className="settings-section-heading">
                <Route size={20} />
                <div>
                  <h2>Fleet telemetry</h2>
                  <p>Add WheelsEye accounts and discover their vehicle devices.</p>
                </div>
              </div>
              {user?.role === 'admin' ? (
                <>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget,
                        data = new FormData(form);
                      setWheelseyeBusy(true);
                      try {
                        const result = await fleetApi.addWheelseyeSource(
                          String(data.get('label')),
                          String(data.get('url')),
                        );
                        setWheelseyeSources((current) => [
                          ...current.filter((item) => item.id !== result.source.id),
                          result.source,
                        ]);
                        form.reset();
                        toast.success(
                          result.discoveryPending
                            ? 'Connection saved. Device discovery will run during the next poll.'
                            : `${result.fetched} device(s) discovered and saved.`,
                        );
                      } catch (e) {
                        toast.error((e as Error).message);
                      } finally {
                        setWheelseyeBusy(false);
                      }
                    }}
                  >
                    <Field label="Connection name">
                      <input name="label" placeholder="Main WheelsEye account" required />
                    </Field>
                    <Field label="WheelsEye currentLoc URL">
                      <input
                        name="url"
                        type="url"
                        placeholder="https://api.wheelseye.com/currentLoc?accessToken=…"
                        required
                      />
                    </Field>
                    <Button type="submit" variant="primary" loading={wheelseyeBusy}>
                      Save WheelsEye connection
                    </Button>
                  </form>
                  <div className="settings-list mt-6">
                    {wheelseyeSources.map((source) => (
                      <div className="settings-list-row" key={source.id}>
                        <div>
                          <strong>{source.label}</strong>
                          <small>
                            {source.devices?.length || 0} devices · polls every{' '}
                            {source.pollIntervalSeconds || 60}s
                          </small>
                        </div>
                        <div className="control-actions">
                          <Button
                            onClick={() => {
                              const first = source.devices?.[0];
                              if (first) {
                                setDeviceView({ sourceId: source.id, device: first });
                                setDeviceDetail(null);
                              } else toast.error('No devices have been discovered for this source yet.');
                            }}
                          >
                            View devices
                          </Button>
                          <Button
                            onClick={() =>
                              void fleetApi
                                .removeWheelseyeSource(source.id)
                                .then(() =>
                                  setWheelseyeSources((items) =>
                                    items.filter((item) => item.id !== source.id),
                                  ),
                                )
                                .catch((e) => toast.error(e.message))
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="primary"
                    loading={wheelseyeBusy}
                    onClick={async () => {
                      setWheelseyeBusy(true);
                      try {
                        const result = await fleetApi.refreshWheelseye();
                        setWheelseyeSources(result.sources || []);
                        await refresh();
                        toast.success('WheelsEye devices and latest GPS data refreshed.');
                      } catch (e) {
                        toast.error((e as Error).message);
                      } finally {
                        setWheelseyeBusy(false);
                      }
                    }}
                  >
                    Refresh WheelsEye devices
                  </Button>
                  <p className="small muted mt-4">
                    WheelsEye locations are stored in the backend every minute. Select “View
                    devices” to inspect the latest provider response and stored samples.
                  </p>
                </>
              ) : (
                <p className="muted">Only workspace admins can manage WheelsEye connections.</p>
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
      <Modal
        open={Boolean(deviceView)}
        onOpenChange={(open) => {
          if (!open) {
            setDeviceView(null);
            setDeviceDetail(null);
          }
        }}
        title={deviceView ? `WheelsEye · ${deviceView.device.vehicleNumber || deviceView.device.deviceNumber}` : 'WheelsEye device'}
        description="Latest live provider reading and persisted one-minute location samples."
        wide
      >
        {deviceView && (
          <div className="telemetry-device-dialog">
            <div className="settings-list-row">
              <div>
                <strong>{deviceView.device.vehicleNumber || 'Unregistered vehicle'}</strong>
                <small>Device {deviceView.device.deviceNumber}</small>
              </div>
              <Badge tone={deviceDetail ? 'green' : 'neutral'}>{deviceBusy ? 'Loading live data' : deviceDetail ? 'Live checked' : 'Waiting'}</Badge>
            </div>
            {deviceDetail && (
              <>
                <div className="telemetry-device-live">
                  <strong>{deviceDetail.vehicle.speed} km/h</strong>
                  <span>{deviceDetail.vehicle.status} · {deviceDetail.vehicle.location?.address || 'Location unavailable'}</span>
                  <span>GPS {new Date(deviceDetail.vehicle.gpsTime * 1000).toLocaleString('en-IN')}</span>
                </div>
                <div className="table-scroll">
                  <table className="data-table">
                    <thead><tr><th>Time</th><th>Location</th><th>Speed</th><th>Ignition</th><th>Fuel</th></tr></thead>
                    <tbody>
                      {deviceDetail.samples.map((sample: any, index: number) => (
                        <tr key={`${sample.vehicle.gpsTime}-${index}`}>
                          <td>{new Date(sample.vehicle.gpsTime * 1000).toLocaleString('en-IN')}</td>
                          <td>{sample.vehicle.location?.address || `${sample.vehicle.location?.latitude}, ${sample.vehicle.location?.longitude}`}</td>
                          <td>{sample.vehicle.speed} km/h</td>
                          <td>{sample.vehicle.ignition ? 'On' : 'Off'}</td>
                          <td>{sample.vehicle.fuelData?.currentLiters ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!deviceDetail.samples.length && <p className="small muted">No stored samples yet; the next server poll will appear here.</p>}
                </div>
              </>
            )}
          </div>
        )}
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
