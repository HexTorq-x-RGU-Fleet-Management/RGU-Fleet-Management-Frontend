'use client';
import Link from 'next/link';
import { Star, ArrowUpRight, MapPin, Cctv, BusFront } from 'lucide-react';
import { toast } from 'sonner';
import { type Recorder } from '@/lib/model';
import { Badge, IconButton } from './ui';
import { useWorkspace } from './workspace-provider';
export function RecorderCard({ recorder: r }: { recorder: Recorder }) {
  const { state, patch } = useWorkspace();
  const favorite = state.favorites.includes(r.id);
  return (
    <article className="recorder-card">
      <Link href={'/cameras?recorder=' + r.id} className="recorder-preview">
        <div className="recorder-preview-symbol" aria-hidden="true">
          <Cctv size={42} strokeWidth={1} />
          <span>CAMERA WORKSPACE</span>
        </div>
        <span className="preview-shade" />
        <span className="preview-stamp">PREVIEW READY</span>
        <span className="recorder-preview-meta">
          <Cctv size={15} />
          {r.channels} channels
        </span>
        <span className="preview-arrow">
          <ArrowUpRight size={18} />
        </span>
      </Link>
      <div className="recorder-card-body">
        <div className="recorder-title">
          <Link href={'/cameras?recorder=' + r.id}>{r.name}</Link>
          <IconButton
            label={favorite ? `Unfavourite ${r.name}` : `Favourite ${r.name}`}
            aria-pressed={favorite}
            onClick={() => {
              patch({
                favorites: favorite
                  ? state.favorites.filter((id) => id !== r.id)
                  : [...state.favorites, r.id],
              });
              toast.success(favorite ? 'Removed from favourites' : 'Added to favourites');
            }}
          >
            <Star
              size={16}
              fill={favorite ? 'currentColor' : 'none'}
              className={favorite ? 'text-accent' : ''}
            />
          </IconButton>
        </div>
        <p className="recorder-location">
          <MapPin size={12} />
          {r.location}
        </p>
        <div className="recorder-card-bottom">
          <Badge tone={r.online ? 'green' : 'neutral'}>
            {r.online ? 'Available' : 'Offline'} <span className="sr-only">in preview</span>
          </Badge>
          <span>
            <BusFront size={13} />
            {r.vehicle}
          </span>
        </div>
      </div>
    </article>
  );
}
