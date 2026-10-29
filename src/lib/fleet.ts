import type { Recorder } from './model';
export type Bus = {
  id: string;
  busNumber: string;
  registration: string;
  driverName: string;
  driverPhone: string;
  routeName: string;
  recorderId: string | null;
  telemetryDeviceId: string | null;
  speedLimitKph?: number;
  favoriteChannels: number[];
};
export type Vehicle = {
  vehicleNumber: string;
  deviceId: string;
  status: 'MOVING' | 'STOPPED' | 'IDLE' | 'OFFLINE';
  speed: number;
  angle?: number;
  chargeOn?: boolean;
  accurate?: boolean;
  moved?: boolean;
  speedLimitKph?: number;
  speedViolation?: boolean;
  odometer: number;
  gpsTime: number;
  providerGpsTime?: number;
  location: { latitude: number; longitude: number; address: string };
  ignition: boolean;
  fuelData: { currentLiters: number; fuelPercentage: number } | null;
};
export type TelemetryEnvelope = {
  message: string;
  success: boolean;
  serverTime: number;
  source?: 'mock' | 'vendor';
  data: { pageNo: number; totalPage: number; vehicles: Vehicle[] };
};
export function workingChannels(recorders: Recorder[], id: string | null) {
  return (
    recorders
      .find((r) => r.id === id && r.online)
      ?.channelList.filter((c) => c.health === 'working')
      .map((c) => c.number) ?? []
  );
}
export function cameraChannels(bus: Bus, recorders: Recorder[]) {
  return workingChannels(recorders, bus.recorderId).filter((n) => bus.favoriteChannels.includes(n));
}
export function validateBus(bus: Bus, buses: Bus[]) {
  if (!bus.busNumber.trim() || !bus.registration.trim() || !bus.driverName.trim())
    return 'Enter a bus number, registration and driver name.';
  if (
    buses.some(
      (b) =>
        b.id !== bus.id &&
        (b.busNumber.toLowerCase() === bus.busNumber.toLowerCase() ||
          b.registration.toUpperCase() === bus.registration.toUpperCase()),
    )
  )
    return 'Bus number or registration is already in use.';
  if (bus.recorderId && buses.some((b) => b.id !== bus.id && b.recorderId === bus.recorderId))
    return 'Recorder is already assigned.';
  if (
    bus.telemetryDeviceId &&
    buses.some((b) => b.id !== bus.id && b.telemetryDeviceId === bus.telemetryDeviceId)
  )
    return 'Telemetry device is already assigned.';
  return null;
}
export function telemetryAge(vehicle: Vehicle | undefined, now: number) {
  return !vehicle ? 'unmapped' : now - vehicle.gpsTime > 120 ? 'stale' : 'fresh';
}
export function timeLabel(seconds: number) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(seconds * 1000);
}
