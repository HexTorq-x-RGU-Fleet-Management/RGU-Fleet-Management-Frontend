'use client';
import { useEffect, useState, useCallback } from 'react';
import { Clapperboard, Play, Download, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from './workspace-provider';
import { PageHeading, Button, Modal, Confirm, SearchInput, Badge } from './ui';
import { apiUrl, request } from '@/lib/api';
import { formatBytes, safeFilename } from '@/lib/model';
import { downloadBlob } from '@/lib/clips';
export function Recordings() {
  const { user } = useWorkspace(),
    [data, setData] = useState<any>({ clips: [], storage: null }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [query, setQuery] = useState(''),
    [preview, setPreview] = useState<any>(null),
    [remove, setRemove] = useState<any>(null),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await request('/api/recordings');
      setData(d);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const update = () => void load();
    addEventListener('rgu-recordings-updated', update);
    return () => removeEventListener('rgu-recordings-updated', update);
  }, [load]);
  async function download(clip: any) {
    try {
      const res = await fetch(apiUrl(clip.downloadUrl), {
        credentials: 'include',
        headers: { 'X-Saas-User': user!.id },
      });
      if (!res.ok) throw Error('Recording download is no longer permitted.');
      downloadBlob(
        await res.blob(),
        /\.(webm|mp4)$/i.test(clip.name||'')?safeFilename(clip.name):safeFilename(clip.recorderName+'-'+clip.cameraName)+'.webm',
      );
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  const clips = data.clips.filter((c: any) =>
    (c.name + ' ' + c.recorderName + ' ' + c.cameraName)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div>
      <PageHeading
        eyebrow="SERVER RECORDINGS"
        title="Saved camera clips."
        description="Real camera clips stored by your workspace backend. Access is checked for every request."
      >
        <Button loading={loading} onClick={() => void load()}>
          <RefreshCw size={15} />
          Refresh recordings
        </Button>
      </PageHeading>
      <div className="panel-toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Search recordings" />
        {data.storage && (
          <span className="muted">
            {formatBytes(data.storage.usedBytes)} / {formatBytes(data.storage.maxBytes)} ·{' '}
            {data.storage.retentionDays} days retention
          </span>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
      <>
      {!clips.length ? (
        <div className="fleet-no-data">
          <Clapperboard size={32} />
          <h3>No recordings found</h3>
          <p>
            Record a live camera clip in Camera workspace. Clips remain on the server after refresh.
          </p>
        </div>
      ) : (
        <div className="clips-grid">
          {clips.map((c: any) => (
            <article key={c.id} className="clip-card">
              <button
                className="clip-preview"
                aria-label={'Play ' + c.name}
                onClick={() => setPreview(c)}
              >
                <Clapperboard size={35} />
                <span className="play-circle">
                  <Play size={20} />
                </span>
              </button>
              <div className="clip-body">
                <h3>
                  {c.recorderName} / {c.cameraName}
                </h3>
                <p>{new Date(c.createdAt).toLocaleString()}</p>
                <p>
                  {formatBytes(c.size)} · {Math.round(c.duration || 0)} seconds
                </p>
                <Badge>{c.audio ? 'Video + camera audio' : 'Video only'}</Badge>
                <div className="control-actions mt-4">
                  <Button disabled={!c.canDownload} onClick={() => void download(c)}>
                    <Download size={14} />
                    Download
                  </Button>
                  {c.canDelete && (
                    <Button aria-label={'Delete ' + c.name} onClick={() => setRemove(c)}>
                      <Trash2 size={14} />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      </>
      <Modal
        open={!!preview}
        onOpenChange={(v) => !v && setPreview(null)}
        title={preview?.cameraName || 'Camera recording'}
        description="Playback from authenticated server storage."
        wide
      >
        {preview && (
          <video
            key={preview.id}
            src={apiUrl(preview.url) + '?user=' + encodeURIComponent(user!.id)}
            crossOrigin="use-credentials"
            className="clip-video"
            controls
            autoPlay
            onError={() => toast.error('The recording could not be loaded or decoded.')}
          />
        )}
      </Modal>
      <Confirm
        open={!!remove}
        onOpenChange={(v) => !v && setRemove(null)}
        title="Delete recording?"
        description="The server file will be removed for your workspace."
        onConfirm={async () => {
          setBusy(true);
          try {
            await request('/api/recordings/' + remove.id + '/delete', {});
            setRemove(null);
            await load();
            toast.success('Recording deleted.');
          } catch (e) {
            toast.error((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
