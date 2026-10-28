'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { Cctv, HardDrive, Radio, Star, ArrowUpRight, Link2, RefreshCw } from 'lucide-react';
import { workingChannels } from '@/lib/fleet';
import { useWorkspace } from './workspace-provider';
import { RecorderCard } from './recorder-card';
import { PageHeading, Reveal, Button } from './ui';
import { toast } from 'sonner';
export function RecorderLibrary() {
  const { state, provider, refreshDevices } = useWorkspace(),
    [filter, setFilter] = useState('all'),
    [busy, setBusy] = useState(false),
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
  const recorders = state.recorders,
    list = recorders.filter(
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
        description="Real owned and shared Hik-Connect recorders. Import them before mapping buses."
      >
        <Button
          loading={busy}
          onClick={() => {
            setBusy(true);
            void refreshDevices()
              .catch((e) => toast.error(e.message))
              .finally(() => setBusy(false));
          }}
        >
          <RefreshCw size={15} />
          Refresh recorders
        </Button>
        <Link className="btn btn-primary" href="/settings">
          <Link2 size={16} />
          Hik-Connect account
          <ArrowUpRight size={15} />
        </Link>
      </PageHeading>
      <div className="stats-grid three-stats">
        {[
          { label: 'Recorders', value: recorders.length, icon: HardDrive },
          {
            label: 'Online recorders',
            value: recorders.filter((r) => r.online).length,
            icon: Radio,
          },
          {
            label: 'SDK-verified channels',
            value: recorders.reduce((n, r) => n + workingChannels(recorders, r.id).length, 0),
            icon: Cctv,
          },
        ].map((item) => (
          <div className="stat-card" key={item.label}>
            <div className="stat-top">
              <span>{item.label}</span>
              <item.icon size={18} />
            </div>
            <div className="stat-value" data-ascii="skip">
              {item.value}
            </div>
          </div>
        ))}
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
      {!list.length ? (
        <div className="fleet-no-data">
          <Cctv size={30} />
          <h3>No recorders available</h3>
          <p>
            {provider?.connected
              ? 'Refresh inventory, or ask your administrator for recorder permissions.'
              : 'Connect Hik-Connect from account settings first.'}
          </p>
        </div>
      ) : (
        <div className="recorder-grid">
          {list.map((r, i) => (
            <Reveal key={r.id} delay={i * 0.035}>
              <RecorderCard recorder={r} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
