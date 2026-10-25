'use client';
import Link from 'next/link';
import { Star, ArrowUpRight, Cctv, BusFront } from 'lucide-react';
import { toast } from 'sonner';
import type { Recorder } from '@/lib/model';
import { Badge, IconButton } from './ui';
import { useWorkspace } from './workspace-provider';
import { CameraPreview } from './camera-preview';
export function RecorderCard({ recorder: r }: { recorder: Recorder }) {
  const { state, provider, patch } = useWorkspace(),
    favorite = state.favorites.includes(r.id),
    channel = r.channelList.find((c) => c.health === 'working');
  return (
    <article className="recorder-card">
      <Link href={'/cameras?recorder=' + encodeURIComponent(r.id)} className="recorder-preview">
        {channel ? (
          <CameraPreview
            deviceId={r.id}
            channel={channel.number}
            enabled={r.online && provider?.playbackReady}
          />
        ) : (
          <div className="recorder-preview-symbol">
            <Cctv size={42} strokeWidth={1} />
            <span>{r.online ? 'AVAILABILITY UNCHECKED' : r.status.toUpperCase()}</span>
          </div>
        )}
        <span className="recorder-preview-meta">
          <Cctv size={15} />
          {r.channels} permitted channels
        </span>
        <span className="preview-arrow">
          <ArrowUpRight size={18} />
        </span>
      </Link>
      <div className="recorder-card-body">
        <div className="recorder-title">
          <Link href={'/cameras?recorder=' + encodeURIComponent(r.id)}>{r.name}</Link>
          <IconButton
            label={(favorite ? 'Unfavourite ' : 'Favourite ') + r.name}
            aria-pressed={favorite}
            onClick={() =>
              void patch({
                favorites: favorite
                  ? state.favorites.filter((id) => id !== r.id)
                  : [...state.favorites, r.id],
              }).then(() => toast.success('Favourites saved.'))
            }
          >
            <Star size={16} fill={favorite ? 'currentColor' : 'none'} />
          </IconButton>
        </div>
        <p className="recorder-location">{r.location}</p>
        <div className="recorder-card-bottom">
          <Badge tone={r.online ? 'green' : 'neutral'}>{r.status}</Badge>
          <span>
            <BusFront size={13} />
            {r.vehicle}
          </span>
        </div>
        <p className="small muted">
          Checked {r.checkedAt ? new Date(r.checkedAt).toLocaleTimeString() : 'not yet'}
        </p>
      </div>
    </article>
  );
}
