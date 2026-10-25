import { recorders } from './model';
export type Bus = {
  id: string;
  busNumber: string;
  registration: string;
  driverName: string;
  driverPhone: string;
  routeName: string;
  recorderId: string | null;
  telemetryDeviceId: string | null;
  favoriteChannels: number[];
};
export type Vehicle = {
  vehicleNumber: string;
  deviceId: string;
  status: 'MOVING' | 'STOPPED' | 'IDLE' | 'OFFLINE';
  speed: number;
  odometer: number;
  gpsTime: number;
  location: { latitude: number; longitude: number; address: string };
  ignition: boolean;
  fuelData: { currentLiters: number; fuelPercentage: number };
};
export type TelemetryEnvelope = {
  message: string;
  success: boolean;
  serverTime: number;
  data: { pageNo: number; totalPage: number; vehicles: Vehicle[] };
};
export type ChannelHealth = 'working' | 'unavailable' | 'unknown';
export const telemetryDevices = [
  'WE-RGU-001',
  'WE-RGU-002',
  'WE-RGU-003',
  'WE-RGU-004',
  'WE-RGU-005',
];
export const sampleBuses: Bus[] = recorders.map((r, i) => ({
  id: 'bus-' + (i + 1),
  busNumber: 'RGU ' + String(i + 1).padStart(2, '0'),
  registration: 'TN 37 DEMO ' + String(i + 1).padStart(3, '0'),
  driverName: ['Arun Kumar', 'S. Prakash', 'M. Ravi', 'K. Senthil', 'R. Saravanan'][i],
  driverPhone: '',
  routeName: [
    'Podanur → RGU',
    'Gandhipuram → RGU',
    'Ukkadam → RGU',
    'Singanallur → RGU',
    'Transport depot',
  ][i],
  recorderId: r.id,
  telemetryDeviceId: telemetryDevices[i],
  favoriteChannels: [1, 2, 3, 4],
}));
// Simulated channel probes, independent of recorder presence. Replace with SDK health.
export function channelHealth(recorderId: string, channel: number): ChannelHealth {
  const recorder = recorders.find((r) => r.id === recorderId);
  if (!recorder || channel < 1 || channel > recorder.channels) return 'unknown';
  if (!recorder.online || channel > 6) return 'unavailable';
  return 'working';
}
export function workingChannels(recorderId: string | null) {
  const r = recorders.find((r) => r.id === recorderId);
  return r
    ? Array.from({ length: r.channels }, (_, i) => i + 1).filter(
        (n) => channelHealth(r.id, n) === 'working',
      )
    : [];
}
export function cameraChannels(bus: Bus) {
  return workingChannels(bus.recorderId).filter((n) => bus.favoriteChannels.includes(n));
}
export function validateBus(bus: Bus, buses: Bus[]) {
  if (!bus.busNumber.trim() || !bus.registration.trim() || !bus.driverName.trim())
    return 'Enter a bus number, registration and driver name.';
  if (
    bus.busNumber.length > 40 ||
    bus.registration.length > 40 ||
    bus.driverName.length > 100 ||
    bus.driverPhone.length > 30 ||
    bus.routeName.length > 100
  )
    return 'One of the details is too long.';
  if (
    buses.some(
      (b) =>
        b.id !== bus.id &&
        (b.busNumber.toLowerCase() === bus.busNumber.toLowerCase() ||
          b.registration.toUpperCase() === bus.registration.toUpperCase()),
    )
  )
    return 'This bus number or registration is already in use.';
  if (bus.recorderId && buses.some((b) => b.id !== bus.id && b.recorderId === bus.recorderId))
    return 'This recorder is already mapped to another bus.';
  if (
    bus.telemetryDeviceId &&
    buses.some((b) => b.id !== bus.id && b.telemetryDeviceId === bus.telemetryDeviceId)
  )
    return 'This telemetry device is already mapped to another bus.';
  return null;
}
// Deterministic by device and minute, matching the Windows mock adapter.
export function mockVehicle(deviceId: string, vehicleNumber: string, gpsTime: number): Vehicle {
  const seed = [...deviceId].reduce((n, c) => n + c.charCodeAt(0), 0);
  const step = Math.floor(gpsTime / 60),
    phase = (step + seed) % 120,
    angle = (phase / 120) * Math.PI * 2,
    moving = phase % 30 < 24;
  return {
    vehicleNumber,
    deviceId,
    status: moving ? 'MOVING' : 'STOPPED',
    speed: moving ? Number((28 + 12 * Math.sin(angle)).toFixed(1)) : 0,
    odometer: Number((45210 + (step % 1440) * 0.15 + seed).toFixed(1)),
    gpsTime,
    location: {
      latitude: Number((10.932 + 0.018 * Math.sin(angle)).toFixed(6)),
      longitude: Number((76.978 + 0.025 * Math.cos(angle)).toFixed(6)),
      address: 'Simulated Coimbatore route · not an actual bus location',
    },
    ignition: moving,
    fuelData: {
      currentLiters: Number((140 - phase * 0.12).toFixed(1)),
      fuelPercentage: Number((((140 - phase * 0.12) / 200) * 100).toFixed(1)),
    },
  };
}
export function mockEnvelope(buses: Bus[], now: number): TelemetryEnvelope {
  const time = Math.floor(now / 60) * 60;
  return {
    message: 'Ok',
    success: true,
    serverTime: time,
    data: {
      pageNo: 0,
      totalPage: 1,
      vehicles: buses
        .filter((b) => b.telemetryDeviceId)
        .map((b) => mockVehicle(b.telemetryDeviceId!, b.registration, time)),
    },
  };
}
export function mockHistory(bus: Bus, now: number, minutes = 120): Vehicle[] {
  if (!bus.telemetryDeviceId) return [];
  const time = Math.floor(now / 60) * 60;
  return Array.from({ length: minutes + 1 }, (_, i) =>
    mockVehicle(bus.telemetryDeviceId!, bus.registration, time - (minutes - i) * 60),
  );
}
export function telemetryAge(vehicle: Vehicle | undefined, now: number) {
  if (!vehicle) return 'unmapped';
  return now - vehicle.gpsTime > 120 ? 'stale' : 'fresh';
}
export function timeLabel(seconds: number) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(seconds * 1000);
}
