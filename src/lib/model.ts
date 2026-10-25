export type Role = 'admin' | 'member' | 'superadmin';
export type Recorder = {
  id: string;
  name: string;
  location: string;
  online: boolean;
  channels: number;
  vehicle: string;
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
};
export type Audit = {
  id: string;
  time: string;
  actor: string;
  action: string;
  target: string;
  category: 'access' | 'camera' | 'recording' | 'settings';
};
export type SavedLayout = { id: string; name: string; recorder: string; grid: number; fit: string };
export type Settings = {
  retention: number;
  quality: 'auto' | 'hd' | 'sd';
  fit: 'contain' | 'cover';
  theme: 'dark' | 'light';
  rotation: number;
  reduceMotion: boolean;
};
export const recorders: Recorder[] = [
  {
    id: 'kpm-3',
    name: 'KPM 3',
    location: 'Onboard bus recorder',
    online: true,
    channels: 8,
    vehicle: 'Campus shuttle',
  },
  {
    id: 'kpm-5',
    name: 'KPM 5',
    location: 'Onboard bus recorder',
    online: true,
    channels: 8,
    vehicle: 'Transport depot',
  },
  {
    id: 'kpm-1',
    name: 'KPM 1',
    location: 'Onboard bus recorder',
    online: true,
    channels: 8,
    vehicle: 'Campus shuttle',
  },
  {
    id: 'kpm-2',
    name: 'KPM 2',
    location: 'Onboard bus recorder',
    online: true,
    channels: 16,
    vehicle: 'Campus shuttle',
  },
  {
    id: 'kpm-4',
    name: 'KPM Bus 4',
    location: 'Onboard bus recorder',
    online: false,
    channels: 8,
    vehicle: 'Route shuttle',
  },
];
export const sampleMembers: Member[] = [
  {
    id: 'member-1',
    name: 'Alex Morgan',
    email: 'alex@example.test',
    role: 'admin',
    active: true,
    recorders: recorders.map((r) => r.id),
    canRecord: true,
    canDownload: true,
  },
  {
    id: 'member-2',
    name: 'Priya Shah',
    email: 'priya@example.test',
    role: 'member',
    active: true,
    recorders: ['kpm-3', 'kpm-5'],
    canRecord: true,
    canDownload: false,
  },
  {
    id: 'member-3',
    name: 'Jordan Lee',
    email: 'jordan@example.test',
    role: 'member',
    active: false,
    recorders: ['kpm-1'],
    canRecord: false,
    canDownload: false,
  },
];
export const cameraNames = [
  'Main entrance',
  'Front cabin',
  'Passenger aisle',
  'Rear entrance',
  'Left exterior',
  'Right exterior',
  'Driver cabin',
  'Rear exterior',
];
export function channelName(channel: number) {
  return cameraNames[(channel - 1) % cameraNames.length];
}
export function formatBytes(n: number) {
  if (!n) return '0 MB';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} GB`;
  return `${(n / 1e6).toFixed(1)} MB`;
}
export function gridFor(channels: number) {
  return channels <= 1 ? 1 : channels <= 4 ? 4 : channels <= 9 ? 9 : 16;
}
export function canAccess(role: Role, area: string) {
  if (['platform', 'health'].includes(area)) return role === 'superadmin';
  if (['team', 'activity'].includes(area)) return role !== 'member';
  return true;
}
export function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 100) || 'camera';
}
