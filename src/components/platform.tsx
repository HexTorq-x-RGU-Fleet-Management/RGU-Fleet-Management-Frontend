'use client';
import { useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw, Activity, HardDrive } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeading, Button, Confirm, Modal, Field, Badge } from './ui';
import { useWorkspace } from './workspace-provider';
import { request } from '@/lib/api';
import { formatBytes } from '@/lib/model';
export function Platform() {
  const { user } = useWorkspace(),
    [workspaces, setWorkspaces] = useState<any[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [decision, setDecision] = useState<any>(null),
    [members, setMembers] = useState<any[] | null>(null),
    [reset, setReset] = useState<any>(null),
    [busy, setBusy] = useState(false);
  async function load() {
    setLoading(true);
    try {
      setWorkspaces((await request('/api/platform/workspaces')).workspaces);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (user?.role === 'superadmin') void load();
  }, [user?.id]);
  if (user?.role !== 'superadmin')
    return (
      <div className="fleet-no-data">
        <ShieldCheck size={30} />
        <h2>Platform owner access required.</h2>
      </div>
    );
  return (
    <div>
      <PageHeading
        eyebrow="PLATFORM ADMINISTRATION"
        title="Workspace approvals"
        description="Approve admin requests and manage workspace access."
      >
        <Button loading={loading} onClick={() => void load()}>
          <RefreshCw size={15} />
          Refresh
        </Button>
      </PageHeading>
      {error && <p role="alert">{error}</p>}
      <div className="panel table-scroll">
        <table>
          <thead>
            <tr>
              <th>Workspace</th>
              <th>Administrator</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {workspaces.map((w) => (
              <tr key={w.id}>
                <td>{w.workspaceName}</td>
                <td>
                  <strong>{w.fullName}</strong>
                  <small className="table-subtext">{w.email}</small>
                </td>
                <td>
                  <Badge tone={w.status === 'active' ? 'green' : 'amber'}>{w.status}</Badge>
                </td>
                <td>
                  <div className="control-actions">
                    {(w.status === 'pending'
                      ? ['approve', 'reject']
                      : w.status === 'active'
                        ? ['suspend']
                        : w.status === 'suspended'
                          ? ['restore']
                          : []
                    ).map((action) => (
                      <Button key={action} onClick={() => setDecision({ id: w.id, action })}>
                        {action[0].toUpperCase() + action.slice(1)}
                      </Button>
                    ))}
                    <Button
                      onClick={() =>
                        void request('/api/platform/workspaces/' + w.tenantId + '/users')
                          .then((d) => setMembers(d.users))
                          .catch((e) => toast.error(e.message))
                      }
                    >
                      Manage users
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p role="status">Loading workspaces…</p>}
        {!loading && !workspaces.length && (
          <div className="fleet-no-data">
            <h3>No workspace requests yet</h3>
            <p>Admins can request access from the sign-in page.</p>
          </div>
        )}
      </div>
      <Confirm
        open={!!decision}
        onOpenChange={(v) => !v && setDecision(null)}
        title={(decision?.action || 'Update') + ' workspace?'}
        description="This changes the workspace’s access on the server."
        action={(decision?.action || 'Update') + ' workspace'}
        danger={decision?.action === 'suspend' || decision?.action === 'reject'}
        onConfirm={async () => {
          try {
            await request('/api/platform/requests/' + decision.id + '/' + decision.action, {});
            setDecision(null);
            await load();
            toast.success('Workspace updated.');
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />
      <Modal
        open={members !== null}
        onOpenChange={(v) => !v && setMembers(null)}
        title="Workspace users"
        description="Set a temporary password when a user contacts you for access recovery."
      >
        {members?.map((m) => (
          <div className="setting-row" key={m.id}>
            <div>
              <strong>{m.fullName}</strong>
              <p>
                {m.email} · {m.role} · {m.status}
              </p>
            </div>
            <Button onClick={() => setReset(m)}>Reset password</Button>
          </div>
        ))}
      </Modal>
      <Modal
        open={!!reset}
        onOpenChange={(v) => !v && setReset(null)}
        title="Set temporary password"
        description="All existing sessions are revoked. The user must change this password after signing in."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget,
              password = String(new FormData(form).get('password'));
            setBusy(true);
            try {
              await request('/api/platform/users/' + reset.id + '/password', { password });
              setReset(null);
              toast.success('Temporary password set.');
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              form.reset();
              setBusy(false);
            }
          }}
        >
          <Field label="Temporary password">
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              minLength={12}
              required
            />
          </Field>
          <Button type="submit" loading={busy}>
            Set password
          </Button>
        </form>
      </Modal>
    </div>
  );
}
export function Health() {
  const { user } = useWorkspace(),
    [data, setData] = useState<any>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try {
      setData(await request('/api/platform/health?fresh=1'));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (user?.role === 'superadmin') void load();
  }, [user?.id]);
  if (user?.role !== 'superadmin')
    return (
      <div className="fleet-no-data">
        <h2>Platform owner access required.</h2>
      </div>
    );
  return (
    <div>
      <PageHeading
        eyebrow="PLATFORM MONITORING"
        title="System health"
        description="Actual backend health and persisted alerts."
      >
        <Button loading={loading} onClick={() => void load()}>
          <RefreshCw size={15} />
          Refresh health
        </Button>
      </PageHeading>
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <p>Live streams</p>
              <div className="stat-value">{data.metrics.liveStreams}</div>
            </div>
            <div className="stat-card">
              <p>Backend memory</p>
              <div className="stat-value">{formatBytes(data.metrics.nodeRssBytes)}</div>
            </div>
            <div className="stat-card">
              <p>Free disk</p>
              <div className="stat-value">
                {data.metrics.freeDiskBytes === null
                  ? 'Unavailable'
                  : formatBytes(data.metrics.freeDiskBytes)}
              </div>
            </div>
            <div className="stat-card">
              <p>Active alerts</p>
              <div className="stat-value">{data.counts.active}</div>
            </div>
          </div>
          <div className="panel">
            {data.alerts.map((a: any) => (
              <div className="health-alert" key={a.id}>
                <Activity size={20} />
                <div>
                  <strong>{a.title}</strong>
                  <p>
                    {a.workspace}
                    {a.recorder ? ' · ' + a.recorder : ''} · {a.observations} observations
                  </p>
                  <p className="small muted">Last seen {new Date(a.lastSeen).toLocaleString()}</p>
                </div>
                <Button
                  disabled={!!a.acknowledgedAt}
                  onClick={() =>
                    void request('/api/platform/health/' + a.id + '/acknowledge', {})
                      .then(load)
                      .catch((e) => toast.error(e.message))
                  }
                >
                  Acknowledge
                </Button>
                {a.kind === 'server' && (
                  <Button
                    onClick={() =>
                      void request('/api/platform/health/' + a.id + '/resolve', {})
                        .then(load)
                        .catch((e) => toast.error(e.message))
                    }
                  >
                    Resolve
                  </Button>
                )}
              </div>
            ))}
            {!data.alerts.length && (
              <div className="fleet-no-data">
                <h3>No active alerts</h3>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
