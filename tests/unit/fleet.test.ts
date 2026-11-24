import { it, expect } from 'vitest';
import {
  validateBus,
  workingChannels,
  cameraChannels,
  telemetryAge,
  gpsState,
  gpsSummary,
  operationsSummary,
  isOverspeed,
  type Bus,
  type Vehicle,
} from '../../src/lib/fleet';
import type { Recorder } from '../../src/lib/model';
const bus: Bus = {
  id: 'a',
  busNumber: 'A',
  registration: 'X',
  driverName: 'Driver',
  driverPhone: '',
  routeName: '',
  recorderId: null,
  telemetryDeviceId: null,
  favoriteChannels: [],
};
it('requires actual bus details and prevents duplicate mappings', () => {
  expect(validateBus({ ...bus, busNumber: '' }, [])).toMatch(/Enter/);
  expect(validateBus({ ...bus, id: 'b' }, [bus])).toMatch(/already/);
  expect(validateBus(bus, [])).toBeNull();
});
it('never creates channels when backend inventory is empty', () => {
  expect(workingChannels([], 'not-imported')).toEqual([]);
  expect(cameraChannels(bus, [])).toEqual([]);
});
it('missing telemetry is not interpreted as zero fuel', () => {
  expect(telemetryAge(undefined, 123)).toBe('unmapped');
});
const NOW = 10_000;
const vehicle = (over: Partial<Vehicle>): Vehicle => ({
  vehicleNumber: 'TN',
  deviceId: 'D1',
  status: 'MOVING',
  speed: 30,
  odometer: 0,
  gpsTime: NOW - 10,
  location: { latitude: 0, longitude: 0, address: '' },
  ignition: true,
  fuelData: null,
  ...over,
});
it('classifies GPS devices as online, offline or unmapped', () => {
  const mapped = { ...bus, telemetryDeviceId: 'D1' };
  expect(gpsState(bus, undefined, NOW)).toBe('unmapped');
  expect(gpsState(mapped, undefined, NOW)).toBe('offline');
  expect(gpsState(mapped, vehicle({}), NOW)).toBe('online');
  expect(gpsState(mapped, vehicle({ gpsTime: NOW - 500 }), NOW)).toBe('offline');
  expect(gpsState(mapped, vehicle({ status: 'OFFLINE' }), NOW)).toBe('offline');
});
it('counts GPS totals so online plus offline equals mapped devices', () => {
  const buses: Bus[] = [
    { ...bus, id: '1', telemetryDeviceId: 'D1', speedLimitKph: 40 },
    { ...bus, id: '2', telemetryDeviceId: 'D2' },
    { ...bus, id: '3', telemetryDeviceId: null },
  ];
  const vehicles = [
    vehicle({ deviceId: 'D1', speed: 55 }),
    vehicle({ deviceId: 'D2', gpsTime: 1 }),
  ];
  expect(gpsSummary(buses, vehicles, NOW)).toEqual({
    total: 2,
    online: 1,
    offline: 1,
    unmapped: 1,
    overspeedNow: 1,
  });
});
it('flags overspeed only for fresh readings above the bus limit', () => {
  const limited = { ...bus, telemetryDeviceId: 'D1', speedLimitKph: 50 };
  expect(isOverspeed(limited, vehicle({ speed: 51 }), NOW)).toBe(true);
  expect(isOverspeed(limited, vehicle({ speed: 50 }), NOW)).toBe(false);
  expect(isOverspeed(limited, vehicle({ speed: 90, gpsTime: 1 }), NOW)).toBe(false);
  expect(isOverspeed(bus, vehicle({ speed: 61 }), NOW)).toBe(true);
});
it('summarizes live buses, verified cameras and online GPS devices', () => {
  const buses: Bus[] = [
    { ...bus, id: '1', recorderId: 'R1', telemetryDeviceId: 'D1' },
    { ...bus, id: '2', telemetryDeviceId: 'D2' },
    { ...bus, id: '3' },
  ];
  const recorders: Recorder[] = [
    {
      id: 'R1',
      name: 'Bus DVR',
      location: '',
      online: true,
      status: 'online',
      channels: 4,
      channelList: [
        { number: 1, name: 'Front', canRecord: true, canDownload: true, health: 'working' },
        { number: 2, name: 'Rear', canRecord: true, canDownload: true, health: 'unknown' },
      ],
      vehicle: '',
    },
  ];
  expect(
    operationsSummary(
      buses,
      [vehicle({ deviceId: 'D1', speed: 25 }), vehicle({ deviceId: 'D2', speed: 0 })],
      recorders,
      NOW,
    ),
  ).toEqual({
    buses: { total: 3, active: 1, inactive: 2 },
    cameras: { total: 4, active: 1, inactive: 3 },
    gps: { total: 2, active: 2, inactive: 0 },
  });
});
