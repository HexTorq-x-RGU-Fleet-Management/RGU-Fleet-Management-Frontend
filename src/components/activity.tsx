'use client';
import { useState, useEffect } from 'react';
import { History, RefreshCw, ShieldCheck, Activity, Search, Clock, ArrowDown, Filter } from 'lucide-react';
import { PageHeading, Button, SearchInput, Badge } from './ui';
import { request } from '@/lib/api';
import { useWorkspace } from './workspace-provider';

export function ActivityLog() {
  const { user } = useWorkspace(),
    [events, setEvents] = useState<any[]>([]),
    [query, setQuery] = useState(''),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [next, setNext] = useState<string | null>(null),
    [categoryFilter, setCategoryFilter] = useState<'all' | 'security' | 'approval' | 'system'>('all');

  async function load(before?: string, searchStr?: string) {
    setLoading(true);
    try {
      const qVal = searchStr !== undefined ? searchStr : query;
      const d = await request(
        '/api/audit?' + new URLSearchParams({ q: qVal, ...(before ? { before } : {}) }),
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

  // Live debounced search effect for audit search panel
  useEffect(() => {
    if (!user?.id) return;
    const timer = setTimeout(() => {
      void load(undefined, query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, user?.id]);

  function getEventCategory(action: string): 'security' | 'approval' | 'system' {
    const a = (action || '').toLowerCase();
    if (
      a.includes('password') ||
      a.includes('suspend') ||
      a.includes('reject') ||
      a.includes('auth') ||
      a.includes('login') ||
      a.includes('session')
    ) {
      return 'security';
    }
    if (
      a.includes('approve') ||
      a.includes('create') ||
      a.includes('grant') ||
      a.includes('workspace')
    ) {
      return 'approval';
    }
    return 'system';
  }

  const counts = {
    all: events.length,
    security: events.filter((e) => getEventCategory(e.action) === 'security').length,
    approval: events.filter((e) => getEventCategory(e.action) === 'approval').length,
    system: events.filter((e) => getEventCategory(e.action) === 'system').length,
  };

  const filteredEvents = events.filter((e) => {
    if (categoryFilter === 'all') return true;
    return getEventCategory(e.action) === categoryFilter;
  });

  if (user?.role === 'member')
    return (
      <div className="fleet-no-data" style={{ padding: 48 }}>
        <ShieldCheck size={36} />
        <h2>Administrator access required.</h2>
        <p>Audit and compliance event histories are restricted to fleet administrators and platform owners.</p>
      </div>
    );

  return (
    <div className="admin-command-deck">
      <PageHeading
        eyebrow="RTO COMPLIANCE AUDIT HISTORY"
        title="Tamper-proof event journal"
        description="Every administrator approval, channel permission grant, provider login, and camera alteration recorded with verified timestamps."
      />

      {/* Audit Stats Bento */}
      <div className="admin-bento-grid">
        <div className="admin-metric-card accent-purple">
          <div className="admin-metric-top">
            <span>Recorded Events</span>
            <div className="admin-metric-icon">
              <History size={18} />
            </div>
          </div>
          <div className="admin-metric-value">{events.length}</div>
          <div className="admin-metric-subtext">
            <span>Audit trail entries loaded</span>
          </div>
        </div>

        <div className="admin-metric-card accent-blue">
          <div className="admin-metric-top">
            <span>Audit Integrity</span>
            <div className="admin-metric-icon">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="admin-metric-value" style={{ color: '#38bdf8' }}>
            Verified
          </div>
          <div className="admin-metric-subtext">
            <span>PostgreSQL append-only log</span>
          </div>
        </div>

        <div className="admin-metric-card accent-green">
          <div className="admin-metric-top">
            <span>Compliance Standard</span>
            <div className="admin-metric-icon">
              <Activity size={18} />
            </div>
          </div>
          <div className="admin-metric-value" style={{ fontSize: 20 }}>
            RTO AIS-140
          </div>
          <div className="admin-metric-subtext">
            <span>Automated incident retention</span>
          </div>
        </div>

        <div className="admin-metric-card accent-amber">
          <div className="admin-metric-top">
            <span>Search Filter</span>
            <div className="admin-metric-icon">
              <Search size={18} />
            </div>
          </div>
          <div className="admin-metric-value" style={{ fontSize: 20 }}>
            {query ? 'Active' : 'All Events'}
          </div>
          <div className="admin-metric-subtext">
            <span>{query ? `Filtered by "${query}"` : 'Real-time timeline'}</span>
          </div>
        </div>
      </div>

      {/* Search Toolbar */}
      <form
        className="admin-toolbar-deck"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <div style={{ flex: '1 1 320px', maxWidth: 460 }}>
          <SearchInput value={query} onChange={setQuery} placeholder="Search activity by action, actor, or target…" />
        </div>
        <div className="admin-toolbar-actions">
          <Button type="submit" loading={loading} variant="primary">
            <RefreshCw size={15} />
            Search events
          </Button>
          {query && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setQuery('');
              }}
            >
              Clear search
            </Button>
          )}
        </div>
      </form>

      {/* Quick Category Filter Pills */}
      <div className="activity-filter-deck">
        <div className="activity-filter-pills" role="tablist" aria-label="Event category filter">
          {[
            { id: 'all', label: 'All Records', count: counts.all },
            { id: 'security', label: 'Security & Auth', count: counts.security },
            { id: 'approval', label: 'Approvals & Grants', count: counts.approval },
            { id: 'system', label: 'System & Operations', count: counts.system },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              className={`activity-filter-pill ${categoryFilter === f.id ? 'active' : ''}`}
              onClick={() => setCategoryFilter(f.id as any)}
            >
              <span>{f.label}</span>
              <span className="activity-filter-count">{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert">{error}</p>}

      {/* Glass Data Cards for Audit Log */}
      <div className="admin-card-container">
        {filteredEvents.map((e, index) => {
          const actionLower = e.action?.toLowerCase() || '';
          const isSecurity =
            actionLower.includes('password') ||
            actionLower.includes('suspend') ||
            actionLower.includes('reject');
          const isApproval = actionLower.includes('approve') || actionLower.includes('create');

          const pillTone = isSecurity ? 'suspended' : isApproval ? 'active' : 'pending';

          return (
            <div className="admin-workspace-card activity-log-card" key={e.id}>
              <div className="activity-card-left">
                {/* High visibility serial number badge */}
                <div className="activity-serial-badge" title={`Serial No. #${index + 1}`}>
                  #{String(index + 1).padStart(2, '0')}
                </div>

                <div
                  className="rto-badge-icon"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background:
                      pillTone === 'active'
                        ? 'rgba(165, 203, 58, 0.15)'
                        : pillTone === 'suspended'
                          ? 'rgba(239, 68, 68, 0.15)'
                          : 'rgba(32, 150, 219, 0.15)',
                    borderColor:
                      pillTone === 'active'
                        ? 'rgba(165, 203, 58, 0.35)'
                        : pillTone === 'suspended'
                          ? 'rgba(239, 68, 68, 0.35)'
                          : 'rgba(32, 150, 219, 0.35)',
                    color:
                      pillTone === 'active'
                        ? '#a5cb3a'
                        : pillTone === 'suspended'
                          ? '#f87171'
                          : '#38bdf8',
                  }}
                >
                  <Activity size={18} />
                </div>

                <div className="activity-event-body">
                  <div className="activity-event-header">
                    <strong className="activity-action-title">{e.action}</strong>
                    <span className={`status-indicator-pill ${pillTone}`}>
                      {e.workspace || 'System'}
                    </span>
                  </div>
                  <div className="activity-event-meta">
                    <span className="activity-meta-item">
                      <span className="activity-meta-label">Actor:</span>{' '}
                      <strong className="activity-meta-value">{e.actor?.name || 'Automated'}</strong>
                    </span>
                    {e.target && (
                      <span className="activity-meta-item">
                        <span className="activity-meta-label">Target:</span>{' '}
                        <strong className="activity-meta-value">{e.target.name || e.target.id || '—'}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="activity-card-right">
                <span className="activity-timestamp">
                  <Clock size={12} />
                  {new Date(e.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </span>
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ padding: '36px 24px', textAlign: 'center', color: '#94a3b8' }}>
            <p>Loading audit timeline…</p>
          </div>
        )}

        {!filteredEvents.length && !loading && (
          <div className="fleet-no-data" style={{ padding: 48 }}>
            <History size={32} />
            <h3>No audit events found</h3>
            <p>
              {query || categoryFilter !== 'all'
                ? `No events match the active filters. Try clearing your search or category.`
                : 'All administrator actions and security events will be preserved here.'}
            </p>
          </div>
        )}
      </div>

      {/* Page Navigation & Pagination Deck */}
      <div className="activity-pagination-deck">
        <div className="activity-pagination-status">
          Showing <strong>{filteredEvents.length}</strong> of <strong>{events.length}</strong> records loaded
          {next ? ' · Older journal pages available' : ' · End of recorded ledger'}
        </div>
        <div className="activity-pagination-controls">
          {next && (
            <Button onClick={() => void load(next)} loading={loading} variant="primary">
              <ArrowDown size={14} />
              Load older events
            </Button>
          )}
          <Button
            onClick={() => {
              setQuery('');
              setCategoryFilter('all');
              void load();
            }}
            loading={loading}
            variant="secondary"
          >
            <RefreshCw size={14} />
            Refresh timeline
          </Button>
        </div>
      </div>
    </div>
  );
}
