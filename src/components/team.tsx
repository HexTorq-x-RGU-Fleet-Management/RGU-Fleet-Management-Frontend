'use client';

import { useEffect, useMemo, useState } from 'react';
import { Cctv, HardDrive, Pencil, RefreshCw, ShieldCheck, UserCheck, UserPlus, Users, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Confirm, Field, Modal, PageHeading, SearchInput } from './ui';
import { useWorkspace } from './workspace-provider';
import { request } from '@/lib/api';

type Grant = { deviceId: string; channels: number[] | null; view: boolean; record: boolean; download: boolean };

export function Team() {
  const { user } = useWorkspace();
  const [data, setData] = useState<any>({ users: [], devices: [] });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(undefined);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<any>(null);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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
  }, [user?.id, user?.role]);

  if (user?.role !== 'admin') {
    return <div className="fleet-no-data" style={{ padding: 48 }}><ShieldCheck size={36} /><h2>Workspace administrator access required.</h2><p>Team credentials and channel permissions are restricted to verified workspace administrators.</p></div>;
  }

  function edit(member: any) {
    setEditing(member);
    setGrants(member?.grants ?? []);
  }

  function grant(deviceId: string, change: Partial<Grant>) {
    setGrants((values) => {
      const old = values.find((item) => item.deviceId === deviceId) ?? { deviceId, channels: null, view: false, record: false, download: false };
      return [...values.filter((item) => item.deviceId !== deviceId), { ...old, ...change }];
    });
  }

  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return data.users;
    return data.users.filter((member: any) => [member.fullName, member.email, member.role].some((value) => value?.toLowerCase().includes(query)));
  }, [data.users, searchQuery]);

  const activeCount = data.users.filter((member: any) => member.status === 'active').length;
  const suspendedCount = data.users.filter((member: any) => member.status !== 'active').length;

  return (
    <div className="neotrack-team-directory">
      <PageHeading eyebrow="WORKSPACE" title="Users" description="Manage approved members, roles and recorder permissions for this workspace.">
        <Button onClick={() => void load()} disabled={loading} aria-label="Refresh team members"><RefreshCw size={15} />Refresh</Button>
        <Button variant="primary" onClick={() => edit(null)}><UserPlus size={15} />Add user</Button>
      </PageHeading>

      {error && <p role="alert">{error}</p>}

      <section className="team-summary" aria-label="Team summary">
        <div><Users size={17} /><span>Total users</span><strong>{data.users.length}</strong></div>
        <div><ShieldCheck size={17} /><span>Active</span><strong>{activeCount}</strong></div>
        <div><UserX size={17} /><span>Suspended</span><strong>{suspendedCount}</strong></div>
        <div><HardDrive size={17} /><span>Recorders</span><strong>{data.devices.length}</strong></div>
      </section>

      <section className="neotrack-team-table" aria-label="Workspace users">
        <div className="neotrack-team-table-heading">
          <div><h2>Workspace users</h2><p>Members with direct access to your fleet operations workspace.</p></div>
          <span>{filteredUsers.length} of {data.users.length} users</span>
        </div>
        <div className="neotrack-team-controls"><SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search users by name, email or role" /></div>
        <div className="neotrack-team-table-scroll">
          <table>
            <thead><tr><th>User</th><th>Role</th><th>Recorder access</th><th>Status</th><th aria-label="Actions" /></tr></thead>
            <tbody>{filteredUsers.map((member: any) => {
              const initials = (member.fullName || 'U').split(' ').map((name: string) => name[0]).slice(0, 2).join('').toUpperCase();
              const viewCount = member.grants.filter((item: Grant) => item.view).length;
              return <tr key={member.id}>
                <td><div className="team-user-cell"><span>{initials}</span><div><strong>{member.fullName}</strong><small>{member.email}</small></div></div></td>
                <td><span className="team-role">{member.role === 'admin' ? 'Administrator' : 'Viewer'}</span></td>
                <td><span className="team-recorder-access"><Cctv size={13} />{viewCount} {viewCount === 1 ? 'recorder' : 'recorders'}</span></td>
                <td><span className={`team-status ${member.status === 'active' ? 'active' : 'suspended'}`}><i />{member.status}</span></td>
                <td><div className="team-actions">
                  <Button aria-label={'Edit ' + member.fullName} onClick={() => edit(member)}><Pencil size={14} />Edit</Button>
                  <Button aria-label={(member.status === 'active' ? 'Suspend ' : 'Restore ') + member.fullName} variant="secondary" onClick={() => setConfirm(member)}>{member.status === 'active' ? <UserX size={14} /> : <UserCheck size={14} />}{member.status === 'active' ? 'Suspend' : 'Restore'}</Button>
                </div></td>
              </tr>;
            })}</tbody>
          </table>
          {!loading && !filteredUsers.length && <div className="fleet-no-data team-empty"><Users size={32} /><h3>No users found</h3><p>{searchQuery ? `No members match "${searchQuery}".` : 'Add a user to grant workspace access.'}</p></div>}
        </div>
      </section>

      <Modal open={editing !== undefined} onOpenChange={(value) => !value && setEditing(undefined)} title={editing ? 'Edit user permissions' : 'Add workspace user'} description="Temporary passwords require a change at first login. Changes revoke existing member sessions." wide>
        <form onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const values = new FormData(form);
          setBusy(true);
          try {
            let id = editing?.id;
            if (!id) id = (await request('/api/team', { fullName: String(values.get('name')), email: String(values.get('email')), password: String(values.get('password')) })).id;
            await request('/api/team/' + id, { grants: grants.filter((item) => item.view), ...(editing && values.get('password') ? { password: String(values.get('password')) } : {}) });
            setEditing(undefined);
            await load();
            toast.success('User access saved.');
          } catch (e) {
            toast.error((e as Error).message);
            await load();
          } finally {
            const password = form.elements.namedItem('password') as HTMLInputElement | null;
            if (password) password.value = '';
            setBusy(false);
          }
        }}>
          <div className="fleet-form-grid">
            <Field label="Full name"><input name="name" defaultValue={editing?.fullName ?? ''} disabled={!!editing} required /></Field>
            <Field label="Email address"><input name="email" type="email" defaultValue={editing?.email ?? ''} disabled={!!editing} required /></Field>
            <Field label={editing ? 'New temporary password (optional)' : 'Temporary password'}><input name="password" type="password" autoComplete="new-password" minLength={12} required={!editing} /></Field>
          </div>
          <div className="team-grant-editor">
            <strong>Recorder permissions</strong><p>Grant live access first, then choose recording, downloads and channel scope.</p>
            {data.devices.map((device: any) => {
              const current = grants.find((item) => item.deviceId === device.id);
              return <fieldset key={device.id}><legend>{device.name}</legend>
                <label><span>View recorder streams</span><input type="checkbox" checked={!!current?.view} onChange={(event) => grant(device.id, { view: event.target.checked, ...(!event.target.checked ? { record: false, download: false } : {}) })} /></label>
                <label><span>Record surveillance clips</span><input type="checkbox" disabled={!current?.view} checked={!!current?.record} onChange={(event) => grant(device.id, { record: event.target.checked })} /></label>
                <label><span>Download clips and snapshots</span><input type="checkbox" disabled={!current?.view} checked={!!current?.download} onChange={(event) => grant(device.id, { download: event.target.checked })} /></label>
                <Field label={'Channels for ' + device.name}><select disabled={!current?.view} value={current?.channels === null || !current ? 'all' : 'selected'} onChange={(event) => grant(device.id, { channels: event.target.value === 'all' ? null : [] })}><option value="all">All channels</option><option value="selected">Selected channels</option></select></Field>
                {current?.view && current.channels !== null && <div className="team-channel-list">{device.channels.map((channel: any) => <label key={channel.number}><input type="checkbox" checked={current.channels?.includes(channel.number) ?? false} onChange={(event) => grant(device.id, { channels: event.target.checked ? [...(current.channels ?? []), channel.number] : (current.channels ?? []).filter((number: number) => number !== channel.number) })} />{channel.name || 'Camera ' + channel.number}</label>)}</div>}
              </fieldset>;
            })}
          </div>
          <div className="modal-footer"><Button type="button" onClick={() => setEditing(undefined)}>Cancel</Button><Button type="submit" loading={busy} variant="primary">Save user access</Button></div>
        </form>
      </Modal>

      <Confirm open={!!confirm} onOpenChange={(value) => !value && setConfirm(null)} title={(confirm?.status === 'active' ? 'Suspend ' : 'Restore ') + (confirm?.fullName || 'user') + '?'} description="The server applies the status change and immediately revokes active viewing sessions." action={confirm?.status === 'active' ? 'Suspend user' : 'Restore user'} danger={confirm?.status === 'active'} onConfirm={async () => {
        try {
          await request('/api/team/' + confirm.id, { status: confirm.status === 'active' ? 'suspended' : 'active' });
          setConfirm(null);
          await load();
          toast.success((confirm.status === 'active' ? 'Suspended ' : 'Restored ') + confirm.fullName);
        } catch (e) { toast.error((e as Error).message); }
      }} />
    </div>
  );
}
