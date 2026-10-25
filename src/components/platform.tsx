'use client';
import { useState } from 'react';
import {
  ShieldCheck,
  Check,
  X,
  Building2,
  LockKeyhole,
  Activity,
  TriangleAlert,
  Server,
  HardDrive,
  CheckCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from './workspace-provider';
import { PageHeading, Button, Confirm, Badge, Empty } from './ui';
const requests = [
  {
    id: 'north',
    name: 'North Campus Transport',
    owner: 'Sam Rivera',
    email: 'sam@example.test',
    requested: 'Example request',
  },
  {
    id: 'east',
    name: 'East Campus Operations',
    owner: 'Casey Chen',
    email: 'casey@example.test',
    requested: 'Example request',
  },
];
export function Platform() {
  const { state, patch, log } = useWorkspace();
  const [confirm, setConfirm] = useState<{ id: string; approve: boolean } | null>(null);
  if (state.role !== 'superadmin')
    return (
      <Empty
        icon={<LockKeyhole size={30} />}
        title="Platform owner access required."
        description="Workspace approvals are available only to the superadmin. Change the preview role in the profile menu to explore this screen."
      />
    );
  return (
    <div>
      <PageHeading
        eyebrow="PLATFORM ADMINISTRATION"
        title="Good teams start here."
        description="Review sample workspace requests before granting access."
      />
      <div className="panel">
        <div className="section-heading p-6">
          <h2>Workspace requests</h2>
          <Badge tone="amber">
            {
              requests.filter(
                (r) =>
                  !state.approved.includes(r.id) && !state.approved.includes('rejected:' + r.id),
              ).length
            }{' '}
            pending
          </Badge>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Workspace</th>
                <th>Administrator</th>
                <th>Status</th>
                <th className="text-right">Review</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="event-title">
                      <Building2 size={17} />
                      {r.name}
                    </span>
                    <small className="table-subtext">{r.requested}</small>
                  </td>
                  <td>
                    <strong>{r.owner}</strong>
                    <small className="table-subtext">{r.email}</small>
                  </td>
                  <td>
                    <Badge
                      tone={
                        state.approved.includes(r.id)
                          ? 'green'
                          : state.approved.includes('rejected:' + r.id)
                            ? 'red'
                            : 'amber'
                      }
                    >
                      {state.approved.includes(r.id)
                        ? 'Approved'
                        : state.approved.includes('rejected:' + r.id)
                          ? 'Rejected'
                          : 'Pending'}
                    </Badge>
                  </td>
                  <td>
                    <div className="table-actions">
                      <Button
                        disabled={
                          state.approved.includes(r.id) ||
                          state.approved.includes('rejected:' + r.id)
                        }
                        onClick={() => setConfirm({ id: r.id, approve: false })}
                      >
                        <X size={14} />
                        Reject
                      </Button>
                      <Button
                        variant="primary"
                        disabled={
                          state.approved.includes(r.id) ||
                          state.approved.includes('rejected:' + r.id)
                        }
                        onClick={() => setConfirm({ id: r.id, approve: true })}
                      >
                        <Check size={14} />
                        Approve
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="workspace-footnote">
        Approval here changes sample data only. Real accounts, grants and sessions are managed by
        the future backend.
      </p>
      <Confirm
        open={!!confirm}
        onOpenChange={(v) => {
          if (!v) setConfirm(null);
        }}
        title={`${confirm?.approve ? 'Approve' : 'Reject'} this preview workspace?`}
        description="This is a local demonstration of the approval flow. No real administrator account is changed."
        danger={!confirm?.approve}
        action={confirm?.approve ? 'Approve workspace' : 'Reject request'}
        onConfirm={() => {
          if (!confirm) return;
          patch({
            approved: [...state.approved, confirm.approve ? confirm.id : 'rejected:' + confirm.id],
          });
          log(
            confirm.approve ? 'Preview workspace approved' : 'Preview workspace rejected',
            requests.find((r) => r.id === confirm.id)!.name,
            'access',
          );
          toast.success('Preview request updated.');
          setConfirm(null);
        }}
      />
    </div>
  );
}
export function Health() {
  const { state, patch } = useWorkspace();
  if (state.role !== 'superadmin')
    return (
      <Empty
        icon={<LockKeyhole size={30} />}
        title="Platform owner access required."
        description="System health is restricted to the superadmin."
      />
    );
  const alerts = [
    {
      id: 'sdk',
      title: 'Camera backend is not connected',
      description:
        'No stream or recorder health metrics are being received. This is a frontend preview, not a production incident.',
      icon: Server,
    },
    {
      id: 'storage',
      title: 'Server storage is not measured',
      description:
        'Local browser clips are available. Server disk capacity and retention metrics require backend integration.',
      icon: HardDrive,
    },
  ];
  return (
    <div>
      <PageHeading
        eyebrow="PLATFORM OWNER ONLY"
        title="Know what needs attention."
        description="Health screen foundation. No production monitoring is connected."
      />
      <div className="stats-grid three-stats">
        {[
          ['Backend', 'Not connected'],
          ['Active camera streams', 'Not measured'],
          ['Server storage', 'Not measured'],
        ].map(([label, value]) => (
          <div className="mini-stat" key={label}>
            <Activity size={19} />
            <div>
              <strong className="health-value">{value}</strong>
              <span>{label}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="health-alerts">
        {alerts.map((a) => (
          <div className="panel health-alert" key={a.id}>
            <span className="health-alert-icon">
              <a.icon size={22} />
            </span>
            <div>
              <h3>{a.title}</h3>
              <p>{a.description}</p>
              <Badge tone="amber">Integration pending</Badge>
            </div>
            <Button
              disabled={state.dismissedAlerts.includes(a.id)}
              onClick={() => {
                patch({ dismissedAlerts: [...state.dismissedAlerts, a.id] });
                toast.success('Preview notice acknowledged.');
              }}
            >
              <CheckCheck size={15} />
              {state.dismissedAlerts.includes(a.id) ? 'Acknowledged' : 'Acknowledge'}
            </Button>
          </div>
        ))}
      </div>
      <div className="info-box mt-6">
        <ShieldCheck size={17} />
        <p>
          Backend enforcement, tenant-safe metrics, deduplication and alert recovery will retain V3
          behavior during extraction.
        </p>
      </div>
    </div>
  );
}
