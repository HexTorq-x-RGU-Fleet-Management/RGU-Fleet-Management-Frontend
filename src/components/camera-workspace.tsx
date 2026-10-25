'use client';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Play,
  Square,
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  VolumeX,
  Camera,
  Clapperboard,
  LayoutGrid,
  Save,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Cctv,
  Move,
  MicOff,
  X,
} from 'lucide-react';
import { useWorkspace } from './workspace-provider';
import { Button, IconButton, Badge, Modal, Field } from './ui';
import { recorders, channelName, gridFor, safeFilename } from '@/lib/model';
import { putClip, downloadBlob } from '@/lib/clips';
export function CameraWorkspace() {
  const query = useSearchParams();
  const { state, patch, log, ready } = useWorkspace();
  const [device, setDevice] = useState(query.get('recorder') || 'kpm-3');
  const [grid, setGrid] = useState(9);
  const [selected, setSelected] = useState(1);
  const [focused, setFocused] = useState(false);
  const [paused, setPaused] = useState<number[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [fit, setFit] = useState<string>(state.settings.fit);
  const [quality, setQuality] = useState<string>(state.settings.quality);
  const [playback, setPlayback] = useState('smooth');
  const [rotation, setRotation] = useState(false);
  const [page, setPage] = useState(0);
  const [layoutModal, setLayoutModal] = useState(false);
  const [layoutName, setLayoutName] = useState('');
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const frame = useRef<number>(0);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const d = recorders.find((r) => r.id === device) || recorders[0];
  const pages = Math.max(1, Math.ceil(d.channels / grid));
  const slots = focused
    ? [selected]
    : Array.from({ length: grid }, (_, i) => page * grid + i + 1).filter((i) => i <= d.channels);
  const activeCount = d.online
    ? Array.from({ length: d.channels }, (_, i) => i + 1).filter((i) => !paused.includes(i)).length
    : 0;
  useEffect(() => {
    if (ready) {
      setFit(state.settings.fit);
      setQuality(state.settings.quality);
    }
  }, [ready]);
  useEffect(() => {
    const id = query.get('recorder');
    if (id && recorders.some((r) => r.id === id)) {
      setDevice(id);
      const r = recorders.find((r) => r.id === id)!;
      setGrid(gridFor(r.channels));
      setPage(0);
      setSelected(1);
      setFocused(false);
    }
  }, [query]);
  useEffect(() => {
    if (!rotation || focused) return;
    const id = setInterval(() => setPage((p) => (p + 1) % pages), state.settings.rotation * 1000);
    return () => clearInterval(id);
  }, [rotation, focused, pages, state.settings.rotation]);
  useEffect(
    () => () => {
      recorder.current?.stop();
      cancelAnimationFrame(frame.current);
      if (timer.current) clearInterval(timer.current);
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );
  function choose(id: string) {
    if (recording) {
      toast.info('Stop the preview recording before switching recorders.');
      return;
    }
    const next = recorders.find((r) => r.id === id)!;
    setDevice(id);
    setGrid(gridFor(next.channels));
    setSelected(1);
    setPage(0);
    setPaused([]);
    setFocused(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(false);
  }
  function stopRecording() {
    if (recorder.current?.state === 'recording') recorder.current.stop();
  }
  async function imageCanvas() {
    const image = document.createElement('canvas');
    image.width = 1280;
    image.height = 720;
    const surface = image.getContext('2d')!;
    surface.fillStyle = '#0d151b';
    surface.fillRect(0, 0, 1280, 720);
    surface.strokeStyle = '#26343d';
    surface.lineWidth = 1;
    for (let x = 0; x < 1280; x += 48) {
      surface.beginPath();
      surface.moveTo(x, 0);
      surface.lineTo(x, 720);
      surface.stroke();
    }
    for (let y = 0; y < 720; y += 48) {
      surface.beginPath();
      surface.moveTo(0, y);
      surface.lineTo(1280, y);
      surface.stroke();
    }
    surface.strokeStyle = '#ade8c2';
    surface.lineWidth = 4;
    surface.strokeRect(580, 250, 100, 70);
    surface.beginPath();
    surface.moveTo(680, 265);
    surface.lineTo(718, 248);
    surface.lineTo(718, 322);
    surface.lineTo(680, 306);
    surface.stroke();
    surface.textAlign = 'center';
    surface.fillStyle = '#ade8c2';
    surface.font = '24px sans-serif';
    surface.fillText('RGU FLEET / PREVIEW', 640, 390);
    surface.fillStyle = '#8e9fa8';
    surface.font = '18px sans-serif';
    surface.fillText('Code-rendered test frame - no camera feed connected', 640, 425);
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d')!;
    return { image, canvas, ctx };
  }
  async function snapshot() {
    try {
      const { canvas, ctx, image } = await imageCanvas();
      ctx.drawImage(image, 0, 0, 1280, 720);
      ctx.fillStyle = 'rgba(0,0,0,.65)';
      ctx.fillRect(0, 670, 1280, 50);
      ctx.fillStyle = 'white';
      ctx.font = '18px sans-serif';
      ctx.fillText(`RGU PREVIEW / ${d.name} / ${channelName(selected)} / PREVIEW FRAME`, 24, 703);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            downloadBlob(blob, safeFilename(d.name + '-' + selected + '-preview') + '.jpg');
            toast.success('Preview snapshot downloaded.');
          }
        },
        'image/jpeg',
        0.92,
      );
    } catch {
      toast.error('The preview frame could not be captured.');
    }
  }
  async function startRecording() {
    if (recording) return stopRecording();
    if (!d.online || paused.includes(selected))
      return toast.info('Start an available preview tile first.');
    if (!globalThis.MediaRecorder)
      return toast.error('Your browser does not support local recording.');
    setBusy(true);
    try {
      const { image, canvas, ctx } = await imageCanvas();
      const stream = canvas.captureStream(15);
      const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      if (!mime) throw Error('WebM recording is unavailable in this browser.');
      const media = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 1_000_000 });
      recorder.current = media;
      const chunks: BlobPart[] = [];
      let bytes = 0;
      const started = Date.now();
      let elapsed = 0;
      const draw = () => {
        ctx.drawImage(image, 0, 0, 1280, 720);
        ctx.fillStyle = 'rgba(0,0,0,.7)';
        ctx.fillRect(0, 650, 1280, 70);
        ctx.fillStyle = 'white';
        ctx.font = '18px sans-serif';
        ctx.fillText(
          `RGU PREVIEW / ${d.name} / ${channelName(selected)} / SAMPLE - NOT CAMERA FOOTAGE`,
          24,
          678,
        );
        ctx.fillText(new Date().toLocaleTimeString(), 24, 705);
        frame.current = requestAnimationFrame(draw);
      };
      draw();
      media.ondataavailable = (e) => {
        if (e.data.size) {
          chunks.push(e.data);
          bytes += e.data.size;
          if (bytes >= 128 * 1024 ** 2 && media.state === 'recording') media.stop();
        }
      };
      media.onstop = async () => {
        cancelAnimationFrame(frame.current);
        stream.getTracks().forEach((t) => t.stop());
        if (timer.current) clearInterval(timer.current);
        if (timeout.current) clearTimeout(timeout.current);
        setRecording(false);
        const blob = new Blob(chunks, { type: 'video/webm' });
        if (!blob.size) return;
        const id = crypto.randomUUID();
        const clip = {
          id,
          name: `${d.name} - ${channelName(selected)} preview`,
          camera: `${d.name} / Camera ${String(selected).padStart(2, '0')}`,
          created: new Date().toISOString(),
          bytes: blob.size,
          type: 'video/webm',
        };
        try {
          await putClip(id, blob);
          patch({ clips: [clip, ...state.clips] });
          log('Preview clip recorded', clip.camera, 'recording');
          toast.success('Preview clip saved in Recordings.');
        } catch {
          downloadBlob(blob, 'rgu-preview.webm');
          toast.warning('Browser storage failed. Your preview clip was downloaded instead.');
        }
      };
      media.start(1000);
      setRecording(true);
      setSeconds(0);
      timer.current = setInterval(() => setSeconds(++elapsed), 1000);
      timeout.current = setTimeout(
        () => {
          if (media.state === 'recording') media.stop();
        },
        15 * 60 * 1000,
      );
      toast.info('Recording this sample view locally. No camera audio is available.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Recording could not start.');
    } finally {
      setBusy(false);
    }
  }
  function select(channel: number) {
    if (channel === selected) return;
    setSelected(channel);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }
  return (
    <div>
      <div className="camera-page-heading">
        <div>
          <p className="eyebrow">CAMERA WORKSPACE</p>
          <h1>Your campus. Every angle.</h1>
          <p className="page-description">
            Select a tile to control it. Double-click or use expand to focus.
          </p>
        </div>
        <Button onClick={() => setLayoutModal(true)}>
          <FolderOpen size={15} />
          Layouts
        </Button>
      </div>
      <div className="recorder-tabs" aria-label="Select recorder">
        {recorders.map((r) => (
          <button
            key={r.id}
            className={d.id === r.id ? 'selected' : ''}
            onClick={() => choose(r.id)}
          >
            <span className={`status-dot ${r.online ? '' : 'offline'}`} />
            {r.name}
            <span>{r.channels}</span>
          </button>
        ))}
      </div>
      <section className="monitor-panel">
        <div className="monitor-header">
          <div className="monitor-title">
            <span className="monitor-icon">
              <Cctv size={20} />
            </span>
            <div>
              <h2>
                {d.name}
                <Badge tone={d.online ? 'green' : 'neutral'}>
                  {d.online ? 'Preview available' : 'Sample offline'}
                </Badge>
              </h2>
              <p>
                {d.location} / {d.channels} channels / {activeCount} preview tiles running
              </p>
            </div>
          </div>
          <div className="monitor-tools">
            <label className="compact-select">
              <span>Grid</span>
              <select
                aria-label="Camera grid"
                value={grid}
                onChange={(e) => {
                  setGrid(Number(e.target.value));
                  setPage(0);
                  setFocused(false);
                }}
              >
                {[1, 4, 9, 16].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'camera' : 'cameras'}
                  </option>
                ))}
              </select>
            </label>
            <IconButton
              label="Fullscreen grid"
              onClick={() => {
                if (!stage.current?.requestFullscreen) {
                  toast.info('Fullscreen is not supported by this browser.');
                  return;
                }
                void stage.current
                  ?.requestFullscreen()
                  .catch(() => toast.error('Fullscreen is unavailable.'));
              }}
            >
              <Maximize size={17} />
            </IconButton>
          </div>
        </div>
        <div className="monitor-subbar">
          <div>
            <Button
              variant="ghost"
              onClick={() => {
                setPaused([]);
                toast.success('Available preview tiles started.');
              }}
            >
              <Play size={13} />
              Start all
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                if (recording) stopRecording();
                setPaused(Array.from({ length: d.channels }, (_, i) => i + 1));
              }}
            >
              <Square size={13} />
              Stop all
            </Button>
            <Button
              variant={rotation ? 'primary' : 'ghost'}
              onClick={() => {
                if (pages === 1)
                  return toast.info('Choose a smaller grid to rotate between camera pages.');
                setRotation(!rotation);
              }}
            >
              <RotateCcw size={13} />
              {rotation ? 'Stop rotation' : 'Rotate views'}
            </Button>
          </div>
          <div>
            <span className="muted small">Group picture</span>
            <select
              aria-label="Group picture sizing"
              value={fit}
              onChange={(e) => setFit(e.target.value)}
            >
              <option value="contain">Fit</option>
              <option value="cover">Fill</option>
              <option value="none">Original</option>
            </select>
          </div>
        </div>
        <div ref={stage} className="camera-stage">
          {focused && (
            <button
              className="back-to-grid"
              onClick={() => {
                setFocused(false);
                setZoom(1);
              }}
            >
              <ArrowLeft size={14} />
              Back to cameras
            </button>
          )}
          <div
            className={`camera-grid ${focused ? 'focused' : ''}`}
            style={
              {
                '--grid-columns': focused || grid === 1 ? 1 : grid === 4 ? 2 : grid === 9 ? 3 : 4,
              } as React.CSSProperties
            }
          >
            {slots.map((channel) => (
              <div
                key={channel}
                className={`camera-tile ${selected === channel ? 'tile-selected' : ''} ${paused.includes(channel) || !d.online ? 'tile-stopped' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={`Select ${d.name} Camera ${channel}`}
                aria-pressed={selected === channel}
                onClick={() => select(channel)}
                onDoubleClick={() => {
                  select(channel);
                  setFocused(true);
                }}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    select(channel);
                  }
                }}
                onWheel={(e) => {
                  if (selected === channel && focused)
                    setZoom((z) => Math.max(1, Math.min(4, z - e.deltaY * 0.002)));
                }}
                onPointerDown={(e) => {
                  if ((e.target as HTMLElement).closest('button')) return;
                  if (zoom > 1 && selected === channel) {
                    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }
                }}
                onPointerMove={(e) => {
                  if (drag.current) {
                    const limit = (zoom - 1) * 80;
                    setPan({
                      x: Math.max(
                        -limit,
                        Math.min(limit, drag.current.px + (e.clientX - drag.current.x)),
                      ),
                      y: Math.max(
                        -limit,
                        Math.min(limit, drag.current.py + (e.clientY - drag.current.y)),
                      ),
                    });
                  }
                }}
                onPointerUp={() => {
                  drag.current = null;
                }}
                onPointerCancel={() => {
                  drag.current = null;
                }}
              >
                {d.online && !paused.includes(channel) ? (
                  <>
                    <div
                      className="tile-placeholder"
                      style={{
                        width: fit === 'none' ? 320 : '100%',
                        height: fit === 'cover' ? '100%' : undefined,
                        aspectRatio: fit === 'cover' ? undefined : '16/9',
                        transform: `translate(calc(-50% + ${selected === channel ? pan.x : 0}px), calc(-50% + ${selected === channel ? pan.y : 0}px)) scale(${selected === channel ? zoom : 1})`,
                      }}
                    >
                      <Cctv size={32} strokeWidth={1} />
                      <span>CAMERA PREVIEW</span>
                    </div>
                    <span className="tile-vignette" />
                    <span className="tile-preview-label">PREVIEW / NOT LIVE</span>
                  </>
                ) : (
                  <div className="stopped-tile">
                    <Cctv size={26} />
                    <strong>{d.online ? 'Preview paused' : 'Recorder offline'}</strong>
                    <small>
                      {d.online
                        ? 'Press play to resume this sample view.'
                        : 'Sample state. No real recorder is connected.'}
                    </small>
                  </div>
                )}
                <div className="tile-top">
                  <span>{String(channel).padStart(2, '0')}</span>
                  <div>
                    <IconButton
                      label={`Expand Camera ${channel}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        select(channel);
                        setFocused(!focused);
                      }}
                    >
                      {focused ? <Minimize size={14} /> : <Maximize size={14} />}
                    </IconButton>
                    <IconButton
                      label={`${paused.includes(channel) ? 'Start' : 'Stop'} Camera ${channel}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (recording && selected === channel) stopRecording();
                        setPaused((p) =>
                          p.includes(channel) ? p.filter((c) => c !== channel) : [...p, channel],
                        );
                      }}
                    >
                      {paused.includes(channel) ? <Play size={14} /> : <Square size={13} />}
                    </IconButton>
                  </div>
                </div>
                <div className="tile-caption">
                  <span>
                    {channelName(channel)}
                    <small>
                      {d.name} / Camera {String(channel).padStart(2, '0')}
                    </small>
                  </span>
                  <span className="tile-status">
                    {recording && selected === channel ? (
                      <>
                        <span className="recording-dot" />
                        REC
                      </>
                    ) : d.online && !paused.includes(channel) ? (
                      'Preview'
                    ) : (
                      'Stopped'
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="camera-pagination">
          <span>
            <span className="status-dot" />
            Preview mode <span className="muted">/ select a tile for controls</span>
          </span>
          <div>
            <IconButton
              label="Previous camera page"
              disabled={page === 0 || focused}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={16} />
            </IconButton>
            <span>
              {page + 1} / {pages}
            </span>
            <IconButton
              label="Next camera page"
              disabled={page >= pages - 1 || focused}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={16} />
            </IconButton>
          </div>
        </div>
      </section>
      <div className="selected-controls">
        <div className="selected-label">
          <Cctv size={17} />
          <span>
            <strong>
              {d.name} / Camera {String(selected).padStart(2, '0')}
            </strong>
            <small>{channelName(selected)}</small>
          </span>
        </div>
        <div className="control-group">
          <span className="muted small">Playback</span>
          <select
            aria-label="Playback preference"
            value={playback}
            onChange={(event) => {
              setPlayback(event.target.value);
              toast.info(
                'Playback preference selected. The preview remains a code-rendered panel.',
              );
            }}
          >
            <option value="smooth">Smooth</option>
            <option value="compatibility">Compatibility</option>
          </select>
        </div>
        <div className="control-group">
          <span className="muted small">Quality</span>
          <select
            aria-label="Selected camera quality"
            value={quality}
            onChange={(e) => {
              setQuality(e.target.value);
              toast.info('Quality preference selected. Live negotiation needs the camera backend.');
            }}
          >
            <option value="auto">Adaptive</option>
            <option value="hd">HD / Main</option>
            <option value="sd">SD / Substream</option>
          </select>
        </div>
        <div className="zoom-controls">
          <IconButton label="Zoom out" onClick={() => setZoom((z) => Math.max(1, z - 0.25))}>
            <ZoomOut size={16} />
          </IconButton>
          <span>{zoom.toFixed(2)}x</span>
          <IconButton label="Zoom in" onClick={() => setZoom((z) => Math.min(4, z + 0.25))}>
            <ZoomIn size={16} />
          </IconButton>
          <IconButton
            label="Reset zoom"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            <RotateCcw size={15} />
          </IconButton>
        </div>
        <div className="control-actions">
          <Button onClick={() => void snapshot()} disabled={!d.online || paused.includes(selected)}>
            <Camera size={15} />
            Snapshot
          </Button>
          {state.role !== 'member' && (
            <Button
              variant={recording ? 'danger' : 'secondary'}
              loading={busy}
              onClick={() => void startRecording()}
              disabled={!d.online}
            >
              {recording ? <Square size={14} /> : <Clapperboard size={15} />}{' '}
              {recording
                ? `Stop ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
                : 'Record preview'}
            </Button>
          )}
          <IconButton
            label="Audio unavailable in preview"
            onClick={() =>
              toast.info(
                'Preview panels have no audio. Camera audio will use the backend media connection.',
              )
            }
          >
            <VolumeX size={17} />
          </IconButton>
          <input
            className="preview-volume"
            type="range"
            min="0"
            max="100"
            value="0"
            disabled
            aria-label="Volume unavailable in preview"
            title="Camera audio requires the connected media backend"
          />
          <IconButton label="Push-to-talk requires backend microphone forwarding" disabled>
            <MicOff size={16} />
          </IconButton>
        </div>
      </div>
      <div className="workspace-footnote">
        <Move size={13} />
        <span>
          Wheel to zoom in focus view. Drag to pan when zoomed. Preview captures are labelled and
          saved only in your browser.
        </span>
      </div>
      <Modal
        open={layoutModal}
        onOpenChange={setLayoutModal}
        title="Make room for your view"
        description="Save this recorder, grid and picture sizing as a named preview layout."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const name = layoutName.trim();
            if (!name) return;
            patch({
              layouts: [
                ...state.layouts,
                { id: crypto.randomUUID(), name, recorder: d.id, grid, fit },
              ],
            });
            log('Viewing layout saved', name, 'settings');
            setLayoutName('');
            toast.success('Layout saved.');
          }}
        >
          <Field label="Layout name">
            <input
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              placeholder="Morning campus check"
              maxLength={60}
              required
            />
          </Field>
          <Button variant="primary" type="submit" className="w-full">
            <Save size={15} />
            Save current layout
          </Button>
        </form>
        <div className="saved-layouts">
          {state.layouts.length ? (
            state.layouts.map((l) => (
              <div key={l.id}>
                <LayoutGrid size={17} />
                <span>
                  <strong>{l.name}</strong>
                  <small>
                    {recorders.find((r) => r.id === l.recorder)?.name} / {l.grid} tiles
                  </small>
                </span>
                <Button
                  onClick={() => {
                    choose(l.recorder);
                    setGrid(l.grid);
                    setFit(l.fit);
                    setLayoutModal(false);
                    toast.success('Layout loaded.');
                  }}
                >
                  Load
                </Button>
                <IconButton
                  label={`Remove layout ${l.name}`}
                  onClick={() => {
                    patch({ layouts: state.layouts.filter((x) => x.id !== l.id) });
                    toast.success('Layout removed.');
                  }}
                >
                  <X size={15} />
                </IconButton>
              </div>
            ))
          ) : (
            <p className="muted small">Your saved layouts will appear here.</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
