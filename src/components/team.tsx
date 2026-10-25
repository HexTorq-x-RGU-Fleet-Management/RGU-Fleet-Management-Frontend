'use client';
import { useState, useEffect } from 'react';
import { Users, UserPlus, Pencil, UserX, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeading, Button, Modal, Field, Confirm, Badge } from './ui';
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
    [error, setError] = useState('');
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
      <div className="fleet-no-data">
        <h2>Workspace administrator access required.</h2>
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
  return (
    <div>
      <PageHeading
        eyebrow="FLEET TEAM ACCESS"
        title="Your team, connected."
        description="Members can access only the recorders and channels you grant."
      >
        <Button variant="primary" onClick={() => edit(null)}>
          <UserPlus size={15} />
          Add team member
        </Button>
      </PageHeading>
      {error && <p role="alert">{error}</p>}
      <div className="panel table-scroll">
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th>Status</th>
              <th>Recorders</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((m: any) => (
              <tr key={m.id}>
                <td>
                  <strong>{m.fullName}</strong>
                  <small className="table-subtext">{m.email}</small>
                </td>
                <td>
                  <Badge tone={m.status === 'active' ? 'green' : 'neutral'}>{m.status}</Badge>
                </td>
                <td>{m.grants.filter((g: Grant) => g.view).length}</td>
                <td>
                  <div className="control-actions">
                    <Button aria-label={'Edit ' + m.fullName} onClick={() => edit(m)}>
                      <Pencil size={14} />
                      Edit permissions
                    </Button>
                    <Button
                      aria-label={(m.status === 'active' ? 'Suspend ' : 'Restore ') + m.fullName}
                      onClick={() => setConfirm(m)}
                    >
                      {m.status === 'active' ? <UserX size={14} /> : <UserCheck size={14} />}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p role="status">Loading team…</p>}
        {!loading && !data.users.length && (
          <div className="fleet-no-data">
            <Users size={28} />
            <h3>No members yet</h3>
          </div>
        )}
      </div>
      <Modal
        open={editing !== undefined}
        onOpenChange={(v) => !v && setEditing(undefined)}
        title={editing ? 'Edit member access' : 'Add team member'}
        description="Temporary passwords require a change at first login. Permission changes revoke existing member sessions."
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
          {data.devices.map((device: any) => {
            const g = grants.find((g) => g.deviceId === device.id);
            return (
              <fieldset className="panel p-6" key={device.id}>
                <legend>{device.name}</legend>
                <label className="setting-row">
                  <span>View recorder</span>
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
                  <span>Record clips</span>
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
                  <div className="control-actions">
                    {device.channels.map((c: any) => (
                      <label key={c.number}>
                        <input
                          type="checkbox"
                          checked={g.channels?.includes(c.number) ?? false}
                          onChange={(e) =>
                            grant(device.id, {
                              channels: e.target.checked
                                ? [...(g.channels ?? []), c.number]
                                : (g.channels ?? []).filter((n) => n !== c.number),
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
          <div className="modal-footer">
            <Button type="button" onClick={() => setEditing(undefined)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy} variant="primary">
              Save member
            </Button>
          </div>
        </form>
      </Modal>
      <Confirm
        open={!!confirm}
        onOpenChange={(v) => !v && setConfirm(null)}
        title={
          (confirm?.status === 'active' ? 'Suspend ' : 'Restore ') +
          (confirm?.fullName || 'member') +
          '?'
        }
        description="The server applies the status change and revokes existing sessions."
        action={confirm?.status === 'active' ? 'Suspend member' : 'Restore member'}
        onConfirm={async () => {
          try {
            await request('/api/team/' + confirm.id, {
              status: confirm.status === 'active' ? 'suspended' : 'active',
            });
            setConfirm(null);
            await load();
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />
    </div>
  );
}
