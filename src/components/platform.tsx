'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  RefreshCw,
  Activity,
  HardDrive,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  KeyRound,
  Maximize2,
  Minimize2,
  Radio,
  BusFront,
  Cctv,
  Sparkles,
  SlidersHorizontal,
  Clock,
  Shield,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeading, Button, IconButton, Confirm, Modal, Field, Badge, SearchInput } from './ui';
import { AsciiRevealArea } from './ascii-loading';
import { useWorkspace } from './workspace-provider';
import { request } from '@/lib/api';
import { formatBytes } from '@/lib/model';

export function Platform() {
  const { user, state, patch } = useWorkspace(),
    [workspaces, setWorkspaces] = useState<any[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [decision, setDecision] = useState<any>(null),
    [members, setMembers] = useState<any[] | null>(null),
    [reset, setReset] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'suspended'>('all'),
    [searchQuery, setSearchQuery] = useState(''),
    [page, setPage] = useState(1),
    [currentTime, setCurrentTime] = useState('');

  const pureSite = state.settings.pureSite ?? true;
  const PAGE_SIZE = 10;
  const togglePureSite = async () => {
    const next = !pureSite;
    await patch({ settings: { ...state.settings, pureSite: next } });
    toast.success(next ? 'Pure Site View enabled' : 'Standard View enabled');
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }) + ' IST',
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

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

  const filteredWorkspaces = useMemo(() => {
    return workspaces.filter((w) => {
      const matchesFilter = filter === 'all' || w.status?.toLowerCase() === filter.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        w.workspaceName?.toLowerCase().includes(q) ||
        w.fullName?.toLowerCase().includes(q) ||
        w.email?.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [workspaces, filter, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [filter, searchQuery]);

  const totalPages = Math.ceil(filteredWorkspaces.length / PAGE_SIZE) || 1;
  const paginatedWorkspaces = useMemo(() => {
    return filteredWorkspaces.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [filteredWorkspaces, page]);

  const stats = useMemo(() => {
    const active = workspaces.filter((w) => w.status === 'active').length;
    const pending = workspaces.filter((w) => w.status === 'pending').length;
    const suspended = workspaces.filter((w) => w.status === 'suspended').length;
    return { total: workspaces.length, active, pending, suspended };
  }, [workspaces]);

  // If viewer is a workspace admin (not superadmin), present the Executive Workspace & RTO Command Center
  if (user?.role !== 'superadmin') {
    return (
      <div className={`admin-command-deck ${pureSite ? 'pure-site-active' : ''}`}>
        {pureSite && (
          <div className="pure-site-hud">
            <div className="pure-site-hud-left">
              <span className="beacon-pulse" />
              <div className="hud-title-wrap">
                <strong>RGU Executive Command Deck · Pure Site View</strong>
                <span>Rathinam Transport Division · RTO Fleet Surveillance Operations</span>
              </div>
            </div>
            <div className="pure-site-hud-badges">
              <span className="hud-pill success">
                <ShieldCheck size={13} /> AIS-140 GPS Compliant
              </span>
              <span className="hud-pill info">
                <Cctv size={13} /> 24/7 Dual-Stream Surveillance
              </span>
              <span className="hud-pill purple">
                <BusFront size={13} /> Speed Governor Active
              </span>
              <span className="hud-clock">
                <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
                {currentTime || 'IST Live'}
              </span>
              <Button
                variant="secondary"
                aria-label="Toggle Pure Site View"
                onClick={togglePureSite}
              >
                {pureSite ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                {pureSite ? 'Standard View' : 'Pure Site View'}
              </Button>
            </div>
          </div>
        )}

        <PageHeading
          eyebrow="EXECUTIVE ADMINISTRATION & RTO COMMAND"
          title="Fleet Surveillance & Operations Command"
          description="High-density transport safety, AIS-140 GPS telemetry and verified camera surveillance for Rathinam campus fleet."
        >
          {!pureSite && (
            <Button variant="secondary" onClick={togglePureSite}>
              <Maximize2 size={14} />
              Pure Site View
            </Button>
          )}
          <Link href="/cameras" className="btn btn-primary">
            <Cctv size={15} />
            Live Camera Grid
          </Link>
        </PageHeading>

        {/* Bento Grid */}
        <div className="admin-bento-grid">
          <div className="admin-metric-card accent-purple">
            <div className="admin-metric-top">
              <span>Campus Fleet Fleet</span>
              <div className="admin-metric-icon">
                <BusFront size={18} />
              </div>
            </div>
            <div className="admin-metric-value">{state.buses.length || 0}</div>
            <div className="admin-metric-subtext">
              <span>Buses mapped to university routes</span>
            </div>
          </div>

          <div className="admin-metric-card accent-blue">
            <div className="admin-metric-top">
              <span>Hik-Connect Recorders</span>
              <div className="admin-metric-icon">
                <HardDrive size={18} />
              </div>
            </div>
            <div className="admin-metric-value">{state.recorders.length || 0}</div>
            <div className="admin-metric-subtext">
              <span>{state.recorders.filter((r) => r.online).length} online recorders</span>
            </div>
          </div>

          <div className="admin-metric-card accent-green">
            <div className="admin-metric-top">
              <span>RTO Safety Status</span>
              <div className="admin-metric-icon">
                <ShieldCheck size={18} />
              </div>
            </div>
            <div className="admin-metric-value" style={{ color: '#a5cb3a' }}>
              100%
            </div>
            <div className="admin-metric-subtext">
              <span>AIS-140 certified & road-ready</span>
            </div>
          </div>

          <div className="admin-metric-card accent-amber">
            <div className="admin-metric-top">
              <span>Admin Role Level</span>
              <div className="admin-metric-icon">
                <Shield size={18} />
              </div>
            </div>
            <div className="admin-metric-value" style={{ fontSize: 20 }}>
              {user?.role === 'admin' ? 'Workspace Admin' : 'Staff Member'}
            </div>
            <div className="admin-metric-subtext">
              <span>Multi-tenant approvals via Superadmin</span>
            </div>
          </div>
        </div>

        {/* Quick Admin Navigation Toolbar */}
        <div className="admin-card-container p-6">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <strong className="admin-panel-title">
                Administrative Controls & Access Matrix
              </strong>
              <span className="admin-panel-subtitle">
                Quickly jump to workspace management modules or configure integration credentials.
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link href="/team" className="btn btn-secondary">
                <Users size={15} />
                Team Members & Grants
              </Link>
              <Link href="/activity" className="btn btn-secondary">
                <Activity size={15} />
                Audit Log
              </Link>
              <Link href="/settings" className="btn btn-secondary">
                <SlidersHorizontal size={15} />
                Integration Settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Superadmin Multi-Tenant Platform View
  return (
    <div className={`admin-command-deck ${pureSite ? 'pure-site-active' : ''}`}>
      {/* Pure Site HUD Banner */}
      {pureSite && (
        <div className="pure-site-hud">
          <div className="pure-site-hud-left">
            <span className="beacon-pulse" />
            <div className="hud-title-wrap">
              <strong>Platform Administration · Pure Site Command</strong>
              <span>Global Multi-Tenant Approvals & Operational Control</span>
            </div>
          </div>
          <div className="pure-site-hud-badges">
            <span className="hud-pill success">
              <ShieldCheck size={13} /> Security RLS Active
            </span>
            <span className="hud-pill info">
              <Sparkles size={13} /> {stats.active} Active Tenants
            </span>
            <span className="hud-pill purple">
              <Radio size={13} /> {stats.pending} Pending Review
            </span>
            <span className="hud-clock">
              <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
              {currentTime || 'IST Live'}
            </span>
            <Button
              variant="secondary"
              aria-label="Toggle Pure Site View"
              onClick={togglePureSite}
            >
              {pureSite ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              {pureSite ? 'Standard View' : 'Pure Site View'}
            </Button>
          </div>
        </div>
      )}

      <PageHeading
        eyebrow="PLATFORM ADMINISTRATION"
        title="Workspace approvals & governance"
        description="Verify administrator credentials, grant tenant access, and oversee multi-tenant fleet security."
      >
        {!pureSite && (
          <Button variant="secondary" onClick={togglePureSite}>
            <Maximize2 size={14} />
            Pure Site View
          </Button>
        )}
        <IconButton
          label="Refresh workspaces"
          disabled={loading}
          onClick={() => void load()}
          style={{ width: 34, height: 34 }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </IconButton>
      </PageHeading>

      {error && <p role="alert">{error}</p>}

      {/* Bento Metric Cards */}
      <div className="admin-bento-grid">
        <div className="admin-metric-card accent-purple">
          <div className="admin-metric-top">
            <span>Total Workspaces</span>
            <div className="admin-metric-icon">
              <HardDrive size={18} />
            </div>
          </div>
          <div className="admin-metric-value">{stats.total}</div>
          <div className="admin-metric-subtext">
            <span>All tenant requests on server</span>
          </div>
        </div>

        <div className="admin-metric-card accent-green">
          <div className="admin-metric-top">
            <span>Active Workspaces</span>
            <div className="admin-metric-icon">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="admin-metric-value" style={{ color: '#a5cb3a' }}>
            {stats.active}
          </div>
          <div className="admin-metric-subtext">
            <span>Operational and permitted</span>
          </div>
        </div>

        <div className="admin-metric-card accent-amber">
          <div className="admin-metric-top">
            <span>Pending Approvals</span>
            <div className="admin-metric-icon">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="admin-metric-value" style={{ color: '#fbbf24' }}>
            {stats.pending}
          </div>
          <div className="admin-metric-subtext">
            <span>Awaiting owner verification</span>
          </div>
        </div>

        <div className="admin-metric-card accent-blue">
          <div className="admin-metric-top">
            <span>Suspended</span>
            <div className="admin-metric-icon">
              <XCircle size={18} />
            </div>
          </div>
          <div className="admin-metric-value" style={{ color: stats.suspended > 0 ? '#f87171' : '#94a3b8' }}>
            {stats.suspended}
          </div>
          <div className="admin-metric-subtext">
            <span>Temporarily locked</span>
          </div>
        </div>
      </div>

      {/* Admin Toolbar: Search & Segmented Filter */}
      <div className="admin-toolbar-deck">
        <div className="admin-filter-pills" role="tablist" aria-label="Filter workspaces">
          {(['all', 'active', 'pending', 'suspended'] as const).map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={filter === s}
              className={`admin-filter-pill ${filter === s ? 'active' : ''}`}
              onClick={() => setFilter(s)}
            >
              {s[0].toUpperCase() + s.slice(1)} ({s === 'all' ? workspaces.length : workspaces.filter((w) => w.status === s).length})
            </button>
          ))}
        </div>

        <div className="admin-toolbar-actions">
          <div style={{ minWidth: 260 }}>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by workspace, name, or email…"
            />
          </div>
        </div>
      </div>

      {/* Glass Data Cards */}
      <AsciiRevealArea loading={loading} cards={3} compact>
      <div className="admin-card-container">
        {paginatedWorkspaces.map((w, index) => {
          const serialNumber = (page - 1) * PAGE_SIZE + index + 1;
          const initials = (w.fullName || w.workspaceName || 'W')
            .split(' ')
            .map((n: string) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

          return (
            <div className="admin-workspace-card" key={w.id}>
              <div className="activity-serial-badge" title={`Serial No. #${serialNumber}`}>
                #{String(serialNumber).padStart(2, '0')}
              </div>

              <div className="admin-workspace-info">
                <div className="admin-avatar-ring">{initials}</div>
                <div className="admin-workspace-text">
                  <strong>{w.workspaceName}</strong>
                  <span>
                    {w.fullName} · {w.email}
                  </span>
                </div>
              </div>

              <div className="admin-workspace-status">
                <span className={`status-indicator-pill ${w.status}`}>
                  <span
                    className="beacon-pulse"
                    style={{
                      width: 6,
                      height: 6,
                      background:
                        w.status === 'active'
                          ? '#a5cb3a'
                          : w.status === 'pending'
                            ? '#fbbf24'
                            : '#f87171',
                      boxShadow: 'none',
                    }}
                  />
                  {w.status}
                </span>
              </div>

              <div className="admin-action-bar">
                {(w.status === 'pending'
                  ? ['approve', 'reject']
                  : w.status === 'active'
                    ? ['suspend']
                    : w.status === 'suspended'
                      ? ['restore']
                      : []
                ).map((action) => (
                  <Button
                    key={action}
                    variant={action === 'approve' || action === 'restore' ? 'primary' : 'secondary'}
                    onClick={() => setDecision({ id: w.id, action })}
                  >
                    {action === 'approve' && <CheckCircle2 size={14} />}
                    {action === 'reject' && <XCircle size={14} />}
                    {action === 'suspend' && <AlertTriangle size={14} />}
                    {action === 'restore' && <RotateCcw size={14} />}
                    {action[0].toUpperCase() + action.slice(1)}
                  </Button>
                ))}
                <Button
                  variant="secondary"
                  onClick={() =>
                    void request('/api/platform/workspaces/' + w.tenantId + '/users')
                      .then((d) => setMembers(d.users))
                      .catch((e) => toast.error(e.message))
                  }
                >
                  <Users size={14} />
                  Manage users
                </Button>
              </div>
            </div>
          );
        })}

        {!loading && !filteredWorkspaces.length && (
          <div className="fleet-no-data" style={{ padding: 48 }}>
            <HardDrive size={32} />
            <h3>No matching workspaces found</h3>
            <p>
              {searchQuery
                ? `No workspaces match "${searchQuery}". Clear your search query.`
                : 'Admins can request new access directly from the sign-in portal.'}
            </p>
          </div>
        )}
      </div>
      </AsciiRevealArea>

      {/* Workspaces Pagination */}
      <div className="activity-pagination-deck" style={{ marginTop: 16 }}>
        <div className="activity-pagination-status">
          Showing <strong>{filteredWorkspaces.length ? (page - 1) * PAGE_SIZE + 1 : 0}</strong>–<strong>{Math.min(page * PAGE_SIZE, filteredWorkspaces.length)}</strong> of <strong>{filteredWorkspaces.length}</strong> workspaces
        </div>
        {totalPages > 1 && (
          <div className="activity-pagination-controls" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <Confirm
        open={!!decision}
        onOpenChange={(v) => !v && setDecision(null)}
        title={(decision?.action || 'Update') + ' workspace?'}
        description="This changes the workspace’s operational access on the central database."
        action={(decision?.action || 'Update') + ' workspace'}
        danger={decision?.action === 'suspend' || decision?.action === 'reject'}
        onConfirm={async () => {
          try {
            await request('/api/platform/requests/' + decision.id + '/' + decision.action, {});
            setDecision(null);
            await load();
            toast.success('Workspace updated successfully.');
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />

      {/* Workspace Users Modal */}
      <Modal
        open={members !== null}
        onOpenChange={(v) => !v && setMembers(null)}
        title="Workspace users & credentials"
        description="Issue a secure temporary password when an administrator contacts you for access recovery."
        wide
      >
        <div style={{ marginTop: 12 }}>
          {members?.map((m) => (
            <div className="admin-modal-user-row" key={m.id}>
              <div>
                <strong className="admin-alert-title" style={{ fontSize: 13 }}>
                  {m.fullName}
                </strong>
                <span className="admin-alert-meta" style={{ fontSize: 11 }}>
                  {m.email} · Role: {m.role} · Status: {m.status}
                </span>
              </div>
              <Button onClick={() => setReset(m)}>
                <KeyRound size={13} />
                Reset password
              </Button>
            </div>
          ))}
          {!members?.length && (
            <p className="admin-alert-meta" style={{ padding: 12 }}>No users found for this workspace.</p>
          )}
        </div>
      </Modal>

      {/* Set Temporary Password Modal */}
      <Modal
        open={!!reset}
        onOpenChange={(v) => !v && setReset(null)}
        title="Set temporary password"
        description="All existing active sessions for this account will be revoked. The user must set their own password immediately upon login."
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
              toast.success('Temporary password issued.');
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              form.reset();
              setBusy(false);
            }
          }}
        >
          <Field label="Temporary password (min 12 characters)">
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              minLength={12}
              required
            />
          </Field>
          <Button type="submit" loading={busy} variant="primary" style={{ marginTop: 16 }}>
            Set and Revoke Old Sessions
          </Button>
        </form>
      </Modal>
    </div>
  );
}

export function Health() {
  const { user, state, patch } = useWorkspace(),
    [data, setData] = useState<any>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [currentTime, setCurrentTime] = useState('');

  const pureSite = state.settings.pureSite ?? true;
  const togglePureSite = async () => {
    const next = !pureSite;
    await patch({ settings: { ...state.settings, pureSite: next } });
    toast.success(next ? 'Pure Site View enabled' : 'Standard View enabled');
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }) + ' IST',
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

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
      <div className="fleet-no-data" style={{ padding: 48 }}>
        <ShieldCheck size={36} />
        <h2>Platform owner access required.</h2>
        <p>System health diagnostics and telemetry are restricted to superadministrators.</p>
      </div>
    );

  const storageUsedPercent = data?.metrics?.recordingStorage?.usedPercent ?? 0;
  const isStorageWarning = storageUsedPercent > 80;

  return (
    <div className={`admin-command-deck ${pureSite ? 'pure-site-active' : ''}`}>
      {/* Pure Site HUD Banner */}
      {pureSite && (
        <div className="pure-site-hud">
          <div className="pure-site-hud-left">
            <span className="beacon-pulse" />
            <div className="hud-title-wrap">
              <strong>Backend Telemetry & Node Health · Pure Site Command</strong>
              <span>Hardware Metrics, Streaming Throughput & Storage Diagnostics</span>
            </div>
          </div>
          <div className="pure-site-hud-badges">
            <span className="hud-pill success">
              <Activity size={13} /> Server Heartbeat 200 OK
            </span>
            <span className="hud-pill info">
              <Cctv size={13} /> {data?.metrics?.liveStreams ?? 0} Live Streams
            </span>
            <span className="hud-pill purple">
              <HardDrive size={13} /> {storageUsedPercent.toFixed(1)}% Storage Used
            </span>
            <span className="hud-clock">
              <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
              {currentTime || 'IST Live'}
            </span>
            <Button
              variant="secondary"
              aria-label="Toggle Pure Site View"
              onClick={togglePureSite}
            >
              {pureSite ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              {pureSite ? 'Standard View' : 'Pure Site View'}
            </Button>
          </div>
        </div>
      )}

      <PageHeading
        eyebrow="PLATFORM MONITORING"
        title="System health & server telemetry"
        description="Real-time backend performance, process memory consumption, active streams, and persisted alerts."
      >
        {!pureSite && (
          <Button variant="secondary" onClick={togglePureSite}>
            <Maximize2 size={14} />
            Pure Site View
          </Button>
        )}
        <IconButton
          label="Refresh health"
          disabled={loading}
          onClick={() => void load()}
          style={{ width: 34, height: 34 }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </IconButton>
      </PageHeading>

      {error && <p role="alert">{error}</p>}

      <AsciiRevealArea loading={!data && loading} cards={4} compact>
      {data && (
        <>
          {/* Bento Metric Cards */}
          <div className="admin-bento-grid">
            <div className="admin-metric-card accent-blue">
              <div className="admin-metric-top">
                <span>Active Live Streams</span>
                <div className="admin-metric-icon">
                  <Cctv size={18} />
                </div>
              </div>
              <div className="admin-metric-value">{data.metrics.liveStreams}</div>
              <div className="admin-metric-subtext">
                <span className="beacon-pulse" style={{ width: 6, height: 6 }} />
                <span>Synchronized camera streams</span>
              </div>
            </div>

            <div className="admin-metric-card accent-purple">
              <div className="admin-metric-top">
                <span>Backend Process RSS</span>
                <div className="admin-metric-icon">
                  <Activity size={18} />
                </div>
              </div>
              <div className="admin-metric-value">{formatBytes(data.metrics.nodeRssBytes)}</div>
              <div className="admin-metric-subtext">
                <span>Node.js process resident memory</span>
              </div>
            </div>

            <div className="admin-metric-card accent-green">
              <div className="admin-metric-top">
                <span>Recording Storage Quota</span>
                <div className="admin-metric-icon">
                  <HardDrive size={18} />
                </div>
              </div>
              <div className="admin-metric-value" style={{ fontSize: 22 }}>
                {formatBytes(data.metrics.recordingStorage.usedBytes)} /{' '}
                {formatBytes(data.metrics.recordingStorage.maxBytes)}
              </div>
              <div className="telemetry-gauge-wrap">
                <div
                  className="gauge-track"
                  role="progressbar"
                  aria-label="Recording storage used"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(Math.min(storageUsedPercent, 100))}
                  aria-valuetext={`${storageUsedPercent.toFixed(1)} percent used`}
                >
                  <div
                    className={`gauge-fill ${isStorageWarning ? 'warning-gradient' : 'primary-gradient'}`}
                    style={{ width: `${Math.min(storageUsedPercent, 100)}%` }}
                  />
                </div>
                <div className="gauge-labels">
                  <span>{formatBytes(data.metrics.recordingStorage.availableBytes)} available</span>
                  <span>{storageUsedPercent.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="admin-metric-card accent-amber">
              <div className="admin-metric-top">
                <span>Active Server Alerts</span>
                <div className="admin-metric-icon">
                  <AlertTriangle size={18} />
                </div>
              </div>
              <div
                className="admin-metric-value"
                style={{ color: data.counts.active > 0 ? '#fbbf24' : '#a5cb3a' }}
              >
                {data.counts.active}
              </div>
              <div className="admin-metric-subtext">
                <span>{data.counts.active === 0 ? 'All systems normal' : 'Requires attention'}</span>
              </div>
            </div>
          </div>

          {/* Persisted Alerts Panel */}
          <div className="admin-card-container p-6">
            <div style={{ marginBottom: 18 }}>
              <strong className="admin-panel-title">
                System Alerts & Diagnostic Incidents
              </strong>
              <span className="admin-panel-subtitle">
                Persisted warning signals and error observations generated by background surveillance workers.
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.alerts.map((a: any) => (
                <div
                  className={`admin-health-alert-item ${a.kind === 'server' ? 'severity-critical' : 'severity-warning'}`}
                  key={a.id}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      className="rto-badge-icon"
                      style={{
                        width: 38,
                        height: 38,
                        background: a.kind === 'server' ? 'rgba(239, 68, 68, 0.18)' : 'rgba(242, 154, 51, 0.18)',
                        borderColor: a.kind === 'server' ? 'rgba(239, 68, 68, 0.45)' : 'rgba(242, 154, 51, 0.45)',
                        color: a.kind === 'server' ? '#f87171' : '#fbbf24',
                      }}
                    >
                      <Activity size={18} />
                    </div>
                    <div>
                      <strong className="admin-alert-title">{a.title}</strong>
                      <p className="admin-alert-meta">
                        {a.workspace}
                        {a.recorder ? ' · ' + a.recorder : ''} · {a.observations} observations
                      </p>
                      <span className="admin-alert-timestamp">
                        Last recorded: {new Date(a.lastSeen).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="admin-action-bar">
                    <Button
                      disabled={!!a.acknowledgedAt}
                      onClick={() =>
                        void request('/api/platform/health/' + a.id + '/acknowledge', {})
                          .then(load)
                          .catch((e) => toast.error(e.message))
                      }
                    >
                      {a.acknowledgedAt ? 'Acknowledged' : 'Acknowledge'}
                    </Button>
                    {a.kind === 'server' && (
                      <Button
                        variant="primary"
                        onClick={() =>
                          void request('/api/platform/health/' + a.id + '/resolve', {})
                            .then(load)
                            .catch((e) => toast.error(e.message))
                        }
                      >
                        Resolve Incident
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {!data.alerts.length && (
                <div className="admin-health-nominal-card">
                  <div className="nominal-icon-ring">
                    <CheckCircle2 size={30} />
                  </div>
                  <h3>All Systems Operational & Telemetry Synchronized</h3>
                  <p>All camera streams, recording background workers, AIS-140 GPS telemetry, and database monitors are operating within nominal thresholds.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      </AsciiRevealArea>
    </div>
  );
}
