import { describe, it, expect } from 'vitest';
import { canAccess, gridFor, formatBytes, safeFilename, channelName } from '../../src/lib/model';
describe('display and navigation policies', () => {
  it('keeps platform pages restricted', () => {
    expect(canAccess('admin', 'platform')).toBe(false);
    expect(canAccess('member', 'health')).toBe(false);
    expect(canAccess('superadmin', 'health')).toBe(true);
  });
  it('does not grant member administration', () => {
    expect(canAccess('member', 'team')).toBe(false);
    expect(canAccess('member', 'activity')).toBe(false);
    expect(canAccess('member', 'cameras')).toBe(true);
  });
  it('chooses layouts for actual channel counts', () => {
    expect(gridFor(1)).toBe(1);
    expect(gridFor(4)).toBe(4);
    expect(gridFor(8)).toBe(9);
    expect(gridFor(16)).toBe(16);
  });
  it('formats display values safely', () => {
    expect(formatBytes(0)).toBe('0 MB');
    expect(formatBytes(1500000000)).toBe('1.50 GB');
    expect(safeFilename('../test/x')).not.toContain('/');
    expect(channelName(9)).toBe('Camera 09');
  });
});
