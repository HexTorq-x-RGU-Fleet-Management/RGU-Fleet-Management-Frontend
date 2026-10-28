'use client';
import { useState, useEffect, type ReactNode } from 'react';
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
  Cctv,
  Play,
  KeyRound,
  Monitor,
  Timer,
  Sparkles,
  Plus,
  Satellite,
  Database,
  Shield,
  Info,
  type LucideIcon,
} from 'lucide-react';
import { AsciiSkeleton } from 'ascii-reveal';
import { toast } from 'sonner';
import { useWorkspace } from './workspace-provider';
import { PageHeading, Button, Modal, Field, Badge, Confirm } from './ui';
import { api, request, fleetApi } from '@/lib/api';
import { GoogleAuthButton } from './google-auth-button';
import { formatBytes } from '@/lib/model';

function SectionHeader({
  icon: Icon,
  title,
  description,
  badge,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: ReactNode;
}) {
  return (
    <header className="settings-section-header">
      <span className="settings-section-icon">
        <Icon size={22} />
      </span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {badge}
    </header>
  );
}

function SettingGroup({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="settings-group">
      <div className="settings-group-heading">
        <Icon size={18} aria-hidden="true" />
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <div className="settings-group-controls">{children}</div>
    </div>
  );
}

type ChoiceValue = string | number | boolean;
type Choice = { value: ChoiceValue; label: string; description?: string; icon?: LucideIcon };
function Choices({
  label,
  value,
  options,
  onChange,
  theme = false,
}: {
  label: string;
  value: ChoiceValue;
  options: Choice[];
  onChange: (value: ChoiceValue) => void;
  theme?: boolean;
}) {
  return (
    <div
      className={`settings-choices ${theme ? 'settings-theme-choices' : ''}`}
      role="radiogroup"
      aria-label={label}
      onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key))
          return;
        event.preventDefault();
        const buttons = [
          ...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]'),
        ];
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? buttons.length - 1
              : (index + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) + buttons.length) %
                buttons.length;
        buttons[next]?.focus();
        buttons[next]?.click();
      }}
    >
      {options.map(({ value: option, label: text, description, icon: Icon }) => (
        <button
          key={String(option)}
          type="button"
          role="radio"
          aria-checked={value === option}
          tabIndex={value === option ? 0 : -1}
          className={`settings-choice ${value === option ? 'active' : ''}`}
          data-value={String(option)}
          onClick={() => onChange(option)}
        >
          {theme && (
            <span className="settings-theme-preview" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          )}
          <span className="settings-choice-content">
            {Icon && <Icon size={16} aria-hidden="true" />}
            <span>
              <strong>{text}</strong>
              {description && <small>{description}</small>}
            </span>
            <span className="settings-choice-check" aria-hidden="true">
              {value === option && <Check size={12} />}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

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
    [sourceInspect, setSourceInspect] = useState<any>(null),
    [sourceDiagnostics, setSourceDiagnostics] = useState<any>(null),
    [sourceInspectBusy, setSourceInspectBusy] = useState(false),
    [deviceBusy, setDeviceBusy] = useState(false),
    [storageLoading, setStorageLoading] = useState(false),
    [sourcesLoading, setSourcesLoading] = useState(false);
  useEffect(() => {
    if (tab === 'storage' && user?.role !== 'superadmin') {
      setStorageLoading(true);
      void request('/api/recordings/storage')
        .then((d) => setStorage(d.storage))
        .catch((e) => toast.error(e.message))
        .finally(() => setStorageLoading(false));
    }
  }, [tab, user?.id]);
  useEffect(() => {
    if (tab === 'fleet' && user?.role === 'admin') {
      setSourcesLoading(true);
      void fleetApi
        .wheelseyeSources()
        .then((result) => setWheelseyeSources(result.sources || []))
        .catch((e) => toast.error(e.message))
        .finally(() => setSourcesLoading(false));
    }
  }, [tab, user?.id]);
  useEffect(() => {
    if (!deviceView) return;
    const controller = new AbortController();
    setDeviceBusy(true);
    void fleetApi
      .wheelseyeDevice(
        deviceView.sourceId,
        String(deviceView.device.deviceNumber),
        controller.signal,
      )
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
    <div className="workspace-settings">
      <PageHeading
        eyebrow="WORKSPACE SETTINGS"
        title="Your workspace, your way."
        description="Manage provider access and your saved viewing preferences."
      >
        <span className="settings-workspace-tag">
          <SettingsIcon size={15} /> Workspace controls
        </span>
      </PageHeading>
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
                type="button"
                id={`settings-tab-${id}`}
                aria-controls={`settings-section-${id}`}
                className={tab === id ? 'active' : ''}
                aria-current={tab === id ? 'page' : undefined}
                onClick={() => setTab(String(id))}
              >
                <span className="settings-tab-icon">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <span className="settings-tab-copy">
                  <strong>{String(label)}</strong>
                  <small>{String(description)}</small>
                </span>
                <ChevronRight size={15} className="settings-tab-arrow" aria-hidden="true" />
              </button>
            ))}
        </nav>
        <div
          className="settings-content"
          id={`settings-section-${tab}`}
          aria-labelledby={`settings-tab-${tab}`}
        >
          {tab === 'account' && user?.role !== 'superadmin' && (
            <section className="panel settings-panel">
              <SectionHeader
                icon={Link2}
                title="Hik-Connect account"
                description="Manage camera access, playback authorization, and account recovery."
                badge={
                  <Badge tone={provider?.connected ? 'green' : 'amber'}>
                    {provider?.authorizationState || 'Disconnected'}
                  </Badge>
                }
              />
              <div className="settings-connection-summary">
                <span className="settings-connection-symbol">
                  <Cctv size={24} />
                </span>
                <div>
                  <small>CONNECTED PROVIDER</small>
                  <strong>
                    {provider?.user?.email ||
                      provider?.user?.username ||
                      (provider?.connected
                        ? 'Workspace camera connection active'
                        : 'No provider account connected')}
                  </strong>
                  <p>
                    {provider?.playbackReady
                      ? 'Camera access and playback authorization are ready.'
                      : provider?.connected
                        ? 'Device access is connected. Playback authorization is still required.'
                        : 'Sign in to load your owned and shared recorders.'}
                  </p>
                </div>
              </div>
              {user?.role === 'admin' ? (
                <div className="settings-groups">
                  <SettingGroup
                    icon={Cctv}
                    title="Camera access"
                    description="Connect the account that owns or shares your recorders."
                  >
                    <Button variant="primary" onClick={() => setConnection(true)}>
                      <Link2 size={15} />
                      Sign in to Hik-Connect
                    </Button>
                    <Button disabled={!provider?.connected} onClick={() => setDisconnect(true)}>
                      <LogOut size={14} /> Disconnect Hik-Connect
                    </Button>
                  </SettingGroup>
                  <SettingGroup
                    icon={Play}
                    title="Playback authorization"
                    description={
                      provider?.playbackReady
                        ? 'Your playback authorization is saved.'
                        : 'Authorize recorded playback separately from live device access.'
                    }
                  >
                    <Badge tone={provider?.playbackReady ? 'green' : 'amber'}>
                      {provider?.playbackReady ? 'Authorized' : 'Authorization required'}
                    </Badge>
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
                  </SettingGroup>
                  <SettingGroup
                    icon={ShieldCheck}
                    title="Google sign-in"
                    description="Link or manage Google sign-in for your viewer account."
                  >
                    {googleLinked && <Badge tone="green">Linked</Badge>}
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
                  </SettingGroup>
                  <SettingGroup
                    icon={RefreshCw}
                    title="Connection recovery"
                    description={
                      provider?.automaticReconnect
                        ? 'Automatic recovery is enabled for this provider account.'
                        : 'Retry a previously saved provider authorization.'
                    }
                  >
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
                  </SettingGroup>
                </div>
              ) : (
                <p>Your workspace administrator manages this connection.</p>
              )}
              <p className="settings-note">
                <Shield size={16} aria-hidden="true" />
                <span>
                  Provider credentials stay on the backend. Verification challenges must be
                  completed as required by Hik-Connect; playback may need separate iVMS
                  authorization.
                </span>
              </p>
            </section>
          )}
          {tab === 'viewing' && (
            <section className="panel settings-panel">
              <SectionHeader
                icon={SlidersHorizontal}
                title="Viewing preferences"
                description="Make the workspace feel right for the way you work."
                badge={
                  <span className="settings-save-hint">
                    <Check size={14} /> Auto-saved
                  </span>
                }
              />
              <div className="settings-groups">
                <SettingGroup
                  icon={Sun}
                  title="Appearance"
                  description="Choose a light or dark workspace."
                >
                  <Choices
                    label="Appearance"
                    theme
                    value={state.settings.theme}
                    options={[
                      { value: 'light', label: 'Light theme', icon: Sun },
                      { value: 'dark', label: 'Dark theme', icon: Moon },
                    ]}
                    onChange={(value) => void updatePreference('theme', value)}
                  />
                </SettingGroup>
                <SettingGroup
                  icon={Monitor}
                  title="Default video quality"
                  description="Balance playback detail and available bandwidth."
                >
                  <Choices
                    label="Video quality"
                    value={state.settings.quality}
                    options={[
                      { value: 'auto', label: 'Adaptive', description: 'Auto' },
                      { value: 'sd', label: 'SD', description: 'Standard' },
                      { value: 'hd', label: 'HD', description: 'High definition' },
                    ]}
                    onChange={(value) => void updatePreference('quality', value)}
                  />
                </SettingGroup>
                <SettingGroup
                  icon={Timer}
                  title="Camera rotation interval"
                  description="How long each camera stays on screen during rotation."
                >
                  <Choices
                    label="Rotation interval"
                    value={state.settings.rotation}
                    options={[15, 30, 60, 120].map((value) => ({
                      value,
                      label: `${value} seconds`,
                    }))}
                    onChange={(value) => void updatePreference('rotation', value)}
                  />
                </SettingGroup>
                <SettingGroup
                  icon={Maximize2}
                  title="Command deck view mode"
                  description="Choose the space available to your camera workspace."
                >
                  <Choices
                    label="Command deck view mode"
                    value={state.settings.pureSite ?? true}
                    options={[
                      { value: true, label: 'Pure Site View', icon: Maximize2 },
                      { value: false, label: 'Standard View', icon: Minimize2 },
                    ]}
                    onChange={(value) => void updatePreference('pureSite', value)}
                  />
                </SettingGroup>
                <SettingGroup
                  icon={Sparkles}
                  title="Interface animation motion"
                  description="Control the motion used for page and card reveals."
                >
                  <Choices
                    label="Interface motion"
                    value={Boolean(state.settings.reduceMotion)}
                    options={[
                      { value: false, label: 'Full animations' },
                      { value: true, label: 'Reduced motion' },
                    ]}
                    onChange={(value) => void updatePreference('reduceMotion', value)}
                  />
                </SettingGroup>
              </div>
              <p className="settings-note">
                <Info size={16} />
                <span>
                  Preferences update across your session and are automatically saved to your
                  account.
                </span>
              </p>
            </section>
          )}
          {tab === 'storage' && (
            <section className="panel settings-panel">
              <SectionHeader
                icon={HardDrive}
                title="Server recording storage"
                description="Keep track of saved clips, capacity, and your retention policy."
              />
              {storageLoading ? (
                <div
                  className="settings-loading"
                  aria-label="Loading recording storage"
                  aria-busy="true"
                >
                  <AsciiSkeleton lines={4} variant="dither" />
                </div>
              ) : storage ? (
                <>
                  <div className="settings-storage-stats">
                    <div>
                      <span>
                        <Database size={16} /> Space used
                      </span>
                      <strong>{formatBytes(storage.usedBytes)}</strong>
                      <small>of {formatBytes(storage.maxBytes)} available</small>
                    </div>
                    <div>
                      <span>
                        <Play size={16} /> Stored clips
                      </span>
                      <strong>{storage.clipCount}</strong>
                      <small>saved in your workspace</small>
                    </div>
                    <div>
                      <span>
                        <Timer size={16} /> Retention
                      </span>
                      <strong>
                        {storage.retentionDays}
                        <em> days</em>
                      </strong>
                      <small>current recording policy</small>
                    </div>
                  </div>
                  <div className="settings-capacity">
                    <div>
                      <strong>Storage capacity</strong>
                      <span>
                        {storage.maxBytes > 0
                          ? Math.round((storage.usedBytes / storage.maxBytes) * 100)
                          : 0}
                        % used
                      </span>
                    </div>
                    <progress
                      aria-label="Recording storage used"
                      max={100}
                      value={
                        storage.maxBytes > 0
                          ? Math.min(100, (storage.usedBytes / storage.maxBytes) * 100)
                          : 0
                      }
                    />
                    <p>
                      {formatBytes(storage.usedBytes)} of {formatBytes(storage.maxBytes)}
                    </p>
                  </div>
                  {user?.role === 'admin' && (
                    <SettingGroup
                      icon={Timer}
                      title="Retention period"
                      description="Choose how long server recordings are kept in this workspace."
                    >
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
                    </SettingGroup>
                  )}
                </>
              ) : (
                <p className="settings-note">
                  <Info size={16} />
                  <span>Storage summary unavailable or not permitted.</span>
                </p>
              )}
            </section>
          )}
          {tab === 'fleet' && (
            <section className="panel settings-panel">
              <SectionHeader
                icon={Route}
                title="Fleet telemetry"
                description="Connect WheelsEye accounts and manage GPS and fuel devices."
              />
              {user?.role === 'admin' ? (
                <>
                  <div className="settings-subsection">
                    <div className="settings-subsection-heading">
                      <span>
                        <Plus size={17} />
                      </span>
                      <div>
                        <h3>Add a connection</h3>
                        <p>Discover vehicles using your WheelsEye currentLoc endpoint.</p>
                      </div>
                    </div>
                    <form
                      className="settings-telemetry-form"
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
                  </div>
                  <div className="settings-subsection settings-sources">
                    <div className="settings-subsection-heading">
                      <span>
                        <Satellite size={17} />
                      </span>
                      <div>
                        <h3>Connected accounts</h3>
                        <p>Inspect devices or manage an existing provider connection.</p>
                      </div>
                    </div>
                    <div className="settings-list" aria-busy={sourcesLoading || undefined}>
                      {sourcesLoading && (
                        <div className="settings-loading">
                          <AsciiSkeleton lines={2} />
                        </div>
                      )}
                      {!sourcesLoading && !wheelseyeSources.length && (
                        <p className="settings-empty">
                          No WheelsEye accounts connected yet. Add a connection above to discover
                          your devices.
                        </p>
                      )}
                      {wheelseyeSources.map((source) => (
                        <div className="settings-list-row settings-source" key={source.id}>
                          <span className="settings-source-icon">
                            <Satellite size={20} />
                          </span>
                          <div className="settings-source-copy">
                            <strong>{source.label}</strong>
                            <small>
                              {source.devices?.length || 0} devices · polls every{' '}
                              {source.pollIntervalSeconds || 60}s
                            </small>
                          </div>
                          <div className="settings-source-actions">
                            <Button
                              onClick={async () => {
                                setSourceInspect(source);
                                setSourceDiagnostics(null);
                                setSourceInspectBusy(true);
                                try {
                                  setSourceDiagnostics(await fleetApi.wheelseyeSource(source.id));
                                } catch (e) {
                                  toast.error((e as Error).message);
                                } finally {
                                  setSourceInspectBusy(false);
                                }
                              }}
                            >
                              Inspect data
                            </Button>
                            <Button
                              onClick={() => {
                                const first = source.devices?.[0];
                                if (first) {
                                  setDeviceView({ sourceId: source.id, device: first });
                                  setDeviceDetail(null);
                                } else
                                  toast.error(
                                    'No devices have been discovered for this source yet.',
                                  );
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
                      className="settings-refresh"
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
                      <RefreshCw size={15} />
                      Refresh WheelsEye devices
                    </Button>
                  </div>
                  <p className="settings-note">
                    <Info size={16} />
                    <span>
                      WheelsEye locations are stored in the backend every minute. Select “View
                      devices” to inspect the latest provider response and stored samples.
                    </span>
                  </p>
                </>
              ) : (
                <p className="muted">Only workspace admins can manage WheelsEye connections.</p>
              )}
            </section>
          )}
          {tab === 'security' && (
            <section className="panel settings-panel">
              <SectionHeader
                icon={ShieldCheck}
                title="Viewer password"
                description="Keep your viewer account and workspace access protected."
              />
              <div className="settings-security-summary">
                <span>
                  <KeyRound size={24} />
                </span>
                <div>
                  <h3>Change your password</h3>
                  <p>
                    Use at least 12 characters. Updating your password signs out other viewer
                    sessions.
                  </p>
                </div>
              </div>
              <form
                className="settings-password-form"
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
                <div className="settings-form-fields">
                  <Field label="Current password">
                    <input
                      type="password"
                      name="current"
                      autoComplete="current-password"
                      required
                    />
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
                </div>
                <Button type="submit" variant="primary" loading={busy}>
                  <KeyRound size={15} />
                  Save new password
                </Button>
              </form>
              <div className="settings-signout">
                <div>
                  <h3>Current session</h3>
                  <p>Sign out of the fleet workspace on this device.</p>
                </div>
                <Button onClick={() => void signOut()}>
                  <LogOut size={15} />
                  Sign out
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>
      <Modal
        open={Boolean(sourceInspect)}
        onOpenChange={(open) => {
          if (!open) {
            setSourceInspect(null);
            setSourceDiagnostics(null);
          }
        }}
        title={sourceInspect ? `Telemetry diagnostics · ${sourceInspect.label}` : 'Telemetry diagnostics'}
        description="Admin-only provider response, discovered devices and persisted database observations. Secrets are never returned."
        wide
      >
        {sourceInspect && (
          <div className="telemetry-admin-dialog">
            <div className="settings-list-row">
              <div>
                <strong>{sourceInspect.label}</strong>
                <small>{sourceInspect.endpointUrl || 'https://api.wheelseye.com/currentLoc'} · {sourceInspect.devices?.length || sourceInspect.devices?.length === 0 ? `${sourceInspect.devices.length} discovered device(s)` : 'Loading source details'}</small>
              </div>
              <div className="settings-source-actions">
                <Button
                  loading={sourceInspectBusy}
                  onClick={async () => {
                    setSourceInspectBusy(true);
                    try {
                      const result = await fleetApi.pollWheelseyeSource(sourceInspect.id);
                      setSourceDiagnostics(result);
                      setSourceInspect(result.source);
                      setWheelseyeSources((items) => items.map((item) => item.id === result.source.id ? { ...item, ...result.source, devices: result.devices } : item));
                      toast.success('Live API triggered and telemetry was persisted.');
                    } catch (e) {
                      toast.error((e as Error).message);
                    } finally {
                      setSourceInspectBusy(false);
                    }
                  }}
                >
                  <Play size={15} /> Trigger live API
                </Button>
                <Button
                  onClick={async () => {
                    setSourceInspectBusy(true);
                    try { setSourceDiagnostics(await fleetApi.wheelseyeSource(sourceInspect.id)); }
                    catch (e) { toast.error((e as Error).message); }
                    finally { setSourceInspectBusy(false); }
                  }}
                >
                  <RefreshCw size={15} /> Refresh database view
                </Button>
              </div>
            </div>
            {sourceInspectBusy && !sourceDiagnostics && <div className="settings-loading"><AsciiSkeleton lines={4} /></div>}
            {sourceDiagnostics && (
              <>
                <div className="telemetry-admin-summary">
                  <Badge tone={sourceDiagnostics.source?.lastError ? 'amber' : 'green'}>{sourceDiagnostics.source?.lastError ? 'Last poll failed' : 'Source healthy'}</Badge>
                  <span>{sourceDiagnostics.devices?.length || 0} devices</span>
                  <span>{sourceDiagnostics.logs?.length || 0} recent database rows</span>
                  <span>Poll every {sourceDiagnostics.source?.pollIntervalSeconds || 60}s</span>
                </div>
                {sourceDiagnostics.source?.lastError && <p className="settings-error">{sourceDiagnostics.source.lastError}</p>}
                <div className="settings-subsection">
                  <div className="settings-subsection-heading"><span><Database size={17} /></span><div><h3>Configured devices</h3><p>Devices discovered from this provider account.</p></div></div>
                  <div className="table-scroll"><table className="data-table"><thead><tr><th>Device</th><th>Vehicle</th><th>Vendor</th><th>Last seen</th></tr></thead><tbody>{(sourceDiagnostics.devices || []).map((device: any) => <tr key={device.device_number}><td>{device.device_number}</td><td>{device.vehicle_number || '—'}</td><td>{device.vendor_name || device.vendor_code || device.provider || '—'}</td><td>{device.last_seen_at ? new Date(device.last_seen_at).toLocaleString('en-IN') : '—'}</td></tr>)}</tbody></table></div>
                </div>
                <div className="settings-subsection">
                  <div className="settings-subsection-heading"><span><HardDrive size={17} /></span><div><h3>Persisted telemetry rows</h3><p>Latest raw observations stored by the server.</p></div></div>
                  <div className="table-scroll"><table className="data-table"><thead><tr><th>Received</th><th>Device</th><th>Coordinates</th><th>Speed</th><th>Ignition</th><th>Fuel</th></tr></thead><tbody>{(sourceDiagnostics.logs || []).map((row: any, index: number) => <tr key={`${row.device_number}-${row.gps_time}-${index}`}><td>{row.received_at ? new Date(row.received_at).toLocaleString('en-IN') : '—'}</td><td>{row.device_number}</td><td>{Number(row.latitude).toFixed(5)}, {Number(row.longitude).toFixed(5)}</td><td>{row.speed} km/h</td><td>{row.ignition ? 'On' : 'Off'}</td><td>{row.payload?.fuelData?.currentLiters ?? '—'}</td></tr>)}</tbody></table>{!sourceDiagnostics.logs?.length && <p className="small muted">No telemetry rows have been stored for this source yet.</p>}</div>
                </div>
                <div className="settings-subsection">
                  <div className="settings-subsection-heading"><span><Route size={17} /></span><div><h3>Normalized movement segments</h3><p>Database segments created only when the position moves more than 10 meters.</p></div></div>
                  <div className="table-scroll"><table className="data-table"><thead><tr><th>Start</th><th>Device</th><th>Coordinates</th><th>Speed</th><th>Ignition</th><th>Fuel</th></tr></thead><tbody>{(sourceDiagnostics.segments || []).map((row: any, index: number) => <tr key={`${row.device_number}-${row.segment_start}-${index}`}><td>{row.segment_start ? new Date(row.segment_start).toLocaleString('en-IN') : '—'}</td><td>{row.device_number}</td><td>{Number(row.latitude).toFixed(5)}, {Number(row.longitude).toFixed(5)}</td><td>{row.speed} km/h</td><td>{row.ignition ? 'On' : 'Off'}</td><td>{row.fuel_litres ?? '—'}</td></tr>)}</tbody></table>{!sourceDiagnostics.segments?.length && <p className="small muted">No normalized movement segments have been stored yet.</p>}</div>
                </div>
                <div className="settings-subsection">
                  <div className="settings-subsection-heading"><span><Info size={17} /></span><div><h3>Latest provider response</h3><p>Safe vehicle data returned by the last manual trigger; access tokens are excluded.</p></div></div>
                  <pre className="telemetry-json">{JSON.stringify(sourceDiagnostics.liveResponse || { note: 'Trigger the live API to capture a response.' }, null, 2)}</pre>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
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
        title={
          deviceView
            ? `WheelsEye · ${deviceView.device.vehicleNumber || deviceView.device.deviceNumber}`
            : 'WheelsEye device'
        }
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
              <Badge tone={deviceDetail ? 'green' : 'neutral'}>
                {deviceBusy ? 'Loading live data' : deviceDetail ? 'Live checked' : 'Waiting'}
              </Badge>
            </div>
            {deviceDetail && (
              <>
                <div className="telemetry-device-live">
                  <strong>{deviceDetail.vehicle.speed} km/h</strong>
                  <span>
                    {deviceDetail.vehicle.status} ·{' '}
                    {deviceDetail.vehicle.location?.address || 'Location unavailable'}
                  </span>
                  <span>
                    GPS {new Date(deviceDetail.vehicle.gpsTime * 1000).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Location</th>
                        <th>Speed</th>
                        <th>Ignition</th>
                        <th>Fuel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deviceDetail.samples.map((sample: any, index: number) => (
                        <tr key={`${sample.vehicle.gpsTime}-${index}`}>
                          <td>{new Date(sample.vehicle.gpsTime * 1000).toLocaleString('en-IN')}</td>
                          <td>
                            {sample.vehicle.location?.address ||
                              `${sample.vehicle.location?.latitude}, ${sample.vehicle.location?.longitude}`}
                          </td>
                          <td>{sample.vehicle.speed} km/h</td>
                          <td>{sample.vehicle.ignition ? 'On' : 'Off'}</td>
                          <td>{sample.vehicle.fuelData?.currentLiters ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!deviceDetail.samples.length && (
                    <p className="small muted">
                      No stored samples yet; the next server poll will appear here.
                    </p>
                  )}
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
