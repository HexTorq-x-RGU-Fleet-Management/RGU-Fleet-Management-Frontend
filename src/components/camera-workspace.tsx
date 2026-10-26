'use client';
import { useEffect, useRef, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Cctv,
  Play,
  Square,
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  VolumeX,
  Volume2,
  Camera,
  Clapperboard,
  FolderOpen,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MicOff,
  TriangleAlert,
} from 'lucide-react';
import { useWorkspace } from './workspace-provider';
import { Button, IconButton, Modal, Field, PageHeading } from './ui';
import { channelName, gridFor, safeFilename } from '@/lib/model';
import { request, apiUrl, streamUrl, uploadRecording, api, currentViewerId } from '@/lib/api';
import { SmoothPlayer } from '@/lib/media/smooth.mjs';
import { CameraAudio } from '@/lib/media/audio.mjs';
import { downloadBlob } from '@/lib/clips';
type Tile = { slot: number; channel: number; deviceId: string; name: string };
type LiveState = {
  state: string;
  detail?: string;
  width?: number;
  height?: number;
  fps?: number;
  audioState?: string;
  lastFrameAt?: number;
};
export function CameraWorkspace() {
  const query = useSearchParams(),
    { state, user, provider, refresh, refreshDevices, patch } = useWorkspace();
  const [device, setDevice] = useState(query.get('recorder') || ''),
    [grid, setGrid] = useState(9),
    [selected, setSelected] = useState(0),
    [focused, setFocused] = useState(false),
    [page, setPage] = useState(0),
    [rotation, setRotation] = useState(false),
    [running, setRunning] = useState(true),
    [delivery, setDelivery] = useState<'smooth' | 'mjpeg'>('smooth'),
    [quality, setQuality] = useState('auto'),
    [fit, setFit] = useState('contain'),
    [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 }),
    [states, setStates] = useState<Record<number, LiveState>>({}),
    [layoutModal, setLayoutModal] = useState(false),
    [layoutName, setLayoutName] = useState(''),
    [probing, setProbing] = useState(false),
    [muted, setMuted] = useState(true),
    [volume, setVolume] = useState(0.7),
    [recording, setRecording] = useState(false),
    [uploading, setUploading] = useState(false),
    [seconds, setSeconds] = useState(0);
  const stage = useRef<HTMLDivElement>(null),
    canvases = useRef(new Map<number, HTMLCanvasElement>()),
    players = useRef(new Map<number, SmoothPlayer>()),
    wanted = useRef(new Set<number>()),
    tilesRef = useRef<Tile[]>([]),
    epoch = useRef(0),
    audio = useRef<CameraAudio | null>(null),
    audioSource = useRef<EventSource | null>(null),
    source = useRef<EventSource | null>(null),
    recorder = useRef<MediaRecorder | null>(null),
    recordingStop = useRef<(() => void) | null>(null),
    cancelUpload = useRef<(() => void) | null>(null),
    drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null),
    fallback = useRef(false),
    frameTimes = useRef(new Map<number, number>()),
    jpegVersions = useRef(new Map<number, number>());
  const r =
      state.recorders.find((r) => r.id === device) ||
      state.recorders.find((r) => r.online) ||
      state.recorders[0],
    bus = state.buses.find((b) => b.id === query.get('bus')),
    recorders = state.recorders;
  const channels =
    r?.channelList.filter(
      (c) =>
        c.health === 'working' &&
        (!bus || (bus.recorderId === r.id && bus.favoriteChannels.includes(c.number))),
    ) ?? [];
  const pages = Math.max(1, Math.ceil(channels.length / grid));
  const tiles: Tile[] = channels
    .slice(Math.min(page, pages - 1) * grid, (Math.min(page, pages - 1) + 1) * grid)
    .map((c, i) => ({ slot: i, channel: c.number, deviceId: r!.id, name: c.name }));
  tilesRef.current = tiles;
  const plan = tiles.map((t) => t.deviceId + ':' + t.channel).join('|'),
    selectedTile = tiles.find((t) => t.slot === selected) ?? tiles[0],
    selectedChannel = r?.channelList.find((c) => c.number === selectedTile?.channel);
  const requestedQuality = quality === 'auto' ? (focused ? 'hd' : 'sd') : quality;
  const [runVersion, setRunVersion] = useState(0);
  const retryTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>()),
    retryCounts = useRef(new Map<number, number>());
  function retry(tile: Tile, code?: string) {
    if (!wanted.current.has(tile.slot) || retryTimers.current.has(tile.slot)) return;
    const count = retryCounts.current.get(tile.slot) || 0;
    if (
      count >= 3 ||
      [
        'viewer-auth-required',
        'provider-auth-required',
        'playback-auth-required',
        'access-denied',
        'recorder-offline',
        'channel-unavailable',
        'account-changed',
      ].includes(code || '')
    ) {
      wanted.current.delete(tile.slot);
      return;
    }
    retryCounts.current.set(tile.slot, count + 1);
    const current = epoch.current;
    status(tile.slot, {
      state: 'reconnecting',
      detail: 'Retrying camera connection (' + (count + 1) + '/3)…',
    });
    retryTimers.current.set(
      tile.slot,
      setTimeout(
        () => {
          retryTimers.current.delete(tile.slot);
          if (epoch.current === current && wanted.current.has(tile.slot)) void start(tile, current);
        },
        Math.min(20000, 2000 * 2 ** count),
      ),
    );
  }
  function status(slot: number, value: Partial<LiveState>) {
    setStates((s) => ({ ...s, [slot]: { ...(s[slot] || { state: 'stopped' }), ...value } }));
  }
  function reset(slot: number) {
    players.current.get(slot)?.reset();
    players.current.delete(slot);
    frameTimes.current.delete(slot);
    jpegVersions.current.set(slot, (jpegVersions.current.get(slot) ?? 0) + 1);
    const canvas = canvases.current.get(slot);
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }
  async function start(tile: Tile, currentEpoch = epoch.current) {
    if (currentEpoch !== epoch.current) return;
    wanted.current.add(tile.slot);
    reset(tile.slot);
    status(tile.slot, { state: 'connecting', detail: 'Connecting to camera…' });
    try {
      await request('/api/live/start', {
        deviceId: tile.deviceId,
        channel: tile.channel,
        quality: requestedQuality,
        delivery,
        slot: tile.slot,
      });
      if (currentEpoch === epoch.current)
        status(tile.slot, {
          state: 'waiting',
          detail: 'Camera connected. Waiting for decoded video…',
        });
    } catch (e) {
      if (currentEpoch !== epoch.current) return;
      status(tile.slot, { state: 'failed', detail: (e as Error).message });
      retry(tile, (e as any).code);
    }
  }
  async function stop(slot: number) {
    wanted.current.delete(slot);
    if (selectedTile?.slot === slot) {
      audio.current?.stop();
      setMuted(true);
      if (recording) recordingStop.current?.();
    }
    reset(slot);
    status(slot, { state: 'stopped', detail: 'Stopped' });
    try {
      await request('/api/live/stop', { slot });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  useEffect(() => {
    const id = query.get('recorder');
    if (id && recorders.some((r) => r.id === id)) setDevice(id);
    else if (!recorders.some((r) => r.id === device))
      setDevice(recorders.find((r) => r.online)?.id ?? recorders[0]?.id ?? '');
    setFocused(false);
    setSelected(0);
    setPage(0);
  }, [query, recorders.map((r) => r.id).join('|')]);
  useEffect(() => {
    setQuality(state.settings.quality);
    setFit(state.settings.fit);
  }, [user?.id]);
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [selected, focused, device]);
  useEffect(() => {
    if (!user || !provider?.playbackReady) return;
    const actor = user.id,
      connection = provider.connectionId;
    const events = new EventSource(streamUrl('/api/live/events'), { withCredentials: true });
    source.current = events;
    let opened = false;
    events.onopen = () => {
      if (opened)
        for (const tile of tilesRef.current) if (wanted.current.has(tile.slot)) void start(tile);
      opened = true;
    };
    events.addEventListener('frame', (event) => {
      let packet: any;
      try {
        packet = JSON.parse((event as MessageEvent).data);
      } catch {
        return;
      }
      const tile = tilesRef.current.find(
        (t) =>
          t.slot === packet.slot && t.deviceId === packet.deviceId && t.channel === packet.channel,
      );
      if (
        !tile ||
        !wanted.current.has(tile.slot) ||
        (packet.quality && packet.quality !== requestedQuality)
      )
        return;
      const canvas = canvases.current.get(tile.slot);
      if (!canvas) return;
      const painted = () => {
        const pending = retryTimers.current.get(tile.slot);
        if (pending) clearTimeout(pending);
        retryTimers.current.delete(tile.slot);
        retryCounts.current.delete(tile.slot);
        const now = Date.now();
        if (now - (frameTimes.current.get(tile.slot) ?? 0) > 500) {
          frameTimes.current.set(tile.slot, now);
          status(tile.slot, {
            state: 'playing',
            detail: undefined,
            width: packet.width,
            height: packet.height,
            fps: packet.fps,
            lastFrameAt: now,
          });
        }
      };
      if (packet.h264) {
        let player = players.current.get(tile.slot);
        if (!player) {
          player = new SmoothPlayer(canvas, painted, () => {
            status(tile.slot, { state: 'failed', detail: 'H264 decoding failed.' });
            if (!fallback.current) {
              fallback.current = true;
              toast.warning('Smooth decoding unavailable. Switching to Compatibility.');
              setDelivery('mjpeg');
            }
          });
          players.current.set(tile.slot, player);
        }
        player.push(packet);
      } else if (packet.jpeg) {
        const version = (jpegVersions.current.get(tile.slot) ?? 0) + 1;
        jpegVersions.current.set(tile.slot, version);
        const image = new Image();
        image.onload = () => {
          if (jpegVersions.current.get(tile.slot) !== version || !wanted.current.has(tile.slot))
            return;
          canvas.width = packet.displayWidth || image.naturalWidth;
          canvas.height = image.naturalHeight;
          canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
          painted();
        };
        image.src = 'data:image/jpeg;base64,' + packet.jpeg;
      }
    });
    events.addEventListener('states', (event) => {
      try {
        const values = JSON.parse((event as MessageEvent).data);
        for (const value of values) {
          if (!wanted.current.has(value.slot)) continue;
          if (value.state === 'failed') {
            status(value.slot, { state: 'failed', detail: value.error || 'Camera stream failed.' });
            const tile = tilesRef.current.find((t) => t.slot === value.slot);
            if (tile) retry(tile, value.errorCode);
          } else if (value.state === 'stopped')
            status(value.slot, { state: 'stopped', detail: 'Camera stream ended.' });
          else if (value.audioState) status(value.slot, { audioState: value.audioState });
        }
      } catch {}
    });
    events.onerror = () => {
      for (const slot of wanted.current) {
        players.current.get(slot)?.reset();
        status(slot, {
          state: 'reconnecting',
          detail: 'Stream connection interrupted; reconnecting…',
        });
      }
      void api
        .status()
        .then((a) => {
          if (!a.authenticated) void refresh();
        })
        .catch(() => {});
    };
    return () => {
      epoch.current++;
      events.close();
      source.current = null;
      wanted.current.clear();
      for (const player of players.current.values()) player.reset();
      players.current.clear();
      audio.current?.stop();
      audioSource.current?.close();
      cancelUpload.current?.();
      recordingStop.current?.();
      void fetch(apiUrl('/api/live/stop-all'), {
        method: 'POST',
        credentials: 'include',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          'X-Hik-Local': '1',
          'X-Saas-User': actor,
          ...(connection ? { 'X-Hik-Connection': connection } : {}),
        },
        body: '{}',
      }).catch(() => {});
    };
  }, [user?.id, provider?.connectionId, provider?.playbackReady, requestedQuality]);
  useEffect(() => {
    const current = ++epoch.current;
    wanted.current.clear();
    for (const timer of retryTimers.current.values()) clearTimeout(timer);
    retryTimers.current.clear();
    retryCounts.current.clear();
    for (const slot of canvases.current.keys()) reset(slot);
    setStates({});
    if (!user) return;
    let disposed = false;
    void (async () => {
      try {
        await request('/api/live/stop-all', {});
        if (
          disposed ||
          current !== epoch.current ||
          !running ||
          !provider?.playbackReady ||
          !r?.online ||
          !tiles.length
        )
          return;
        const pending = [...tiles];
        await Promise.all(
          Array.from({ length: Math.min(2, pending.length) }, async () => {
            while (pending.length && !disposed && current === epoch.current) {
              const tile = pending.shift()!;
              await start(tile, current);
            }
          }),
        );
      } catch (e) {
        if (!disposed) toast.error((e as Error).message);
      }
    })();
    return () => {
      disposed = true;
    };
  }, [
    plan,
    r?.online,
    running,
    provider?.playbackReady,
    provider?.connectionId,
    delivery,
    requestedQuality,
    runVersion,
  ]);
  useEffect(() => {
    if (!rotation || focused || recording) return;
    const id = setInterval(() => setPage((p) => (p + 1) % pages), state.settings.rotation * 1000);
    return () => clearInterval(id);
  }, [rotation, focused, recording, pages, state.settings.rotation]);
  useEffect(() => {
    if (muted || !selectedTile) return;
    let disposed = false;
    const cameraAudio = new CameraAudio({ onError: (message) => toast.error(message) });
    audio.current = cameraAudio;
    cameraAudio.setVolume(volume);
    void cameraAudio
      .start({ external: true, record: true, bufferDelay: delivery === 'smooth' ? 1 : 0.2 })
      .then(async () => {
        if (disposed) {
          cameraAudio.stop();
          return;
        }
        await request('/api/live/audio-focus', { slots: [selectedTile.slot] });
        if (disposed) return;
        const events = new EventSource(streamUrl('/api/live/audio-events'), {
          withCredentials: true,
        });
        audioSource.current = events;
        events.addEventListener('audio', (e) => {
          try {
            const p = JSON.parse((e as MessageEvent).data);
            if (
              p.slot === selectedTile.slot &&
              p.deviceId === selectedTile.deviceId &&
              p.channel === selectedTile.channel
            )
              cameraAudio.play(p);
          } catch {}
        });
        events.onerror = () => {
          cameraAudio.stop();
          setMuted(true);
          toast.info('Audio connection ended. Click Unmute to retry.');
        };
      })
      .catch((e) => {
        if (!disposed) {
          setMuted(true);
          toast.error(e.message);
        }
      });
    return () => {
      disposed = true;
      audioSource.current?.close();
      audioSource.current = null;
      cameraAudio.stop();
    };
  }, [
    muted,
    selectedTile?.slot,
    selectedTile?.deviceId,
    selectedTile?.channel,
    provider?.connectionId,
    delivery,
  ]);
  useEffect(() => {
    audio.current?.setVolume(volume);
  }, [volume]);
  async function probe() {
    if (!r) return;
    setProbing(true);
    let count = 0;
    try {
      for (const channel of r.channelList) {
        try {
          await request(
            '/api/previews/frame?' +
              new URLSearchParams({ deviceId: r.id, channel: String(channel.number) }),
          );
          count++;
        } catch (e) {
          if (
            ['provider-auth-required', 'playback-auth-required', 'viewer-auth-required'].includes(
              (e as any).code,
            )
          )
            throw e;
        }
      }
      await refresh();
      setGrid(gridFor(count));
      toast.info(count + ' channels returned camera frames.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setProbing(false);
    }
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stage.current?.requestFullscreen();
    } catch {
      toast.error('Fullscreen is unavailable.');
    }
  }
  function snapshot() {
    if (!selectedTile) return;
    const canvas = canvases.current.get(selectedTile.slot);
    if (!canvas || states[selectedTile.slot]?.state !== 'playing')
      return toast.error('Wait for a live frame.');
    canvas.toBlob(
      (blob) => {
        if (blob)
          downloadBlob(
            blob,
            safeFilename(
              (bus?.busNumber || r?.name) +
                '-' +
                selectedTile.channel +
                '-' +
                new Date().toISOString(),
            ) + '.jpg',
          );
      },
      'image/jpeg',
      0.94,
    );
  }
  async function record() {
    if (recording) {
      recordingStop.current?.();
      return;
    }
    if (!selectedTile || states[selectedTile.slot]?.state !== 'playing')
      return toast.error('Wait for live video before recording.');
    const canvas = canvases.current.get(selectedTile.slot);
    if (!canvas || !globalThis.MediaRecorder)
      return toast.error('Recording is unavailable in this browser.');
    const actor = user!.id,
      tile = { ...selectedTile },
      stream = canvas.captureStream(15),
      sound = audio.current?.recordDestination?.stream.getAudioTracks() ?? [];
    if (!muted) for (const track of sound) stream.addTrack(track.clone());
    const mime = (
      stream.getAudioTracks().length
        ? ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm']
        : ['video/webm;codecs=vp8', 'video/webm;codecs=vp9', 'video/webm']
    ).find((t) => MediaRecorder.isTypeSupported(t));
    if (!mime) {
      stream.getTracks().forEach((t) => t.stop());
      return toast.error('WebM recording unavailable.');
    }
    const media = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2500000 }),
      chunks: BlobPart[] = [],
      began = Date.now();
    let bytes = 0,
      allowed = true;
    const abort = new AbortController();
    cancelUpload.current = () => {
      if (currentViewerId() !== actor) {
        allowed = false;
        abort.abort();
      }
    };
    const clock = setInterval(() => setSeconds(Math.floor((Date.now() - began) / 1000)), 1000),
      limit = setTimeout(() => media.state === 'recording' && media.stop(), 15 * 60 * 1000);
    media.ondataavailable = (e) => {
      if (e.data.size) {
        chunks.push(e.data);
        bytes += e.data.size;
        if (bytes >= 128 * 1024 ** 2 && media.state === 'recording') media.stop();
      }
    };
    media.onstop = async () => {
      clearInterval(clock);
      clearTimeout(limit);
      stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
      const blob = new Blob(chunks, { type: 'video/webm' });
      if (!allowed || currentViewerId() !== actor) return;
      if (!blob.size) return toast.error('No video frames were recorded.');
      setUploading(true);
      try {
        await uploadRecording(
          blob,
          {
            deviceId: tile.deviceId,
            channel: tile.channel,
            duration: (Date.now() - began) / 1000,
            audio: stream.getAudioTracks().length > 0,
          },
          abort.signal,
          actor,
        );
        if (allowed && currentViewerId() === actor) {
          toast.success('Camera clip saved on the server.');
          dispatchEvent(new Event('rgu-recordings-updated'));
        }
      } catch (e) {
        if (allowed && currentViewerId() === actor) toast.error((e as Error).message);
      } finally {
        setUploading(false);
      }
    };
    recorder.current = media;
    recordingStop.current = () => {
      if (media.state === 'recording') media.stop();
    };
    media.start(1000);
    setSeconds(0);
    setRecording(true);
  }
  const selectedState = states[selectedTile?.slot ?? 0];
  if (!r)
    return (
      <div className="fleet-no-data">
        <Cctv size={32} />
        <h1>No camera recorders available</h1>
        <p>Connect Hik-Connect and refresh inventory. Members need recorder permissions.</p>
        <Link href="/settings" className="btn btn-primary">
          Account settings
        </Link>
      </div>
    );
  return (
    <div>
      {bus && (
        <Link className="btn btn-ghost fleet-back" href={'/buses?bus=' + bus.id}>
          <ArrowLeft size={15} />
          Back to {bus.busNumber}
        </Link>
      )}
      <div className="camera-page-heading">
        <div>
          <p className="eyebrow">CAMERA WORKSPACE</p>
          <h1>{bus ? bus.busNumber + ' · Onboard cameras' : r.name}</h1>
          <p className="page-description">
            Real SDK camera video. Single-click selects; double-click or expand focuses.
          </p>
        </div>
        <div className="control-actions">
          <Button onClick={() => setLayoutModal(true)}>
            <FolderOpen size={15} />
            Layouts
          </Button>
          <Button
            loading={probing}
            disabled={!r.online || !provider?.playbackReady || recording}
            onClick={() => void probe()}
          >
            Check camera availability
          </Button>
        </div>
      </div>
      {!bus && (
        <div className="recorder-tabs" aria-label="Select recorder">
          {recorders.map((item) => (
            <button
              key={item.id}
              className={
                [
                  r.id === item.id ? 'selected' : '',
                  state.buses.some((mapped) => mapped.recorderId === item.id) ? 'mapped' : '',
                ]
                  .filter(Boolean)
                  .join(' ')
              }
              disabled={recording}
              onClick={() => {
                setDevice(item.id);
                setGrid(gridFor(item.channelList.filter((c) => c.health === 'working').length));
                setPage(0);
                setSelected(0);
                setFocused(false);
                setRunning(true);
              }}
            >
              <span className={'status-dot ' + (item.online ? '' : 'offline')} />
              {item.name}
              {state.buses
                .filter((mapped) => mapped.recorderId === item.id)
                .map((mapped) => (
                  <span className="recorder-bus-tag" key={mapped.id}>
                    {mapped.busNumber}
                  </span>
                ))}
              <span className="recorder-channel-count">{item.channels}</span>
            </button>
          ))}
        </div>
      )}
      {!provider?.playbackReady && (
        <div className="playback-warning" role="alert">
          <TriangleAlert size={19} aria-hidden="true" />
          <div>
            <strong>
              {provider?.connected ? 'Live playback authorization required' : 'Camera connection required'}
            </strong>
            <p>
              {provider?.connected
                ? 'Hik-Connect device access is connected, but iVMS playback authorization is still missing.'
                : 'Connect Hik-Connect before opening live camera playback.'}
            </p>
            <Link className="btn btn-ghost playback-warning-link" href="/settings">
              {provider?.connected ? 'Open playback settings' : 'Open account settings'}
            </Link>
          </div>
        </div>
      )}
      <section className="monitor-panel">
        <div className="monitor-header">
          <div className="monitor-title">
            <span className="monitor-icon">
              <Cctv size={20} />
            </span>
            <div>
              <h2>{r.name}</h2>
              <p>
                {r.status} · {channels.length} recently verified channels ·{' '}
                {r.channelList.filter((c) => c.health === 'unknown').length} unchecked
              </p>
            </div>
          </div>
          <div className="monitor-tools">
            <label className="compact-select">
              Grid
              <select
                aria-label="Camera grid"
                value={grid}
                disabled={recording}
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
            <IconButton label="Fullscreen grid" onClick={() => void fullscreen()}>
              <Maximize size={17} />
            </IconButton>
          </div>
        </div>
        <div className="monitor-subbar">
          <div>
            <Button
              variant="ghost"
              disabled={!r.online || !provider?.playbackReady || recording}
              onClick={() => {
                setRunning(true);
                setRunVersion((v) => v + 1);
              }}
            >
              <Play size={13} />
              Start all
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setRunning(false);
                wanted.current.clear();
                recordingStop.current?.();
                void request('/api/live/stop-all', {}).catch((e) => toast.error(e.message));
                for (const tile of tiles) {
                  reset(tile.slot);
                  status(tile.slot, { state: 'stopped' });
                }
              }}
            >
              <Square size={13} />
              Stop all
            </Button>
            <Button
              variant={rotation ? 'primary' : 'ghost'}
              disabled={pages < 2}
              onClick={() => setRotation(!rotation)}
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
            <Button className="back-to-grid" onClick={() => setFocused(false)}>
              <ArrowLeft size={14} />
              Back to cameras
            </Button>
          )}
          {!tiles.length ? (
            <div className="fleet-no-data">
              <Cctv size={30} />
              <h3>No verified cameras in this view</h3>
              <p>
                {!r.online
                  ? 'Hik-Connect reports the recorder offline.'
                  : bus
                    ? 'Check availability and star working channels in the bus camera page.'
                    : 'Check camera availability to discover working channels. Unchecked channels are never shown as live.'}
              </p>
            </div>
          ) : (
            <div
              className={`camera-grid ${focused ? 'focused' : ''}`}
              style={
                {
                  '--grid-columns': focused || grid === 1 ? 1 : grid === 4 ? 2 : grid === 9 ? 3 : 4,
                } as React.CSSProperties
              }
            >
              {tiles.map((tile) => {
                const s = states[tile.slot] ?? { state: 'stopped' };
                return (
                  <div
                    key={tile.slot}
                    className={`camera-tile ${selected === tile.slot ? 'tile-selected' : ''}`}
                    style={focused && selected !== tile.slot ? { display: 'none' } : undefined}
                    role="button"
                    tabIndex={0}
                    aria-label={'Select ' + r.name + ' Camera ' + tile.channel}
                    aria-pressed={selected === tile.slot}
                    onClick={() => setSelected(tile.slot)}
                    onDoubleClick={() => {
                      setSelected(tile.slot);
                      setFocused(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        setSelected(tile.slot);
                      }
                    }}
                    onWheel={(e) => {
                      if (focused && selected === tile.slot)
                        setZoom((z) => Math.max(1, Math.min(4, z - e.deltaY * 0.002)));
                    }}
                    onPointerDown={(e) => {
                      if (
                        zoom > 1 &&
                        selected === tile.slot &&
                        !(e.target as HTMLElement).closest('button')
                      ) {
                        drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
                        e.currentTarget.setPointerCapture(e.pointerId);
                      }
                    }}
                    onPointerMove={(e) => {
                      if (drag.current)
                        setPan({
                          x: drag.current.px + e.clientX - drag.current.x,
                          y: drag.current.py + e.clientY - drag.current.y,
                        });
                    }}
                    onPointerUp={() => (drag.current = null)}
                  >
                    <canvas
                      ref={(canvas) => {
                        if (canvas) canvases.current.set(tile.slot, canvas);
                        else canvases.current.delete(tile.slot);
                      }}
                      width={640}
                      height={360}
                      className="live-camera-canvas"
                      style={{
                        objectFit: fit === 'none' ? 'none' : (fit as 'contain' | 'cover'),
                        transform:
                          selected === tile.slot
                            ? `translate(${pan.x}px,${pan.y}px) scale(${zoom})`
                            : undefined,
                      }}
                    />
                    {s.state !== 'playing' && (
                      <div className="stopped-tile">
                        <Cctv size={26} />
                        <strong>{s.state}</strong>
                        <small>{s.detail || 'Ready to connect'}</small>
                        {s.state === 'failed' && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              void start(tile);
                            }}
                          >
                            Retry camera
                          </Button>
                        )}
                      </div>
                    )}
                    <div className="tile-top">
                      <span>{String(tile.channel).padStart(2, '0')}</span>
                      <div>
                        <IconButton
                          label={'Expand Camera ' + tile.channel}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(tile.slot);
                            setFocused(!focused);
                          }}
                        >
                          {focused ? <Minimize size={14} /> : <Maximize size={14} />}
                        </IconButton>
                        <IconButton
                          label={
                            (s.state === 'stopped' ? 'Start' : 'Stop') + ' Camera ' + tile.channel
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            void (s.state === 'stopped' ? start(tile) : stop(tile.slot));
                          }}
                        >
                          {s.state === 'stopped' ? <Play size={14} /> : <Square size={13} />}
                        </IconButton>
                      </div>
                    </div>
                    <div className="tile-caption">
                      <span>
                        {tile.name}
                        <small>
                          {r.name} / Camera {String(tile.channel).padStart(2, '0')}
                        </small>
                      </span>
                      <span className="tile-status">
                        {s.state === 'playing' ? 'Live' : s.state}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="camera-pagination">
          <span>
            {selectedState?.width ? selectedState.width + ' × ' + selectedState.height + ' · ' : ''}
            {delivery === 'smooth' ? 'H264 Smooth' : 'JPEG Compatibility'} · sound muted until
            enabled
          </span>
          <div>
            <IconButton
              label="Previous camera page"
              disabled={page === 0 || focused || recording}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={16} />
            </IconButton>
            <span>
              {page + 1} / {pages}
            </span>
            <IconButton
              label="Next camera page"
              disabled={page >= pages - 1 || focused || recording}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={16} />
            </IconButton>
          </div>
        </div>
      </section>
      {selectedTile && (
        <div className="selected-controls">
          <div className="selected-label">
            <Cctv size={17} />
            <span>
              <strong>
                {r.name} / Camera {String(selectedTile.channel).padStart(2, '0')}
              </strong>
              <small>{channelName(selectedTile.channel, r)}</small>
            </span>
          </div>
          <div className="control-group">
            <span className="muted small">Playback</span>
            <select
              aria-label="Playback preference"
              value={delivery}
              disabled={recording}
              onChange={(e) => setDelivery(e.target.value as 'smooth' | 'mjpeg')}
            >
              <option value="smooth">Smooth</option>
              <option value="mjpeg">Compatibility</option>
            </select>
          </div>
          <div className="control-group">
            <span className="muted small">Quality</span>
            <select
              aria-label="Selected camera quality"
              value={quality}
              disabled={recording}
              onChange={(e) => setQuality(e.target.value)}
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
            <Button
              disabled={!selectedChannel?.canDownload || selectedState?.state !== 'playing'}
              onClick={snapshot}
            >
              <Camera size={15} />
              Snapshot
            </Button>
            <Button
              loading={uploading}
              disabled={
                !selectedChannel?.canRecord || (!recording && selectedState?.state !== 'playing')
              }
              onClick={() => void record()}
            >
              {recording ? <Square size={14} /> : <Clapperboard size={15} />}{' '}
              {recording
                ? 'Stop ' + Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0')
                : 'Record clip'}
            </Button>
            <Button disabled={selectedState?.state !== 'playing'} onClick={() => setMuted(!muted)}>
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />} {muted ? 'Unmute' : 'Mute'}
            </Button>
            <input
              type="range"
              aria-label="Volume"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
            />
            <IconButton label="Push-to-talk unavailable in this backend" disabled>
              <MicOff size={16} />
            </IconButton>
          </div>
        </div>
      )}
      <p className="workspace-footnote">
        Actual camera video and audio arrive through the authenticated Windows API. Quality depends
        on recorder stream settings. Only the selected tile is heard. Recordings are uploaded to
        server storage.
      </p>
      <Modal
        open={layoutModal}
        onOpenChange={setLayoutModal}
        title="Camera layouts"
        description="Layouts and favourites are stored in your account."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!layoutName.trim()) return;
            try {
              await patch({
                layouts: [
                  ...state.layouts,
                  { id: crypto.randomUUID(), name: layoutName.trim(), recorder: r.id, grid, fit },
                ],
              });
              setLayoutName('');
              toast.success('Layout saved.');
            } catch {}
          }}
        >
          <Field label="Layout name">
            <input
              maxLength={60}
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              required
            />
          </Field>
          <Button type="submit" variant="primary">
            Save current layout
          </Button>
        </form>
        {state.layouts.map((l) => (
          <div className="setting-row" key={l.id}>
            <strong>{l.name}</strong>
            <Button
              disabled={recording}
              onClick={() => {
                setDevice(l.recorder);
                setGrid(l.grid);
                setFit(l.fit);
                setPage(0);
                setLayoutModal(false);
              }}
            >
              Load
            </Button>
            <Button
              onClick={() => void patch({ layouts: state.layouts.filter((x) => x.id !== l.id) })}
            >
              Remove
            </Button>
          </div>
        ))}
      </Modal>
    </div>
  );
}
