'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Pencil,
  UserX,
  UserCheck,
  LockKeyhole,
  Cctv,
} from 'lucide-react';
import { useWorkspace } from './workspace-provider';
import { PageHeading, Button, Modal, Confirm, Field, SearchInput, Badge, Empty } from './ui';
import { recorders, type Member } from '@/lib/model';

export function Team() {
  const { state, patch, log } = useWorkspace();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Member | null>(null);
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [assigned, setAssigned] = useState<string[]>([]);
  const [canRecord, setCanRecord] = useState(false);
  const [canDownload, setCanDownload] = useState(false);
  if (state.role === 'member')
    return (
      <Empty
        icon={<LockKeyhole size={30} />}
        title="This view belongs to administrators."
        description="Team access is managed by your workspace administrator."
      />
    );
  function edit(member: Member | null) {
    setEditing(member);
    setAssigned(member?.recorders || []);
    setCanRecord(member?.canRecord || false);
    setCanDownload(member?.canDownload || false);
    setOpen(true);
  }
  const list = state.members.filter((m) =>
    (m.name + m.email).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div>
      <PageHeading
        eyebrow="SECURITY PERSONNEL ACCESS"
        title="Your team, connected."
        description="Manage access and camera permissions for security operators and administrators across campus."
      >
        <Button variant="primary" onClick={() => edit(null)}>
          <UserPlus size={16} />
          Add team member
        </Button>
      </PageHeading>
      <div className="stats-grid three-stats">
        <div className="mini-stat">
          <Users size={20} />
          <div>
            <strong>{state.members.length}</strong>
            <span>Team members</span>
          </div>
        </div>
        <div className="mini-stat">
          <UserCheck size={20} />
          <div>
            <strong>{state.members.filter((m) => m.active).length}</strong>
            <span>Active personnel</span>
          </div>
        </div>
        <div className="mini-stat">
          <ShieldCheck size={20} />
          <div>
            <strong>{state.members.filter((m) => m.role === 'admin').length}</strong>
            <span>Administrators</span>
          </div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-toolbar">
          <SearchInput value={query} onChange={setQuery} placeholder="Find a team member" />
          <Badge>Role-based access</Badge>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Team member</th>
                <th>Role</th>
                <th>Recorder access</th>
                <th>Status</th>
                <th className="text-right">Manage</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="person-cell">
                      <span className="avatar">
                        {m.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </span>
                      <div>
                        <strong>{m.name}</strong>
                        <small>{m.email}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="role-tag">
                      {m.role === 'admin' ? <ShieldCheck size={13} /> : <Users size={13} />}{' '}
                      {m.role === 'admin' ? 'Admin' : 'Member'}
                    </span>
                  </td>
                  <td>
                    <span className="access-summary">
                      <Cctv size={14} />
                      {m.recorders.length} recorders
                    </span>
                    <small className="table-subtext">
                      {m.canRecord ? 'Record enabled' : 'View only'}
                      {m.canDownload ? ' / Download enabled' : ''}
                    </small>
                  </td>
                  <td>
                    <Badge tone={m.active ? 'green' : 'neutral'}>
                      {m.active ? 'Active' : 'Suspended'}
                    </Badge>
                  </td>
                  <td>
                    <div className="table-actions">
                      <Button variant="ghost" onClick={() => edit(m)} aria-label={`Edit ${m.name}`}>
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setRemoving(m)}
                        aria-label={`${m.active ? 'Suspend' : 'Restore'} ${m.name}`}
                      >
                        {m.active ? <UserX size={15} /> : <UserCheck size={15} />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!list.length && (
            <Empty
              icon={<Users size={25} />}
              title="No matching team members."
              description="Try another name or email address."
            />
          )}
        </div>
      </div>
      <p className="workspace-footnote">
        Local preview entries only. No real login accounts or invitations are created.
      </p>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit preview member' : 'Bring someone into the view'}
        description="Changes apply only to this browser preview."
      >
        <form
          key={editing?.id || 'new'}
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            const email = String(data.get('email')).trim().toLowerCase();
            if (state.members.some((m) => m.email === email && m.id !== editing?.id))
              return toast.error('This email is already in the preview team.');
            const member: Member = {
              id: editing?.id || crypto.randomUUID(),
              name: String(data.get('name')).trim(),
              email,
              role: editing?.role || 'member',
              active: editing?.active ?? true,
              recorders: assigned,
              canRecord,
              canDownload,
            };
            patch({
              members: editing
                ? state.members.map((m) => (m.id === editing.id ? member : m))
                : [...state.members, member],
            });
            log(
              editing ? 'Preview permissions updated' : 'Preview member added',
              member.name,
              'access',
            );
            toast.success('Preview member saved.');
            setOpen(false);
          }}
        >
          <div className="form-row">
            <Field label="Full name">
              <input
                name="name"
                defaultValue={editing?.name}
                required
                maxLength={80}
                placeholder="Taylor Smith"
              />
            </Field>
            <Field label="Email address">
              <input
                name="email"
                type="email"
                defaultValue={editing?.email}
                required
                placeholder="taylor@example.test"
              />
            </Field>
          </div>
          <p className="form-section-title">RECORDER ACCESS</p>
          <div className="permission-recorders">
            {recorders.map((r) => (
              <label key={r.id}>
                <input
                  type="checkbox"
                  checked={assigned.includes(r.id)}
                  onChange={(e) =>
                    setAssigned((a) =>
                      e.target.checked ? [...a, r.id] : a.filter((id) => id !== r.id),
                    )
                  }
                />
                <span>
                  {r.name}
                  <small>{r.location}</small>
                </span>
                <Cctv size={15} />
              </label>
            ))}
          </div>
          <p className="form-section-title">ADDITIONAL PERMISSIONS</p>
          <label className="check-row">
            <input
              type="checkbox"
              checked={canRecord}
              onChange={(e) => setCanRecord(e.target.checked)}
            />
            Create recordings
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={canDownload}
              onChange={(e) => setCanDownload(e.target.checked)}
            />
            Download recordings
          </label>
          <div className="modal-footer">
            <Button type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save preview member
            </Button>
          </div>
        </form>
      </Modal>
      <Confirm
        open={!!removing}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title={`${removing?.active ? 'Suspend' : 'Restore'} ${removing?.name || 'member'}?`}
        description="Update this team member's active access status in the system."
        action={removing?.active ? 'Suspend member' : 'Restore member'}
        danger={!!removing?.active}
        onConfirm={() => {
          if (!removing) return;
          patch({
            members: state.members.map((m) =>
              m.id === removing.id ? { ...m, active: !m.active } : m,
            ),
          });
          log(
            removing.active ? 'Team member suspended' : 'Team member restored',
            removing.name,
            'access',
          );
          toast.success('Team member status updated.');
          setRemoving(null);
        }}
      />
    </div>
  );
}
