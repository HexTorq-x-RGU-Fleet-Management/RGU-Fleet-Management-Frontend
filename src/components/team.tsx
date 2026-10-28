'use client';
import { useState, useEffect, useMemo } from 'react';
import { Users, UserPlus, Pencil, UserX, UserCheck, ShieldCheck, HardDrive, Cctv, Search } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeading, Button, Modal, Field, Confirm, Badge, SearchInput } from './ui';
import { useWorkspace } from './workspace-provider';
import { request } from '@/lib/api';

type Grant = {
  deviceId: string;
  channels: number[] | null;
  view: boolean;
  record: boolean;
  download: boolean;
};

export function Team() {
  const { user } = useWorkspace(),
    [data, setData] = useState<any>({ users: [], devices: [] }),
    [loading, setLoading] = useState(true),
    [editing, setEditing] = useState<any>(undefined),
    [grants, setGrants] = useState<Grant[]>([]),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState<any>(null),
    [error, setError] = useState(''),
    [searchQuery, setSearchQuery] = useState('');

  async function load() {
    setLoading(true);
    try {
      setData(await request('/api/team'));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') void load();
  }, [user?.id]);

  if (user?.role !== 'admin')
    return (
      <div className="fleet-no-data" style={{ padding: 48 }}>
        <ShieldCheck size={36} />
        <h2>Workspace administrator access required.</h2>
        <p>Team credentials and channel permissions are restricted to verified workspace administrators.</p>
      </div>
    );

  function edit(member: any) {
    setEditing(member);
    setGrants(member?.grants ?? []);
  }

  function grant(deviceId: string, change: Partial<Grant>) {
    setGrants((values) => {
      const old = values.find((g) => g.deviceId === deviceId) ?? {
        deviceId,
        channels: null,
        view: false,
        record: false,
        download: false,
      };
      return [...values.filter((g) => g.deviceId !== deviceId), { ...old, ...change }];
    });
  }

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return data.users;
    return data.users.filter(
      (m: any) =>
        m.fullName?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.role?.toLowerCase().includes(q),
    );
  }, [data.users, searchQuery]);

  const activeCount = data.users.filter((m: any) => m.status === 'active').length;

  return (
    <div className="admin-command-deck">
      <PageHeading
        eyebrow="FLEET TEAM & OPERATOR ACCESS"
        title="Team credentials & channel grants"
        description="RTO transport operator clearances and granular channel surveillance permissions."
      >
        <Button variant="primary" onClick={() => edit(null)}>
          <UserPlus size={15} />
          Add team member
        </Button>
      </PageHeading>

      {error && <p role="alert">{error}</p>}

      {/* Team Bento Stats */}
      <div className="admin-bento-grid">
        <div className="admin-metric-card accent-purple">
          <div className="admin-metric-top">
            <span>Registered Members</span>
            <div className="admin-metric-icon">
              <Users size={18} />
            </div>
          </div>
          <div className="admin-metric-value">{data.users.length}</div>
          <div className="admin-metric-subtext">
            <span>Authorized staff accounts</span>
          </div>
        </div>

        <div className="admin-metric-card accent-green">
          <div className="admin-metric-top">
            <span>Active Operators</span>
            <div className="admin-metric-icon">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="admin-metric-value" style={{ color: '#a5cb3a' }}>
            {activeCount}
          </div>
          <div className="admin-metric-subtext">
            <span>Permitted active logins</span>
          </div>
        </div>

        <div className="admin-metric-card accent-blue">
          <div className="admin-metric-top">
            <span>Connected Hardware</span>
            <div className="admin-metric-icon">
              <HardDrive size={18} />
            </div>
          </div>
          <div className="admin-metric-value">{data.devices.length}</div>
          <div className="admin-metric-subtext">
            <span>Hik-Connect NVRs in workspace</span>
          </div>
        </div>

        <div className="admin-metric-card accent-amber">
          <div className="admin-metric-top">
            <span>Compliance Mode</span>
            <div className="admin-metric-icon">
              <Cctv size={18} />
            </div>
          </div>
          <div className="admin-metric-value" style={{ fontSize: 20 }}>
            Role-Gated
          </div>
          <div className="admin-metric-subtext">
            <span>Zero unauthorized viewing</span>
          </div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="admin-toolbar-deck">
        <div style={{ minWidth: 280 }}>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search operators by name or email…"
          />
        </div>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>
          Showing {filteredUsers.length} of {data.users.length} team members
        </span>
      </div>

      {/* Glass Data Cards for Team Members */}
      <>
      <div className="admin-card-container">
        {filteredUsers.map((m: any) => {
          const initials = (m.fullName || 'U')
            .split(' ')
            .map((n: string) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

          const viewCount = m.grants.filter((g: Grant) => g.view).length;

          return (
            <div className="admin-workspace-card" key={m.id}>
              <div className="admin-workspace-info">
                <div className="admin-avatar-ring">{initials}</div>
                <div className="admin-workspace-text">
                  <strong>{m.fullName}</strong>
                  <span>
                    {m.email} · {m.role === 'admin' ? 'Administrator' : 'Viewer'}
                  </span>
                </div>
              </div>

              <div className="admin-workspace-status">
                <span className={`status-indicator-pill ${m.status === 'active' ? 'active' : 'suspended'}`}>
                  <span
                    className="beacon-pulse"
                    style={{
                      width: 6,
                      height: 6,
                      background: m.status === 'active' ? '#a5cb3a' : '#f87171',
                      boxShadow: 'none',
                    }}
                  />
                  {m.status}
                </span>

                <span className="hud-pill info">
                  <Cctv size={12} />
                  {viewCount} {viewCount === 1 ? 'recorder' : 'recorders'} granted
                </span>
              </div>

              <div className="admin-action-bar">
                <Button aria-label={'Edit ' + m.fullName} onClick={() => edit(m)}>
                  <Pencil size={14} />
                  Edit permissions
                </Button>
                <Button
                  aria-label={(m.status === 'active' ? 'Suspend ' : 'Restore ') + m.fullName}
                  variant="secondary"
                  onClick={() => setConfirm(m)}
                >
                  {m.status === 'active' ? <UserX size={14} /> : <UserCheck size={14} />}
                  {m.status === 'active' ? 'Suspend' : 'Restore'}
                </Button>
              </div>
            </div>
          );
        })}

        {!loading && !filteredUsers.length && (
          <div className="fleet-no-data" style={{ padding: 48 }}>
            <Users size={32} />
            <h3>No team members found</h3>
            <p>
              {searchQuery
                ? `No members match "${searchQuery}". Clear your search.`
                : 'Click "Add team member" above to grant operator access.'}
            </p>
          </div>
        )}
      </div>
      </>

      {/* Edit / Add Member Modal */}
      <Modal
        open={editing !== undefined}
        onOpenChange={(v) => !v && setEditing(undefined)}
        title={editing ? 'Edit member permissions' : 'Add new team member'}
        description="Temporary passwords require a change at first login. Changes revoke existing member sessions."
        wide
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget,
              d = new FormData(form);
            setBusy(true);
            try {
              let id = editing?.id;
              if (!id) {
                id = (
                  await request('/api/team', {
                    fullName: String(d.get('name')),
                    email: String(d.get('email')),
                    password: String(d.get('password')),
                  })
                ).id;
              }
              await request('/api/team/' + id, {
                grants: grants.filter((g) => g.view),
                ...(editing && d.get('password') ? { password: String(d.get('password')) } : {}),
              });
              setEditing(undefined);
              await load();
              toast.success('Member access saved.');
            } catch (e) {
              toast.error((e as Error).message);
              await load();
            } finally {
              const p = form.elements.namedItem('password') as HTMLInputElement | null;
              if (p) p.value = '';
              setBusy(false);
            }
          }}
        >
          <div className="fleet-form-grid">
            <Field label="Full name">
              <input
                name="name"
                defaultValue={editing?.fullName ?? ''}
                disabled={!!editing}
                required
              />
            </Field>
            <Field label="Email address">
              <input
                name="email"
                type="email"
                defaultValue={editing?.email ?? ''}
                disabled={!!editing}
                required
              />
            </Field>
            <Field label={editing ? 'New temporary password (optional)' : 'Temporary password'}>
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                required={!editing}
              />
            </Field>
          </div>

          <div style={{ marginTop: 18 }}>
            <strong style={{ fontSize: 14, color: '#f8fafc', display: 'block', marginBottom: 12 }}>
              Channel Surveillance Grants by Recorder
            </strong>
            {data.devices.map((device: any) => {
              const g = grants.find((g) => g.deviceId === device.id);
              return (
                <fieldset
                  className="panel p-6"
                  key={device.id}
                  style={{
                    marginBottom: 12,
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <legend style={{ color: '#38bdf8', fontWeight: 600 }}>{device.name}</legend>
                  <label className="setting-row">
                    <span>View recorder streams</span>
                    <input
                      type="checkbox"
                      checked={!!g?.view}
                      onChange={(e) =>
                        grant(device.id, {
                          view: e.target.checked,
                          ...(!e.target.checked ? { record: false, download: false } : {}),
                        })
                      }
                    />
                  </label>
                  <label className="setting-row">
                    <span>Record surveillance clips</span>
                    <input
                      type="checkbox"
                      disabled={!g?.view}
                      checked={!!g?.record}
                      onChange={(e) => grant(device.id, { record: e.target.checked })}
                    />
                  </label>
                  <label className="setting-row">
                    <span>Download clips and snapshots</span>
                    <input
                      type="checkbox"
                      disabled={!g?.view}
                      checked={!!g?.download}
                      onChange={(e) => grant(device.id, { download: e.target.checked })}
                    />
                  </label>
                  <Field label={'Channels for ' + device.name}>
                    <select
                      disabled={!g?.view}
                      value={g?.channels === null || !g ? 'all' : 'selected'}
                      onChange={(e) =>
                        grant(device.id, { channels: e.target.value === 'all' ? null : [] })
                      }
                    >
                      <option value="all">All channels</option>
                      <option value="selected">Selected channels</option>
                    </select>
                  </Field>
                  {g?.view && g.channels !== null && (
                    <div className="control-actions" style={{ marginTop: 8 }}>
                      {device.channels.map((c: any) => (
                        <label key={c.number} style={{ fontSize: 12, color: '#cbd5e1' }}>
                          <input
                            type="checkbox"
                            checked={g.channels?.includes(c.number) ?? false}
                            onChange={(e) =>
                              grant(device.id, {
                                channels: e.target.checked
                                  ? [...(g.channels ?? []), c.number]
                                  : (g.channels ?? []).filter((n: number) => n !== c.number),
                              })
                            }
                          />
                          {c.name || 'Camera ' + c.number}
                        </label>
                      ))}
                    </div>
                  )}
                </fieldset>
              );
            })}
          </div>

          <div className="modal-footer" style={{ marginTop: 20 }}>
            <Button type="button" onClick={() => setEditing(undefined)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy} variant="primary">
              Save Member Access
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Suspend/Restore Modal */}
      <Confirm
        open={!!confirm}
        onOpenChange={(v) => !v && setConfirm(null)}
        title={
          (confirm?.status === 'active' ? 'Suspend ' : 'Restore ') +
          (confirm?.fullName || 'member') +
          '?'
        }
        description="The server applies the status change and immediately revokes active viewing sessions."
        action={confirm?.status === 'active' ? 'Suspend member' : 'Restore member'}
        danger={confirm?.status === 'active'}
        onConfirm={async () => {
          try {
            await request('/api/team/' + confirm.id, {
              status: confirm.status === 'active' ? 'suspended' : 'active',
            });
            setConfirm(null);
            await load();
            toast.success(
              (confirm.status === 'active' ? 'Suspended ' : 'Restored ') + confirm.fullName,
            );
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />
    </div>
  );
}
