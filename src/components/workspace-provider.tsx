'use client';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { api, request, bindViewer, bindProvider, fleetApi, ApiError } from '@/lib/api';
import type { Principal, Recorder, Member, Clip, Audit, SavedLayout, Settings } from '@/lib/model';
import type { Bus, TelemetryEnvelope } from '@/lib/fleet';
type Preferences = { settings: Settings; favorites: string[]; layouts: SavedLayout[] };
type State = Preferences & {
  role: Principal['role'];
  buses: Bus[];
  recorders: Recorder[];
  members: Member[];
  clips: Clip[];
  audit: Audit[];
  dismissedAlerts: string[];
  approved: string[];
};
const defaults: Preferences = {
  favorites: [],
  layouts: [],
  settings: {
    retention: 7,
    quality: 'auto',
    fit: 'contain',
    theme: 'dark',
    rotation: 30,
    reduceMotion: false,
  },
};
const initial: State = {
  ...defaults,
  role: 'member',
  buses: [],
  recorders: [],
  members: [],
  clips: [],
  audit: [],
  dismissedAlerts: [],
  approved: [],
};
function adaptDevices(devices: any[], buses: Bus[]): Recorder[] {
  return devices.map((d) => ({
    id: d.id,
    name: d.name,
    online: d.status === 'online',
    status: d.status,
    source: d.source,
    checkedAt: d.checkedAt,
    channels: d.channels.length,
    channelList: d.channels,
    location: d.source === 'shared' ? 'Shared Hik-Connect recorder' : 'Hik-Connect recorder',
    vehicle: buses.find((b) => b.recorderId === d.id)?.busNumber || 'Not mapped to a bus',
  }));
}
type Context = {
  state: State;
  ready: boolean;
  user: Principal | null;
  setupRequired: boolean;
  error: string | null;
  provider: any;
  telemetry: TelemetryEnvelope | null;
  refresh: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  patch: (change: Partial<Preferences>) => Promise<void>;
  log: (action: string, target: string, category: string) => void;
  reset: () => void;
  saveBus: (bus: Bus) => Promise<void>;
  removeBus: (id: string) => Promise<void>;
  signOut: () => Promise<void>;
};
const Workspace = createContext<Context | null>(null);
const sessionSender = typeof window === 'undefined' ? 'server' : crypto.randomUUID();
export function broadcastViewerChange() {
  if (typeof BroadcastChannel === 'undefined') return;
  const channel = new BroadcastChannel('rgu-viewer-session');
  channel.postMessage({ sender: sessionSender });
  channel.close();
}
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initial),
    [user, setUser] = useState<Principal | null>(null),
    [ready, setReady] = useState(false),
    [setupRequired, setSetup] = useState(false),
    [error, setError] = useState<string | null>(null),
    [provider, setProvider] = useState<any>(null),
    [telemetry, setTelemetry] = useState<TelemetryEnvelope | null>(null);
  const generation = useRef(0),
    userRef = useRef<Principal | null>(null),
    prefsQueue = useRef(Promise.resolve());
  const clear = useCallback(() => {
    generation.current++;
    bindViewer(null);
    userRef.current = null;
    setUser(null);
    setState(initial);
    setProvider(null);
    setTelemetry(null);
  }, []);
  const refresh = useCallback(async () => {
    const seq = ++generation.current;
    if (!userRef.current) setReady(false);
    try {
      const auth = await api.status();
      if (seq !== generation.current) return;
      setSetup(auth.setupRequired);
      if (!auth.user) {
        clear();
        setError(null);
        setReady(true);
        return;
      }
      const actor = auth.user;
      if (userRef.current?.id !== actor.id || userRef.current.authVersion !== actor.authVersion) {
        setReady(false);
        setState(initial);
        setTelemetry(null);
        setProvider(null);
      }
      userRef.current = actor;
      setUser(actor);
      bindViewer(actor.id);
      if (actor.mustChangePassword) {
        setState({ ...initial, role: actor.role });
        setError(null);
        return;
      }
      const data = await request('/api/workspace');
      if (seq !== generation.current) return;
      setState({
        ...initial,
        ...data.preferences,
        role: actor.role,
        buses: data.buses,
        recorders: adaptDevices(data.devices, data.buses),
      });
      setProvider(data.provider);
      bindProvider(data.provider?.connectionId ?? null);
      setTelemetry(data.telemetry);
      setError(null);
    } catch (e) {
      if (seq === generation.current) {
        if (e instanceof ApiError && e.status === 401) clear();
        setError(e instanceof Error ? e.message : 'Could not load workspace.');
      }
    } finally {
      if (seq === generation.current) setReady(true);
    }
  }, [clear]);
  const refreshDevices = useCallback(async () => {
    const actor = userRef.current;
    if (!actor || actor.role === 'superadmin') return;
    const seq = generation.current;
    let data: any;
    try {
      data = await request('/api/devices');
    } catch (error) {
      const status = await request('/api/status').catch(() => null);
      if (seq === generation.current && actor.id === userRef.current?.id && status) {
        setProvider(status);
        bindProvider(status.connectionId ?? null);
        if (!status.connected) setState((s) => ({ ...s, recorders: [] }));
      }
      throw error;
    }
    const status = await request('/api/status');
    if (seq !== generation.current || actor.id !== userRef.current?.id) return;
    setState((s) => ({ ...s, recorders: adaptDevices(data.devices, s.buses) }));
    setProvider(status);
    bindProvider(status.connectionId ?? null);
  }, []);
  useEffect(() => {
    // Retire the former browser-local demo; no business data or roles are restored from it.
    localStorage.removeItem('rgu-preview-v1');
    void refresh();
    const expire = () => {
      clear();
      setReady(true);
      setError('Your viewer session expired. Sign in again.');
    };
    const changed = () => {
      clear();
      void refresh();
    };
    addEventListener('rgu-session-expired', expire);
    addEventListener('rgu-account-changed', changed);
    const channel =
      typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('rgu-viewer-session') : null;
    if (channel)
      channel.onmessage = (event) => {
        if (event.data?.sender !== sessionSender) changed();
      };
    return () => {
      generation.current++;
      removeEventListener('rgu-session-expired', expire);
      removeEventListener('rgu-account-changed', changed);
      channel?.close();
    };
  }, [refresh, clear]);
  useEffect(() => {
    if (!user || user.mustChangePassword) return;
    const id = setInterval(
      () =>
        void (async () => {
          try {
            const auth = await api.status();
            if (
              !auth.user ||
              auth.user.id !== userRef.current?.id ||
              auth.user.authVersion !== userRef.current.authVersion
            ) {
              clear();
              await refresh();
              return;
            }
            if (auth.user.role !== 'superadmin') {
              const data = await fleetApi.telemetry();
              if (userRef.current?.id === auth.user.id) setTelemetry(data);
            }
          } catch {}
        })(),
      15000,
    );
    return () => clearInterval(id);
  }, [user?.id, user?.authVersion, refresh, clear]);
  useEffect(() => {
    if (!user || !provider?.connected) return;
    const update = () => void refreshDevices().catch((e) => toast.error(e.message));
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [user?.id, provider?.connectionId, provider?.connected, refreshDevices]);
  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme;
    document.documentElement.dataset.motion = state.settings.reduceMotion ? 'reduced' : 'full';
  }, [state.settings]);
  const patch = useCallback((change: Partial<Preferences>) => {
    const actor = userRef.current?.id,
      seq = generation.current;
    const task = prefsQueue.current
      .catch(() => {})
      .then(async () => {
        if (actor !== userRef.current?.id || seq !== generation.current) return;
        const data = await request<Preferences>('/api/ui/preferences', change);
        if (actor === userRef.current?.id && seq === generation.current)
          setState((s) => ({ ...s, ...data }));
      });
    prefsQueue.current = task;
    task.catch((e) => toast.error(e.message));
    return task;
  }, []);
  async function saveBus(bus: Bus) {
    await fleetApi.saveBus(bus);
    await refresh();
  }
  async function removeBus(id: string) {
    await fleetApi.removeBus(id);
    await refresh();
  }
  async function signOut() {
    await api.logout();
    clear();
    broadcastViewerChange();
  }
  return (
    <Workspace.Provider
      value={{
        state,
        ready,
        user,
        setupRequired,
        error,
        provider,
        telemetry,
        refresh,
        refreshDevices,
        patch,
        log: () => {},
        reset: () => {
          void patch(defaults);
        },
        saveBus,
        removeBus,
        signOut,
      }}
    >
      {children}
    </Workspace.Provider>
  );
}
export function useWorkspace() {
  const value = useContext(Workspace);
  if (!value) throw Error('Workspace provider required');
  return value;
}
