import { describe, it, expect } from 'vitest';
import {
  sampleBuses,
  mockEnvelope,
  mockHistory,
  cameraChannels,
  workingChannels,
  validateBus,
  telemetryAge,
} from '../../src/lib/fleet';
describe('bus-centric fleet model', () => {
  it('uses separate recorder and telemetry identities with one-to-one mappings', () => {
    const bus = {
      ...sampleBuses[0],
      id: 'new',
      busNumber: 'RGU 99',
      registration: 'TN 99 TEST 99',
    };
    expect(validateBus(bus, sampleBuses)).toMatch(/recorder/);
    expect(validateBus({ ...bus, recorderId: null }, sampleBuses)).toMatch(/telemetry/);
    expect(
      validateBus({ ...bus, recorderId: null, telemetryDeviceId: null }, sampleBuses),
    ).toBeNull();
  });
  it('matches the provider envelope and correlates GPS/fuel by device ID, never list order', () => {
    const now = 1782384210,
      envelope = mockEnvelope(sampleBuses, now);
    expect(envelope).toMatchObject({
      message: 'Ok',
      success: true,
      serverTime: 1782384180,
      data: { pageNo: 0, totalPage: 1 },
    });
    const bus = sampleBuses[0],
      v = envelope.data.vehicles.find((v) => v.deviceId === bus.telemetryDeviceId)!;
    expect(v.vehicleNumber).toBe(bus.registration);
    expect(mockHistory(bus, now).at(-1)).toEqual(v);
    expect(v.fuelData.fuelPercentage).toBeGreaterThanOrEqual(0);
    expect(Math.abs(v.location.latitude)).toBeLessThanOrEqual(90);
    expect(
      mockEnvelope([...sampleBuses].reverse(), now).data.vehicles.find(
        (p) => p.deviceId === v.deviceId,
      ),
    ).toEqual(v);
  });
  it('never treats an online recorder as proof every channel works', () => {
    expect(workingChannels('kpm-3')).toEqual([1, 2, 3, 4, 5, 6]);
    expect(workingChannels('kpm-4')).toEqual([]);
    expect(cameraChannels({ ...sampleBuses[0], favoriteChannels: [2, 7, 8] })).toEqual([2]);
    expect(cameraChannels({ ...sampleBuses[0], favoriteChannels: [] })).toEqual([]);
  });
  it('keeps history in chronological Unix seconds and reports stale/unmapped data', () => {
    const samples = mockHistory(sampleBuses[0], 1782384210);
    expect(samples).toHaveLength(121);
    expect(samples[1].gpsTime - samples[0].gpsTime).toBe(60);
    expect(telemetryAge(samples[0], 1782384210)).toBe('stale');
    expect(telemetryAge(samples.at(-1), 1782384210)).toBe('fresh');
    expect(telemetryAge(undefined, 1782384210)).toBe('unmapped');
    expect(mockHistory({ ...sampleBuses[0], telemetryDeviceId: null }, 1782384210)).toEqual([]);
  });
});
