'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { Cctv, HardDrive, Radio, Star, ArrowUpRight, Link2 } from 'lucide-react';
import { recorders } from '@/lib/model';
import { workingChannels } from '@/lib/fleet';
import { useWorkspace } from './workspace-provider';
import { RecorderCard } from './recorder-card';
import { PageHeading, Reveal, Badge } from './ui';
export function RecorderLibrary() {
  const { state } = useWorkspace(),
    [filter, setFilter] = useState('all'),
    scope = useRef<HTMLDivElement>(null);
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
        eyebrow="CAMERA HARDWARE"
        title="Recorder library"
        description="Import recorders separately, then map each one to a bus. Cameras belong to that same vehicle."
      >
        <Badge tone="amber">Sample inventory</Badge>
        <Link className="btn btn-primary" href="/settings">
          <Link2 size={16} />
          Hik-Connect account
          <ArrowUpRight size={15} />
        </Link>
      </PageHeading>
      <div className="stats-grid three-stats">
        {[
          { label: 'Recorders', value: recorders.length, icon: HardDrive },
          { label: 'Sample online', value: recorders.filter((r) => r.online).length, icon: Radio },
          {
            label: 'Working sample cameras',
            value: recorders.reduce((n, r) => n + workingChannels(r.id).length, 0),
            icon: Cctv,
          },
        ].map((item) => (
          <div className="stat-card" key={item.label}>
            <div className="stat-top">
              <span>{item.label}</span>
              <item.icon size={18} />
            </div>
            <div className="stat-value">{item.value}</div>
          </div>
        ))}
      </div>
      <div className="fleet-source">
        <Radio size={15} />
        <strong>Preview inventory</strong>
        <span>
          Hardware import, channel probing and actual streaming use the authenticated Windows
          backend. This collection is simulated.
        </span>
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
        <Link className="text-link" href="/buses">
          Map recorders to buses
          <ArrowUpRight size={14} />
        </Link>
      </div>
      <div className="recorder-grid">
        {list.map((r, i) => (
          <Reveal key={r.id} delay={i * 0.035}>
            <RecorderCard recorder={r} />
          </Reveal>
        ))}
      </div>
    </div>
  );
}
