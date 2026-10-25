'use client';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Clapperboard,
  Upload,
  Search,
  Download,
  Trash2,
  Play,
  HardDrive,
  Calendar,
  ArrowUpRight,
  Film,
} from 'lucide-react';
import Link from 'next/link';
import { useWorkspace } from './workspace-provider';
import { PageHeading, Button, Empty, SearchInput, Modal, Confirm, Badge } from './ui';
import { formatBytes, type Clip } from '@/lib/model';
import { putClip, getClip, removeClip, downloadBlob } from '@/lib/clips';
export function Recordings() {
  const { state, patch, log } = useWorkspace();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [deleting, setDeleting] = useState<Clip | null>(null);
  const [preview, setPreview] = useState<Clip | null>(null);
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const list = state.clips
    .filter((c) => (c.name + c.camera).toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) =>
      sort === 'newest' ? b.created.localeCompare(a.created) : a.name.localeCompare(b.name),
    );
  useEffect(() => {
    let active = true;
    let local = '';
    if (preview)
      void getClip(preview.id)
        .then((blob) => {
          if (!blob) {
            toast.error('The browser clip file is missing.');
            return;
          }
          if (active) {
            local = URL.createObjectURL(blob);
            setUrl(local);
          }
        })
        .catch(() => toast.error('Could not load clip.'));
    return () => {
      active = false;
      if (local) URL.revokeObjectURL(local);
      setUrl('');
    };
  }, [preview]);
  async function upload(file: File) {
    if (!['video/mp4', 'video/webm'].includes(file.type))
      return toast.error('Choose an MP4 or WebM video.');
    if (file.size > 128 * 1024 ** 2) return toast.error('Choose a clip smaller than 128 MB.');
    setUploading(true);
    try {
      const id = crypto.randomUUID();
      await putClip(id, file);
      const clip = {
        id,
        name: file.name,
        camera: 'Local upload / preview',
        created: new Date().toISOString(),
        bytes: file.size,
        type: file.type,
      };
      patch({ clips: [clip, ...state.clips] });
      log('Local preview clip added', file.name, 'recording');
      toast.success('Clip saved in this browser.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The clip could not be saved.');
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  }
  async function download(c: Clip) {
    try {
      const blob = await getClip(c.id);
      if (!blob) return toast.error('This clip is no longer in browser storage.');
      downloadBlob(
        blob,
        c.name.endsWith('.mp4') || c.name.endsWith('.webm') ? c.name : c.name + '.webm',
      );
      toast.success('Clip download started.');
    } catch {
      toast.error('Could not download this clip.');
    }
  }
  return (
    <div>
      <PageHeading
        eyebrow="KEEP WHAT MATTERS"
        title="Your recordings."
        description="Preview captures and local uploads, neatly kept in one place."
      >
        <Button loading={uploading} onClick={() => input.current?.click()}>
          <Upload size={15} />
          Add local clip
        </Button>
        <Link href="/cameras" className="btn btn-primary">
          <Clapperboard size={15} />
          Record a preview
        </Link>
      </PageHeading>
      <input
        ref={input}
        type="file"
        accept="video/mp4,video/webm"
        hidden
        aria-label="Upload local recording"
        onChange={(e) => {
          if (e.target.files?.[0]) void upload(e.target.files[0]);
        }}
      />
      <div className="recordings-summary">
        <span>
          <HardDrive size={17} />
          <strong>{formatBytes(state.clips.reduce((n, c) => n + c.bytes, 0))}</strong> used locally
        </span>
        <span>
          <Film size={17} />
          <strong>{state.clips.length}</strong> clips saved
        </span>
        <Badge>Browser storage</Badge>
      </div>
      <div className="panel">
        <div className="panel-toolbar">
          <SearchInput value={query} onChange={setQuery} placeholder="Search recordings" />
          <select
            aria-label="Sort recordings"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>
        {list.length ? (
          <div className="clips-grid">
            {list.map((c) => (
              <article className="clip-card" key={c.id}>
                <button
                  className="clip-thumbnail"
                  onClick={() => setPreview(c)}
                  aria-label={`Play ${c.name}`}
                >
                  <Film size={32} />
                  <span>
                    <Play size={20} fill="currentColor" />
                  </span>
                  <small>LOCAL PREVIEW CLIP</small>
                </button>
                <div className="clip-body">
                  <h3>{c.name}</h3>
                  <p>{c.camera}</p>
                  <span className="muted small">
                    {new Date(c.created).toLocaleDateString()} / {formatBytes(c.bytes)}
                  </span>
                  <div className="clip-actions">
                    <Button onClick={() => void download(c)}>
                      <Download size={14} />
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setDeleting(c)}
                      aria-label={`Delete ${c.name}`}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            icon={<Clapperboard size={30} />}
            title={query ? 'No clips match your search.' : 'A moment worth keeping.'}
            description={
              query
                ? 'Try a different camera name or filename.'
                : 'Record a sample view in Camera workspace or add your own MP4/WebM. Files persist in this browser, not on a server.'
            }
          >
            <Button onClick={() => input.current?.click()}>
              <Upload size={15} />
              Add your first clip
            </Button>
          </Empty>
        )}
      </div>
      <p className="workspace-footnote">
        Local files are device-specific. Retention settings describe the future backend policy; they
        do not silently delete browser files.
      </p>
      <Modal
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
        title={preview?.name || 'Recording'}
        description="Local preview file. This player does not access historical DVR footage."
        wide
      >
        {url ? (
          <video
            src={url}
            controls
            playsInline
            autoPlay
            className="clip-video"
            onError={() => toast.error('This browser could not decode the video file.')}
          />
        ) : (
          <div className="skeleton h-48" />
        )}
      </Modal>
      <Confirm
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete this local clip?"
        description="The video will be removed from this browser. Download a copy first if you want to keep it."
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await removeClip(deleting.id);
            patch({ clips: state.clips.filter((c) => c.id !== deleting.id) });
            log('Local clip deleted', deleting.name, 'recording');
            toast.success('Clip deleted.');
          } catch {
            toast.error('The clip could not be deleted.');
          }
          setDeleting(null);
        }}
      />
    </div>
  );
}
