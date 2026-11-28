import type { Recorder } from './model';
export type Bus = {
  id: string;
  busNumber: string;
  registration: string;
  driverName: string;
  driverPhone: string;
  driverId?: string | null;
  routeName: string;
  recorderId: string | null;
  telemetryDeviceId: string | null;
  speedLimitKph?: number;
  favoriteChannels: number[];
};
export type Driver = {
  id: string;
  fullName: string;
  phone: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  assignments: { id: string; busNumber: string; registration: string }[];
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
export const TELEMETRY_FRESH_SECONDS = 120;
export function telemetryAge(vehicle: Vehicle | undefined, now: number) {
  return !vehicle
    ? 'unmapped'
    : now - vehicle.gpsTime > TELEMETRY_FRESH_SECONDS
      ? 'stale'
      : 'fresh';
}
export function timeLabel(seconds: number) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(seconds * 1000);
}
export type GpsState = 'online' | 'offline' | 'unmapped';
export const DEFAULT_SPEED_LIMIT_KPH = 60;
/** A mapped GPS device is online only while its latest reading is fresh and not reported OFFLINE. */
export function gpsState(bus: Bus, vehicle: Vehicle | undefined, now: number): GpsState {
  if (!bus.telemetryDeviceId) return 'unmapped';
  if (!vehicle || vehicle.status === 'OFFLINE' || telemetryAge(vehicle, now) !== 'fresh')
    return 'offline';
  return 'online';
}
export function isOverspeed(bus: Bus, vehicle: Vehicle | undefined, now: number) {
  if (!vehicle || telemetryAge(vehicle, now) !== 'fresh') return false;
  return (
    vehicle.speedViolation === true ||
    vehicle.speed > (bus.speedLimitKph ?? DEFAULT_SPEED_LIMIT_KPH)
  );
}
export type GpsSummary = {
  total: number;
  online: number;
  offline: number;
  unmapped: number;
  overspeedNow: number;
};
export function gpsSummary(buses: Bus[], vehicles: Vehicle[], now: number): GpsSummary {
  const summary: GpsSummary = { total: 0, online: 0, offline: 0, unmapped: 0, overspeedNow: 0 };
  for (const bus of buses) {
    const vehicle = vehicles.find((v) => v.deviceId === bus.telemetryDeviceId),
      state = gpsState(bus, vehicle, now);
    if (state === 'unmapped') summary.unmapped++;
    else {
      summary.total++;
      summary[state]++;
    }
    if (isOverspeed(bus, vehicle, now)) summary.overspeedNow++;
  }
  return summary;
}

export type OperationsMetric = {
  total: number;
  active: number;
  inactive: number;
  pending?: number;
};
export type OperationsSummary = {
  buses: OperationsMetric;
  cameras: OperationsMetric & { checkedAt: string | null };
  gps: OperationsMetric;
};

/** Live operational totals used by the fleet overview dashboard. */
export function operationsSummary(
  buses: Bus[],
  vehicles: Vehicle[],
  recorders: Recorder[],
  now: number,
): OperationsSummary {
  const runningBuses = buses.filter((bus) => {
    const vehicle = vehicles.find((item) => item.deviceId === bus.telemetryDeviceId);
    return gpsState(bus, vehicle, now) === 'online' && (vehicle?.speed ?? 0) > 0;
  }).length;
  const totalCameras = recorders.reduce((total, recorder) => total + recorder.channels, 0);
  const activeCameras = recorders.reduce(
    (total, recorder) => total + workingChannels(recorders, recorder.id).length,
    0,
  );
  const offlineCameras = recorders.reduce(
    (total, recorder) =>
      total + recorder.channelList.filter((channel) => channel.health === 'unavailable').length,
    0,
  );
  const cameraCheckedAt =
    recorders
      .flatMap((recorder) => recorder.channelList)
      .map((channel) => channel.healthCheckedAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;
  const gps = gpsSummary(buses, vehicles, now);
  return {
    buses: {
      total: buses.length,
      active: runningBuses,
      inactive: Math.max(0, buses.length - runningBuses),
    },
    cameras: {
      total: totalCameras,
      active: activeCameras,
      inactive: offlineCameras,
      pending: Math.max(0, totalCameras - activeCameras - offlineCameras),
      checkedAt: cameraCheckedAt,
    },
    gps: {
      total: gps.total,
      active: gps.online,
      inactive: gps.offline,
    },
  };
}
