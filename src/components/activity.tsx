'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDown, Clock, History, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button, PageHeading, SearchInput } from './ui';
import { request } from '@/lib/api';
import { useWorkspace } from './workspace-provider';

type Category = 'all' | 'security' | 'approval' | 'system';
const PAGE_SIZE = 10;

function categoryFor(action: string): Exclude<Category, 'all'> {
  const value = (action || '').toLowerCase();
  if (['password', 'suspend', 'reject', 'auth', 'login', 'session'].some((term) => value.includes(term))) return 'security';
  if (['approve', 'create', 'grant', 'workspace'].some((term) => value.includes(term))) return 'approval';
  return 'system';
}

function labelFor(category: Exclude<Category, 'all'>) {
  return category === 'security' ? 'Security' : category === 'approval' ? 'Approval' : 'System';
}

export function ActivityLog() {
  const { user } = useWorkspace();
  const [events, setEvents] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [next, setNext] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<Category>('all');
  const [page, setPage] = useState(1);

  async function load(before?: string, search = query) {
    setLoading(true);
    try {
      const result = await request('/api/audit?' + new URLSearchParams({ q: search, ...(before ? { before } : {}) }));
      setEvents((current) => before ? [...current, ...result.events] : result.events);
      setNext(result.nextCursor);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user?.id) return;
    const timer = setTimeout(() => void load(undefined, query), 300);
    return () => clearTimeout(timer);
  }, [query, user?.id]);

  const counts = useMemo(() => ({
    all: events.length,
    security: events.filter((event) => categoryFor(event.action) === 'security').length,
    approval: events.filter((event) => categoryFor(event.action) === 'approval').length,
    system: events.filter((event) => categoryFor(event.action) === 'system').length,
  }), [events]);

  const filteredEvents = useMemo(() => events.filter((event) => categoryFilter === 'all' || categoryFor(event.action) === categoryFilter), [events, categoryFilter]);
  useEffect(() => setPage(1), [categoryFilter, query]);
  const totalPages = Math.ceil(filteredEvents.length / PAGE_SIZE) || 1;
  const paginatedEvents = filteredEvents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (user?.role === 'member') {
    return <div className="fleet-no-data" style={{ padding: 48 }}><ShieldCheck size={36} /><h2>Administrator access required.</h2><p>Audit and compliance event histories are restricted to fleet administrators and platform owners.</p></div>;
  }

  return (
    <div className="neotrack-activity-workspace">
      <PageHeading eyebrow="WORKSPACE" title="Activity log" description="A searchable history of access, configuration and operational changes.">
        <Button onClick={() => void load()} loading={loading} aria-label="Refresh activity log"><RefreshCw size={15} />Refresh</Button>
      </PageHeading>

      <section className="activity-summary" aria-label="Audit summary">
        <div><History size={17} /><span>Loaded events</span><strong>{events.length}</strong></div>
        <div><ShieldCheck size={17} /><span>Security events</span><strong>{counts.security}</strong></div>
        <div><Activity size={17} /><span>Approvals</span><strong>{counts.approval}</strong></div>
        <div><Clock size={17} /><span>System events</span><strong>{counts.system}</strong></div>
      </section>

      <section className="neotrack-activity-table" aria-label="Audit activity">
        <div className="neotrack-activity-table-heading">
          <div><h2>Workspace activity</h2><p>Events are written by the backend and presented in India Standard Time.</p></div>
          <span>{filteredEvents.length} entries</span>
        </div>
        <form className="neotrack-activity-controls" onSubmit={(event) => { event.preventDefault(); void load(); }}>
          <SearchInput value={query} onChange={setQuery} placeholder="Search actions, actors or targets" />
          <div className="activity-segments" role="tablist" aria-label="Activity category">
            {([
              ['all', 'All'],
              ['security', 'Security'],
              ['approval', 'Approvals'],
              ['system', 'System'],
            ] as const).map(([category, label]) => <button key={category} type="button" aria-selected={categoryFilter === category} onClick={() => setCategoryFilter(category)}>{label}<span>{counts[category]}</span></button>)}
          </div>
        </form>

        {error && <p className="activity-error" role="alert">{error}</p>}
        <div className="neotrack-activity-table-scroll">
          <table>
            <thead><tr><th>Event</th><th>Actor</th><th>Target</th><th>Category</th><th>Time</th></tr></thead>
            <tbody>{paginatedEvents.map((event) => {
              const category = categoryFor(event.action);
              return <tr key={event.id}>
                <td><div className="activity-event-cell"><span className={`activity-event-icon ${category}`}><Activity size={14} /></span><strong>{event.action}</strong></div></td>
                <td>{event.actor?.name || 'Automated'}</td>
                <td>{event.target?.name || event.target?.id || '—'}</td>
                <td><span className={`activity-category ${category}`}>{labelFor(category)}</span></td>
                <td><span className="activity-time"><Clock size={12} />{new Date(event.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span></td>
              </tr>;
            })}</tbody>
          </table>
          {!filteredEvents.length && !loading && <div className="fleet-no-data activity-empty"><History size={32} /><h3>No audit events found</h3><p>{query || categoryFilter !== 'all' ? 'No events match the active search or category.' : 'Administrator actions and security events will appear here.'}</p></div>}
        </div>
        <footer className="activity-table-footer">
          <span>Showing <strong>{filteredEvents.length ? (page - 1) * PAGE_SIZE + 1 : 0}</strong>–<strong>{Math.min(page * PAGE_SIZE, filteredEvents.length)}</strong> of <strong>{filteredEvents.length}</strong> loaded entries{next ? ' · Older entries available' : ''}</span>
          <div>
            {totalPages > 1 && <><Button variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button><span>Page {page} of {totalPages}</span><Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</Button></>}
            {next && <Button onClick={() => void load(next)} loading={loading} variant="primary"><ArrowDown size={14} />Load older</Button>}
          </div>
        </footer>
      </section>
    </div>
  );
}
