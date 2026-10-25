'use client';
import { useState } from 'react';
import { History, ShieldCheck, Download, LockKeyhole, Search, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from './workspace-provider';
import { PageHeading, Button, Empty, SearchInput, Badge } from './ui';
import { downloadBlob } from '@/lib/clips';
export function ActivityLog() {
  const { state } = useWorkspace();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  if (state.role === 'member')
    return (
      <Empty
        icon={<LockKeyhole size={30} />}
        title="Administrator access required."
        description="Audit history is available to workspace administrators and the platform owner."
      />
    );
  const list = state.audit.filter(
    (a) =>
      (category === 'all' || a.category === category) &&
      (a.action + a.target + a.actor).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div>
      <PageHeading
        eyebrow="SECURITY AUDIT TRAIL"
        title="Every action, in context."
        description="Real-time operational audit log of account, camera and workspace activity."
      >
        <Button
          onClick={() => {
            downloadBlob(
              new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' }),
              'rgu-fleet-activity.json',
            );
            toast.success('Activity log exported.');
          }}
        >
          <Download size={15} />
          Export activity
        </Button>
      </PageHeading>
      <div className="panel">
        <div className="panel-toolbar">
          <SearchInput value={query} onChange={setQuery} placeholder="Search activity" />
          <select
            aria-label="Activity category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All events</option>
            {['access', 'camera', 'recording', 'settings'].map((c) => (
              <option value={c} key={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>
        {list.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Target</th>
                  <th>Actor</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <span className="event-title">
                        <ShieldCheck size={16} />
                        {a.action}
                      </span>
                      <small className="table-subtext">{a.category}</small>
                    </td>
                    <td>{a.target}</td>
                    <td>{a.actor}</td>
                    <td className="muted">{new Date(a.time).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            icon={<History size={30} />}
            title="Activity log empty"
            description="Operational security actions, camera changes and access updates will appear here."
          />
        )}
      </div>
      <p className="workspace-footnote">
        All surveillance activities and access events are logged with timestamp verification.
      </p>
    </div>
  );
}
