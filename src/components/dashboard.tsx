'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  ArrowUpRight,
  ArrowRight,
  Cctv,
  Radio,
  HardDrive,
  MonitorPlay,
  Clock3,
  Plus,
  SlidersHorizontal,
  Star,
  LayoutGrid,
  ListFilter,
  ShieldCheck,
  Route,
  CalendarDays,
} from 'lucide-react';
import { recorders } from '@/lib/model';
import { useWorkspace } from './workspace-provider';
import { RecorderCard } from './recorder-card';
import { PageHeading, Button, Reveal, Badge } from './ui';
export function Dashboard() {
  const { state } = useWorkspace();
  const [filter, setFilter] = useState('all');
  const scope = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (state.settings.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches)
        return;
      gsap.from('.stat-card', {
        y: 14,
        opacity: 0,
        stagger: 0.07,
        duration: 0.5,
        ease: 'power2.out',
      });
    },
    { scope, dependencies: [state.settings.reduceMotion] },
  );
  const list = recorders.filter(
    (r) =>
      filter === 'all' ||
      (filter === 'online' && r.online) ||
      (filter === 'favourites' && state.favorites.includes(r.id)),
  );
  return (
    <div ref={scope}>
      <PageHeading
        eyebrow="YOUR FLEET, AT A GLANCE"
        title="Everything in view."
        description="A little more clarity. A lot more peace of mind."
      >
        <span className="date-label">
          <CalendarDays size={15} />
          Campus workspace
        </span>
        <Link className="btn btn-primary" href="/cameras">
          <MonitorPlay size={16} />
          Open camera workspace
          <ArrowUpRight size={15} />
        </Link>
      </PageHeading>
      <div className="stats-grid">
        {[
          {
            label: 'Recorders',
            value: '05',
            sub: 'Across your campus',
            icon: HardDrive,
            note: 'Sample fleet',
          },
          {
            label: 'Available recorders',
            value: '04',
            sub: '1 recorder offline',
            icon: Radio,
            note: '80% availability',
          },
          {
            label: 'Camera channels',
            value: '48',
            sub: 'Ready to organize',
            icon: Cctv,
            note: '5 recorder groups',
          },
          {
            label: 'Saved recordings',
            value: String(state.clips.length).padStart(2, '0'),
            sub: 'Stored in this browser',
            icon: ClapperIcon,
            note: 'Preview clips',
          },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-top">
              <span>{s.label}</span>
              <s.icon size={17} />
            </div>
            <div className="stat-value">
              {s.value}
              <span>{s.note}</span>
            </div>
            <p>{s.sub}</p>
          </div>
        ))}
      </div>
      <div className="overview-columns">
        <div className="recorders-section">
          <div className="section-heading">
            <div>
              <h2>
                Your recorders<span className="count-chip">5</span>
              </h2>
              <p>Pick a recorder. See the bigger picture.</p>
            </div>
            <Link href="/cameras" className="text-link">
              View workspace
              <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="library-tools">
            <div className="segmented" aria-label="Recorder filter">
              {[
                ['all', 'All recorders'],
                ['online', 'Available'],
                ['favourites', 'Favourites'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={filter === id}
                  className={filter === id ? 'selected' : ''}
                  onClick={() => setFilter(id)}
                >
                  {id === 'favourites' && <Star size={13} />} {label}
                </button>
              ))}
            </div>
            <span className="muted small">Preview collection</span>
          </div>
          <div className="recorder-grid">
            {list.map((r, i) => (
              <Reveal key={r.id} delay={i * 0.035}>
                <RecorderCard recorder={r} />
              </Reveal>
            ))}
          </div>
        </div>
        <aside className="overview-aside">
          <Reveal className="coverage-card">
            <div className="section-heading">
              <h3>Campus coverage</h3>
              <Route size={16} />
            </div>
            <div className="coverage-map" aria-label="Illustrated sample campus coverage map">
              <svg viewBox="0 0 280 190" fill="none">
                <path
                  d="M-10 55 290 130M35-20 100 220M190-20 145 220M-10 155 290 35"
                  stroke="currentColor"
                  strokeWidth="18"
                />
                <path
                  d="M-10 55 290 130M35-20 100 220M190-20 145 220M-10 155 290 35"
                  stroke="var(--panel)"
                  strokeWidth="14"
                />
                <rect x="92" y="27" width="42" height="29" rx="4" />
                <rect x="172" y="104" width="45" height="28" rx="4" />
                <rect x="40" y="136" width="27" height="30" rx="4" />
                <rect x="210" y="36" width="29" height="24" rx="4" />
                <circle cx="112" cy="75" r="22" fill="var(--accent)" opacity=".08" />
                <circle cx="112" cy="75" r="6" fill="var(--accent)" />
                <circle cx="178" cy="62" r="5" fill="var(--accent)" />
                <circle cx="80" cy="130" r="5" fill="var(--accent)" />
                <circle cx="206" cy="145" r="5" fill="var(--muted)" />
              </svg>
              <span className="map-label">CAMPUS / PREVIEW</span>
            </div>
            <div className="coverage-legend">
              <span>
                <i className="status-dot" />4 available
              </span>
              <span>
                <i className="status-dot offline" />1 offline
              </span>
            </div>
            <p className="small muted">Illustration only. Location tracking is not connected.</p>
          </Reveal>
          <Reveal className="activity-card" delay={0.08}>
            <div className="section-heading">
              <h3>Workspace activity</h3>
              <Clock3 size={16} />
            </div>
            <div className="activity-feed">
              {(state.audit.length
                ? state.audit.slice(0, 3)
                : [
                    {
                      id: 'welcome',
                      action: 'Your workspace is ready',
                      target: 'Explore recorders and viewing layouts',
                      time: new Date().toISOString(),
                    },
                  ]
              ).map((a) => (
                <div className="activity-item" key={a.id}>
                  <span className="activity-line-dot" />
                  <div>
                    <strong>{a.action}</strong>
                    <p>{a.target}</p>
                    <small>
                      {a.id === 'welcome'
                        ? 'Getting started'
                        : new Date(a.time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                    </small>
                  </div>
                </div>
              ))}
            </div>
            {state.role !== 'member' && (
              <Link className="text-link" href="/activity">
                View activity log
                <ArrowRight size={14} />
              </Link>
            )}
          </Reveal>
          <Reveal className="quick-tip">
            <span className="tip-icon">
              <ShieldCheck size={19} />
            </span>
            <div>
              <h3>One workspace. Your team.</h3>
              <p>Give the right people the right view, with recorder-level permissions.</p>
              <Link className="text-link" href={state.role === 'member' ? '/settings' : '/team'}>
                Manage your workspace
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </Reveal>
        </aside>
      </div>
    </div>
  );
}
function ClapperIcon({ size = 17 }: { size?: number }) {
  return <MonitorPlay size={size} />;
}
