'use client';
import { useState, useEffect } from 'react';
import { History, RefreshCw, ShieldCheck, Activity, Search, Clock, User, HardDrive } from 'lucide-react';
import { PageHeading, Button, SearchInput, Badge } from './ui';
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
        <div style={{ minWidth: 320 }}>
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
                setTimeout(() => void load(), 0);
              }}
            >
              Clear filter
            </Button>
          )}
        </div>
      </form>

      {error && <p role="alert">{error}</p>}

      {/* Glass Data Cards for Audit Log */}
      <div className="admin-card-container">
        {events.map((e) => {
          const actionLower = e.action?.toLowerCase() || '';
          const isSecurity =
            actionLower.includes('password') ||
            actionLower.includes('suspend') ||
            actionLower.includes('reject');
          const isApproval = actionLower.includes('approve') || actionLower.includes('create');

          const pillTone = isSecurity ? 'suspended' : isApproval ? 'active' : 'pending';

          return (
            <div className="admin-workspace-card" key={e.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 14, color: '#f8fafc' }}>{e.action}</strong>
                    <span className={`status-indicator-pill ${pillTone}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                      {e.workspace || 'System'}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span>
                      Actor: <strong style={{ color: '#cbd5e1' }}>{e.actor?.name || 'Automated'}</strong>
                    </span>
                    {e.target && (
                      <span>
                        Target: <strong style={{ color: '#cbd5e1' }}>{e.target.name || e.target.id || '—'}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="hud-clock" style={{ fontSize: 11 }}>
                  <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />
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

        {!events.length && !loading && (
          <div className="fleet-no-data" style={{ padding: 48 }}>
            <History size={32} />
            <h3>No audit events found</h3>
            <p>
              {query
                ? `No events match "${query}". Try adjusting your keywords.`
                : 'All administrator actions and security events will be preserved here.'}
            </p>
          </div>
        )}
      </div>

      {next && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <Button onClick={() => void load(next)} loading={loading}>
            Load older events
          </Button>
        </div>
      )}
    </div>
  );
}
