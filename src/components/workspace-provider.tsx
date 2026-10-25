'use client';
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { toast } from 'sonner';
import { sampleBuses, type Bus } from '@/lib/fleet';
import {
  type Role,
  type Clip,
  type Member,
  type Audit,
  type SavedLayout,
  type Settings,
  sampleMembers,
} from '@/lib/model';
type State = {
  buses: Bus[];
  role: Role;
  favorites: string[];
  members: Member[];
  clips: Clip[];
  layouts: SavedLayout[];
  audit: Audit[];
  settings: Settings;
  dismissedAlerts: string[];
  approved: string[];
};
const initial: State = {
  buses: sampleBuses,
  role: 'admin',
  favorites: ['kpm-3', 'kpm-5'],
  members: sampleMembers,
  clips: [],
  layouts: [],
  audit: [],
  settings: {
    retention: 7,
    quality: 'auto',
    fit: 'contain',
    theme: 'dark',
    rotation: 30,
    reduceMotion: false,
  },
  dismissedAlerts: [],
  approved: [],
};
type Context = {
  state: State;
  ready: boolean;
  patch: (change: Partial<State>) => void;
  log: (action: string, target: string, category: Audit['category']) => void;
  reset: () => void;
};
const Workspace = createContext<Context | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('rgu-preview-v1');
      if (raw) {
        const saved = JSON.parse(raw);
        setState({
          ...initial,
          ...saved,
          buses: Array.isArray(saved.buses) ? saved.buses : sampleBuses,
          role: ['admin', 'member', 'superadmin'].includes(saved.role) ? saved.role : 'admin',
          settings: { ...initial.settings, ...saved.settings },
        });
      }
    } catch {
      toast.error('Saved preview settings could not be loaded.');
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem('rgu-preview-v1', JSON.stringify(state));
      } catch {
        toast.error('Browser storage is full. Changes will last for this visit.');
      }
    }
    document.documentElement.dataset.theme = state.settings.theme;
    document.documentElement.dataset.motion = state.settings.reduceMotion ? 'reduced' : 'full';
  }, [state, ready]);
  const patch = useCallback((change: Partial<State>) => setState((s) => ({ ...s, ...change })), []);
  const log = useCallback(
    (action: string, target: string, category: Audit['category']) =>
      setState((s) => ({
        ...s,
        audit: [
          {
            id: crypto.randomUUID(),
            time: new Date().toISOString(),
            actor: 'Preview administrator',
            action,
            target,
            category,
          },
          ...s.audit,
        ].slice(0, 200),
      })),
    [],
  );
  const reset = () => {
    setState(initial);
    toast.success('Preview workspace reset.');
  };
  return (
    <Workspace.Provider value={{ state, ready, patch, log, reset }}>{children}</Workspace.Provider>
  );
}
export function useWorkspace() {
  const value = useContext(Workspace);
  if (!value) throw Error('Workspace provider required');
  return value;
}
