'use client';
import Link from 'next/link';
import { Satellite, Wifi, WifiOff, Gauge, History, TriangleAlert, ArrowUpRight } from 'lucide-react';
import type { ComponentType } from 'react';
import { TELEMETRY_FRESH_SECONDS, timeLabel, type GpsSummary } from '@/lib/fleet';

export type SpeedAlert = {
  id: string;
  gps_time: number;
  speed_kph: number;
  speed_limit_kph: number;
  address: string;
  bus_id: string;
  bus_number: string;
};
export type KpiFilter = 'all' | 'online' | 'offline' | 'overspeed';

type CardProps = {
  tone: 'violet' | 'green' | 'red' | 'amber' | 'blue';
  icon: ComponentType<{ size?: number }>;
  label: string;
  value: string;
  note: string;
  pressed?: boolean;
  onClick?: () => void;
  href?: string;
};
function KpiCard({ tone, icon: Icon, label, value, note, pressed, onClick, href }: CardProps) {
  const body = (
    <>
      <span className="kpi-icon">
        <Icon size={20} />
      </span>
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value">{value}</strong>
      <span className="kpi-note">{note}</span>
    </>
  );
  if (href)
    return (
      <Link className={`kpi-card kpi-link kpi-${tone}`} href={href}>
        {body}
        <ArrowUpRight className="kpi-go" size={16} />
      </Link>
    );
  if (!onClick)
    return (
      <div className={`kpi-card kpi-${tone}`} aria-disabled="true">
        {body}
      </div>
    );
  return (
    <button
      type="button"
      className={`kpi-card kpi-${tone}`}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {body}
    </button>
  );
}

export function FleetKpis({
  summary,
  filter,
  onFilter,
  alerts,
  playbackHref,
  playbackBus,
}: {
  summary: GpsSummary;
  filter: string;
  onFilter: (value: KpiFilter) => void;
  alerts: SpeedAlert[];
  playbackHref: string | null;
  playbackBus: string | null;
}) {
  const toggle = (value: KpiFilter) => onFilter(filter === value ? 'all' : value);
  const freshMinutes = Math.round(TELEMETRY_FRESH_SECONDS / 60);
  return (
    <section aria-label="GPS fleet overview" className="kpi-section">
      <div className="kpi-grid">
        <KpiCard
          tone="violet"
          icon={Satellite}
          label="GPS devices"
          value={String(summary.total)}
          note={
            summary.unmapped
              ? `${summary.unmapped} bus${summary.unmapped === 1 ? '' : 'es'} without a GPS device`
              : 'Every bus has a GPS device'
          }
          pressed={filter === 'all'}
          onClick={() => onFilter('all')}
        />
        <KpiCard
          tone="green"
          icon={Wifi}
          label="GPS online"
          value={String(summary.online)}
          note={`Reported in the last ${freshMinutes} minutes`}
          pressed={filter === 'online'}
          onClick={() => toggle('online')}
        />
        <KpiCard
          tone="red"
          icon={WifiOff}
          label="GPS offline"
          value={String(summary.offline)}
          note="No recent signal"
          pressed={filter === 'offline'}
          onClick={() => toggle('offline')}
        />
        <KpiCard
          tone="amber"
          icon={Gauge}
          label="Speed alerts, 24 h"
          value={String(alerts.length)}
          note={
            summary.overspeedNow
              ? `${summary.overspeedNow} over the limit right now`
              : 'No bus over its limit right now'
          }
          pressed={filter === 'overspeed'}
          onClick={() => toggle('overspeed')}
        />
        {playbackHref ? (
          <KpiCard
            tone="blue"
            icon={History}
            label="Playback"
            value="Replay"
            note={`Open ${playbackBus ?? 'a bus'} route history`}
            href={playbackHref}
          />
        ) : (
          <KpiCard
            tone="blue"
            icon={History}
            label="Playback"
            value="Replay"
            note="Map a GPS device to a bus first"
          />
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
