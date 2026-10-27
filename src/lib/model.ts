export type Role = 'admin' | 'member' | 'superadmin';
export type Channel = {
  number: number;
  name: string;
  canRecord: boolean;
  canDownload: boolean;
  health: 'working' | 'unavailable' | 'unknown';
  healthCode?: string | null;
  healthCheckedAt?: string | null;
};
export type Recorder = {
  id: string;
  name: string;
  location: string;
  online: boolean;
  status: string;
  channels: number;
  channelList: Channel[];
  vehicle: string;
  checkedAt?: string;
  source?: string;
};
export type Member = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  active: boolean;
  recorders: string[];
  canRecord: boolean;
  canDownload: boolean;
};
export type Clip = {
  id: string;
  name: string;
  camera: string;
  created: string;
  bytes: number;
  type: string;
  url?: string;
  downloadUrl?: string;
  canDownload?: boolean;
  canDelete?: boolean;
  audio?: boolean;
  deviceId?: string;
  channel?: number;
};
export type Audit = {
  id: string;
  time: string;
  actor: string;
  action: string;
  target: string;
  category: string;
};
export type SavedLayout = { id: string; name: string; recorder: string; grid: number; fit: string };
export type Settings = {
  retention: number;
  quality: 'auto' | 'hd' | 'sd';
  fit: 'contain' | 'cover';
  theme: 'dark' | 'light';
  rotation: number;
  reduceMotion: boolean;
  pureSite?: boolean;
};
export type Principal = {
  id: string;
  tenantId: string | null;
  tenantName?: string;
  email: string;
  fullName: string;
  role: Role;
  mustChangePassword: boolean;
  authVersion: number;
};
export function channelName(channel: number, recorder?: Recorder) {
  return (
    recorder?.channelList.find((c) => c.number === channel)?.name ||
    'Camera ' + String(channel).padStart(2, '0')
  );
}
export function formatBytes(n: number) {
  if (!n) return '0 MB';
  return n >= 1e9 ? (n / 1e9).toFixed(2) + ' GB' : (n / 1e6).toFixed(1) + ' MB';
}
export function gridFor(channels: number) {
  return channels <= 1 ? 1 : channels <= 4 ? 4 : channels <= 9 ? 9 : 16;
}
export function canAccess(role: Role, area: string) {
  if (['platform', 'health'].includes(area)) return role === 'superadmin';
  if (area === 'team') return role === 'admin';
  if (area === 'activity') return role !== 'member';
  return role !== 'superadmin' || area === 'settings';
}
export function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 100) || 'camera';
}
