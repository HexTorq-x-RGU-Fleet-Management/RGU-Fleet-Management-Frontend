'use client';

import Link from 'next/link';
import { BusFront, Cctv, Gauge, History, Satellite, TriangleAlert } from 'lucide-react';
import type { ComponentType } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import {
  TELEMETRY_FRESH_SECONDS,
  timeLabel,
  type GpsSummary,
  type OperationsMetric,
  type OperationsSummary,
} from '@/lib/fleet';

export type SpeedAlert = {
  id: string;
  gps_time: number;
  speed_kph: number;
  speed_limit_kph: number;
  address: string;
  bus_id: string;
  bus_number: string;
};
export type KpiFilter = 'all' | 'moving' | 'online' | 'offline' | 'overspeed';

function cameraCheckLabel(value: string | null) {
  if (!value) return 'Automatic check starting';
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) return 'Checked automatically';
  return `Checked ${new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
  }).format(time)} IST`;
}

type OperationalCardProps = {
  tone: 'bus' | 'camera' | 'gps';
  icon: ComponentType<{ size?: number }>;
  title: string;
  metric: OperationsMetric;
  activeLabel: string;
  inactiveLabel: string;
  pendingLabel?: string;
  note: string;
  actionLabel: string;
  pressed?: boolean;
  onClick?: () => void;
  href?: string;
};

function OperationalCard({
  tone,
  icon: Icon,
  title,
  metric,
  activeLabel,
  inactiveLabel,
  pendingLabel,
  note,
  actionLabel,
  pressed,
  onClick,
  href,
}: OperationalCardProps) {
  const percentage = metric.total ? Math.round((metric.active / metric.total) * 100) : 0;
  const data = metric.total
    ? [
        { name: activeLabel, value: metric.active, fill: 'var(--ops-active)' },
        { name: inactiveLabel, value: metric.inactive, fill: 'var(--ops-inactive)' },
        ...(pendingLabel && metric.pending
          ? [{ name: pendingLabel, value: metric.pending, fill: 'var(--ops-pending)' }]
          : []),
      ]
    : [{ name: 'No devices', value: 1, fill: 'var(--ops-inactive)' }];
  const body = (
    <>
      <div className="ops-card-heading">
        <span className="ops-card-icon">
          <Icon size={20} />
        </span>
        <div>
          <span className="ops-card-kicker">Live operations</span>
          <h3>{title}</h3>
        </div>
      </div>
      <div className="ops-card-content">
        <div className="ops-chart" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="70%"
                outerRadius="94%"
                startAngle={90}
                endAngle={-270}
                cornerRadius={6}
                paddingAngle={metric.total ? 3 : 0}
                stroke="none"
                isAnimationActive={false}
              >
                {data.map((item) => (
                  <Cell key={item.name} fill={item.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <span className="ops-chart-value">
            <strong>{metric.active}</strong>
            <small>{percentage}%</small>
          </span>
        </div>
        <div className="ops-totals">
          <span className="ops-total-label">Total</span>
          <strong className="ops-total-value">{metric.total}</strong>
          <span className="ops-total-note">{note}</span>
        </div>
      </div>
      <div
        className={`ops-legend ${pendingLabel ? 'has-pending' : ''}`}
        aria-label={`${metric.active} ${activeLabel}; ${metric.inactive} ${inactiveLabel}${pendingLabel ? `; ${metric.pending ?? 0} ${pendingLabel}` : ''}`}
      >
        <span>
          <i className="active" />
          <strong>{metric.active}</strong> {activeLabel}
        </span>
        <span>
          <i />
          <strong>{metric.inactive}</strong> {inactiveLabel}
        </span>
        {pendingLabel ? (
          <span>
            <i className="pending" />
            <strong>{metric.pending ?? 0}</strong> {pendingLabel}
          </span>
        ) : null}
      </div>
      <span className="ops-action">{actionLabel}</span>
    </>
  );
  const className = `ops-card ops-${tone}`;
  if (href)
    return (
      <Link className={className} href={href}>
        {body}
      </Link>
    );
  return (
    <button className={className} type="button" aria-pressed={pressed} onClick={onClick}>
      {body}
    </button>
  );
}

export function FleetKpis({
  operations,
  summary,
  filter,
  onFilter,
  alerts,
  playbackHref,
  playbackBus,
}: {
  operations: OperationsSummary;
  summary: GpsSummary;
  filter: string;
  onFilter: (value: KpiFilter) => void;
  alerts: SpeedAlert[];
  playbackHref: string | null;
  playbackBus: string | null;
}) {
  const freshMinutes = Math.round(TELEMETRY_FRESH_SECONDS / 60);
  const toggle = (value: KpiFilter) => onFilter(filter === value ? 'all' : value);
  return (
    <section aria-labelledby="operations-heading" className="kpi-section operations-section">
      <div className="dashboard-filter-strip" role="group" aria-label="Dashboard focus">
        <button type="button" className={filter === 'all' ? 'selected' : ''} onClick={() => onFilter('all')}>
          Fleet overview
        </button>
        <button type="button" className={filter === 'moving' ? 'selected' : ''} onClick={() => toggle('moving')}>
          Moving buses
        </button>
        <button type="button" className={filter === 'online' ? 'selected' : ''} onClick={() => toggle('online')}>
          GPS online
        </button>
        <button type="button" className={filter === 'overspeed' ? 'selected' : ''} onClick={() => toggle('overspeed')}>
          Speed alerts
        </button>
      </div>
      <div className="operations-heading">
        <div>
          <h2 id="operations-heading">Operational status</h2>
        </div>
        <p>Current RGU vehicle, CCTV and GPS availability.</p>
      </div>
      <div className="operations-grid">
        <OperationalCard
          tone="bus"
          icon={BusFront}
          title="Vehicle status"
          metric={operations.buses}
          activeLabel="running"
          inactiveLabel="not running"
          note="configured vehicles"
          actionLabel={filter === 'moving' ? 'Show all buses' : 'View running buses'}
          pressed={filter === 'moving'}
          onClick={() => toggle('moving')}
        />
        <OperationalCard
          tone="camera"
          icon={Cctv}
          title="Camera status"
          metric={operations.cameras}
          activeLabel="online"
          inactiveLabel="offline"
          pendingLabel="checking"
          note="recorder channels"
          actionLabel={`${cameraCheckLabel(operations.cameras.checkedAt)} · Open cameras`}
          href="/cameras"
        />
        <OperationalCard
          tone="gps"
          icon={Satellite}
          title="GPS status"
          metric={operations.gps}
          activeLabel="online"
          inactiveLabel="offline"
          note={`${freshMinutes}-minute live window`}
          actionLabel={filter === 'online' ? 'Show all buses' : 'View online GPS'}
          pressed={filter === 'online'}
          onClick={() => toggle('online')}
        />
      </div>
      <div className="operations-actions">
        <button
          type="button"
          className={`operations-action-card ${filter === 'overspeed' ? 'selected' : ''}`}
          aria-pressed={filter === 'overspeed'}
          onClick={() => toggle('overspeed')}
        >
          <Gauge size={18} />
          <span>
            <strong>{alerts.length}</strong>
            Speed compliance
          </span>
          <small>
            {summary.overspeedNow
              ? `${summary.overspeedNow} over the limit now`
              : 'No active limit breach'}
          </small>
        </button>
        {playbackHref ? (
          <Link className="operations-action-card" href={playbackHref}>
            <History size={18} />
            <span>
              <strong>Replay</strong>
              Journey playback
            </span>
            <small>Open {playbackBus ?? 'bus'} journey history</small>
          </Link>
        ) : (
          <div className="operations-action-card disabled">
            <History size={18} />
            <span>
              <strong>Replay</strong>
              Route playback
            </span>
            <small>Map a GPS device first</small>
          </div>
        )}
      </div>
      {alerts.length > 0 && (
        <div className="alert-strip" role="list" aria-label="Latest speed alerts">
          <span className="alert-strip-title">
            <TriangleAlert size={16} />
            Latest speed alerts
          </span>
          {alerts.slice(0, 4).map((alert) => (
            <Link
              role="listitem"
              key={alert.id}
              className="alert-chip"
              href={`/buses?bus=${alert.bus_id}&tab=journey`}
              title={alert.address || undefined}
            >
              <strong>{alert.bus_number}</strong>
              <span>
                {Number(alert.speed_kph).toFixed(0)} km/h, limit{' '}
                {Number(alert.speed_limit_kph).toFixed(0)}
              </span>
              <small>{timeLabel(alert.gps_time)} IST</small>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
