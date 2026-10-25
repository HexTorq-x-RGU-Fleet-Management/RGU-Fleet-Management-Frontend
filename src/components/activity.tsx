'use client';
import { useState, useEffect } from 'react';
import { History, RefreshCw } from 'lucide-react';
import { PageHeading, Button, SearchInput } from './ui';
import { request } from '@/lib/api';
import { useWorkspace } from './workspace-provider';
export function ActivityLog() {
  const { user } = useWorkspace(),
    [events, setEvents] = useState<any[]>([]),
    [query, setQuery] = useState(''),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [next, setNext] = useState<string | null>(null);
  async function load(before?: string) {
    setLoading(true);
    try {
      const d = await request(
        '/api/audit?' + new URLSearchParams({ q: query, ...(before ? { before } : {}) }),
      );
      setEvents((e) => (before ? [...e, ...d.events] : d.events));
      setNext(d.nextCursor);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [user?.id]);
  if (user?.role === 'member')
    return (
      <div className="fleet-no-data">
        <h2>Administrator access required.</h2>
      </div>
    );
  return (
    <div>
      <PageHeading
        eyebrow="AUDIT HISTORY"
        title="Every action, in context."
        description="Approvals, permissions, provider connections and recording changes recorded by the server."
      />
      <form
        className="panel-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <SearchInput value={query} onChange={setQuery} placeholder="Search activity" />
        <Button type="submit" loading={loading}>
          <RefreshCw size={15} />
          Search events
        </Button>
      </form>
      {error && <p role="alert">{error}</p>}
      <div className="panel table-scroll">
        <table>
          <thead>
            <tr>
              <th>Action</th>
              <th>Workspace</th>
              <th>Actor</th>
              <th>Target</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td>{e.action}</td>
                <td>{e.workspace}</td>
                <td>{e.actor.name}</td>
                <td>{e.target.name || e.target.id || '—'}</td>
                <td>{new Date(e.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!events.length && !loading && (
          <div className="fleet-no-data">
            <History size={28} />
            <h3>No audit events found</h3>
          </div>
        )}
        {loading && <p role="status">Loading audit history…</p>}
      </div>
      {next && <Button onClick={() => void load(next)}>Load older events</Button>}
    </div>
  );
}
