import { it, expect } from 'vitest';
import {
  validateBus,
  workingChannels,
  cameraChannels,
  telemetryAge,
  type Bus,
} from '../../src/lib/fleet';
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
