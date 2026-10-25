'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Link2,
  ShieldCheck,
  HardDrive,
  Palette,
  ExternalLink,
  LockKeyhole,
  Info,
  Server,
  Save,
  RotateCcw,
} from 'lucide-react';
import { useWorkspace } from './workspace-provider';
import { PageHeading, Button, Field, Modal, Confirm, Badge } from './ui';
import { formatBytes, type Settings as SettingsType } from '@/lib/model';
import { api, apiBase } from '@/lib/api';
export function Settings() {
  const { state, patch, log } = useWorkspace();
  const [tab, setTab] = useState('general');
  const [connection, setConnection] = useState(false);
  const [password, setPassword] = useState(false);
  const [reset, setReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(state.settings);
  useEffect(() => setDraft(state.settings), [state.settings]);
  function save() {
    patch({ settings: draft });
    log('Preferences updated', 'Workspace preferences', 'settings');
    toast.success('Workspace preferences saved.');
  }
  return (
    <div>
      <PageHeading
        eyebrow="MAKE THE WORKSPACE YOURS"
        title="A view that fits you."
        description="Set your preferences, manage account access and understand storage."
      />
      <div className="settings-layout">
        <nav className="settings-tabs" aria-label="Settings sections">
          {[
            { id: 'general', label: 'Appearance & viewing', icon: Palette },
            { id: 'connection', label: 'Account connection', icon: Link2 },
            { id: 'storage', label: 'Recording storage', icon: HardDrive },
            { id: 'security', label: 'Account security', icon: ShieldCheck },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={tab === t.id ? 'active' : ''}
            >
              <t.icon size={17} />
              {t.label}
            </button>
          ))}
        </nav>
        <div className="settings-content">
          {tab === 'general' && (
            <section className="panel settings-panel">
              <div className="settings-section-heading">
                <Palette size={20} />
                <div>
                  <h2>Appearance & viewing</h2>
                  <p>Small details, a better everyday workspace.</p>
                </div>
              </div>
              <div className="setting-row">
                <div>
                  <strong>Appearance</strong>
                  <p>Choose the environment that feels right.</p>
                </div>
                <div className="segmented">
                  {(['dark', 'light'] as const).map((v) => (
                    <button
                      key={v}
                      className={draft.theme === v ? 'selected' : ''}
                      onClick={() => setDraft({ ...draft, theme: v })}
                    >
                      {v === 'dark' ? 'Dark' : 'Light'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="setting-row">
                <div>
                  <strong>Default camera quality</strong>
                  <p>Adaptive prefers SD grids and HD focus when connected.</p>
                </div>
                <select
                  aria-label="Default camera quality"
                  value={draft.quality}
                  onChange={(e) =>
                    setDraft({ ...draft, quality: e.target.value as SettingsType['quality'] })
                  }
                >
                  <option value="auto">Adaptive</option>
                  <option value="hd">HD / Main stream</option>
                  <option value="sd">SD / Substream</option>
                </select>
              </div>
              <div className="setting-row">
                <div>
                  <strong>Picture sizing</strong>
                  <p>Keep original proportions or fill each tile.</p>
                </div>
                <select
                  aria-label="Default picture sizing"
                  value={draft.fit}
                  onChange={(e) =>
                    setDraft({ ...draft, fit: e.target.value as 'contain' | 'cover' })
                  }
                >
                  <option value="contain">Fit</option>
                  <option value="cover">Fill</option>
                </select>
              </div>
              <div className="setting-row">
                <div>
                  <strong>Rotation interval</strong>
                  <p>Time between preview camera pages.</p>
                </div>
                <select
                  aria-label="Rotation interval"
                  value={draft.rotation}
                  onChange={(e) => setDraft({ ...draft, rotation: Number(e.target.value) })}
                >
                  {[15, 30, 60, 120].map((n) => (
                    <option key={n} value={n}>
                      {n} seconds
                    </option>
                  ))}
                </select>
              </div>
              <div className="setting-row">
                <div>
                  <strong>Reduce motion</strong>
                  <p>Disable smooth scrolling and simplify interface animations.</p>
                </div>
                <button
                  className={`switch ${draft.reduceMotion ? 'on' : ''}`}
                  role="switch"
                  aria-checked={draft.reduceMotion}
                  aria-label="Reduce motion"
                  onClick={() => setDraft({ ...draft, reduceMotion: !draft.reduceMotion })}
                >
                  <span />
                </button>
              </div>
              <div className="panel-footer">
                <span>Preferences are active for this device.</span>
                <Button variant="primary" onClick={save}>
                  <Save size={15} />
                  Save preferences
                </Button>
              </div>
            </section>
          )}
          {tab === 'connection' && (
            <section className="panel settings-panel">
              <div className="settings-section-heading">
                <Link2 size={20} />
                <div>
                  <h2>Hik-Connect account</h2>
                  <p>Your provider connection belongs to your workspace.</p>
                </div>
                <Badge tone="amber">Not connected</Badge>
              </div>
              <div className="connection-illustration">
                <Server size={32} />
                <h3>Your real cameras start here.</h3>
                <p>
                  The new backend is the next implementation phase. Provider access requires its
                  authorized SDK and account flow.
                </p>
                {state.role === 'admin' ? (
                  <Button variant="primary" onClick={() => setConnection(true)}>
                    <Link2 size={15} />
                    Connect Hik-Connect
                  </Button>
                ) : (
                  <p className="small muted">
                    A workspace administrator manages the provider connection.
                  </p>
                )}
              </div>
              <div className="info-box">
                <Info size={17} />
                <p>
                  {apiBase
                    ? `Configured backend: ${apiBase}`
                    : 'No backend address is configured. Preview mode never stores a provider password.'}
                </p>
              </div>
              <a
                className="text-link mt-4"
                href="https://www.hik-connect.com/views/login/index.html"
                target="_blank"
                rel="noreferrer"
              >
                Open official Hik-Connect
                <ExternalLink size={14} />
              </a>
            </section>
          )}
          {tab === 'storage' && (
            <section className="panel settings-panel">
              <div className="settings-section-heading">
                <HardDrive size={20} />
                <div>
                  <h2>Recording storage</h2>
                  <p>Know what is kept, and where.</p>
                </div>
              </div>
              <div className="storage-figure">
                <strong>{formatBytes(state.clips.reduce((n, c) => n + c.bytes, 0))}</strong>
                <span>{state.clips.length} local clips / browser storage</span>
              </div>
              <div className="storage-bar">
                <span
                  style={{
                    width:
                      Math.min(
                        100,
                        (state.clips.reduce((n, c) => n + c.bytes, 0) / (128 * 1024 ** 2)) * 100,
                      ) + '%',
                  }}
                />
              </div>
              <p className="muted small">
                Preview uploads are limited to 128 MB each. Browser capacity varies by device.
              </p>
              <div className="setting-row">
                <div>
                  <strong>Preferred server retention</strong>
                  <p>A preference until backend storage is connected.</p>
                </div>
                <select
                  aria-label="Retention period"
                  value={draft.retention}
                  onChange={(e) => setDraft({ ...draft, retention: Number(e.target.value) })}
                >
                  {[
                    [1, '1 day'],
                    [7, '7 days'],
                    [30, '1 month'],
                    [90, '3 months'],
                  ].map(([n, label]) => (
                    <option key={n} value={n}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="info-box">
                <Info size={17} />
                <p>
                  Local preview files remain until deleted or browser data is cleared. Server
                  retention is not active.
                </p>
              </div>
              <div className="panel-footer">
                <span>Future backend storage policy</span>
                <Button variant="primary" onClick={save}>
                  Save preference
                </Button>
              </div>
            </section>
          )}
          {tab === 'security' && (
            <section className="panel settings-panel">
              <div className="settings-section-heading">
                <ShieldCheck size={20} />
                <div>
                  <h2>Account security</h2>
                  <p>Keep workspace access in your control.</p>
                </div>
              </div>
              <div className="setting-row">
                <div>
                  <strong>Viewer password</strong>
                  <p>Your viewer account is separate from Hik-Connect.</p>
                </div>
                <Button onClick={() => setPassword(true)}>
                  <LockKeyhole size={14} />
                  Change password
                </Button>
              </div>
              <div className="setting-row">
                <div>
                  <strong>Password recovery</strong>
                  <p>Contact your platform administrator for a manual reset.</p>
                </div>
                <Badge>Administrator managed</Badge>
              </div>
              <div className="setting-row">
                <div>
                  <strong>Viewing preferences</strong>
                  <p>Reset layouts, favourites and appearance. Team, role and clips stay intact.</p>
                </div>
                <Button variant="danger" onClick={() => setReset(true)}>
                  <RotateCcw size={14} />
                  Reset preferences
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>
      <Modal
        open={connection}
        onOpenChange={setConnection}
        title="Connect your Hik-Connect account"
        description="Credentials are sent only to the configured backend and never saved in browser storage."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            setBusy(true);
            try {
              await api.connect(
                String(data.get('account')),
                String(data.get('password')),
                String(data.get('region')),
                data.get('renewal') === 'on',
              );
              toast.success(
                'Backend connection request completed. Camera integration still needs validation.',
              );
              setConnection(false);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : 'Connection failed.');
            } finally {
              form.reset();
              setBusy(false);
            }
          }}
        >
          <Field label="Hik-Connect ID or email">
            <input
              name="account"
              autoComplete="username"
              required
              placeholder="Your Hik-Connect account"
            />
          </Field>
          <Field label="Password">
            <input name="password" type="password" autoComplete="current-password" required />
          </Field>
          <Field label="Region">
            <select name="region">
              <option value="india">India</option>
              <option value="global">Global</option>
            </select>
          </Field>
          <label className="check-row">
            <input type="checkbox" name="renewal" />
            Allow encrypted reconnect credentials on the backend
          </label>
          <div className="modal-footer">
            <Button type="button" onClick={() => setConnection(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              Connect account
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={password}
        onOpenChange={setPassword}
        title="Update your viewer password"
        description="Requires a connected backend. Session revocation is enforced by the server."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            if (data.get('new') !== data.get('confirm'))
              return toast.error('The new passwords do not match.');
            setBusy(true);
            try {
              await api.changePassword(String(data.get('current')), String(data.get('new')));
              toast.success('Password updated by the backend.');
              setPassword(false);
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : 'Password could not be updated.',
              );
            } finally {
              form.reset();
              setBusy(false);
            }
          }}
        >
          <Field label="Current password">
            <input type="password" name="current" autoComplete="current-password" required />
          </Field>
          <Field label="New password">
            <input type="password" name="new" autoComplete="new-password" minLength={12} required />
          </Field>
          <Field label="Confirm new password">
            <input
              type="password"
              name="confirm"
              autoComplete="new-password"
              minLength={12}
              required
            />
          </Field>
          <div className="modal-footer">
            <Button variant="primary" type="submit" loading={busy}>
              Save password
            </Button>
          </div>
        </form>
      </Modal>
      <Confirm
        open={reset}
        onOpenChange={setReset}
        title="Reset viewing preferences?"
        description="Resets layouts, favourites and appearance. Team, preview role and recording files stay intact."
        action="Reset preferences"
        onConfirm={() => {
          patch({
            favorites: ['kpm-3', 'kpm-5'],
            layouts: [],
            settings: {
              retention: 7,
              quality: 'auto',
              fit: 'contain',
              theme: 'dark',
              rotation: 30,
              reduceMotion: false,
            },
          });
          toast.success('Viewing preferences reset.');
        }}
      />
    </div>
  );
}
