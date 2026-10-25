import { describe, it, expect } from 'vitest';
import {
  canAccess,
  gridFor,
  formatBytes,
  safeFilename,
  recorders,
  channelName,
} from '../../src/lib/model';
describe('viewer policies and display helpers', () => {
  it('keeps platform views out of admin/member navigation', () => {
    for (const role of ['admin', 'member'] as const) {
      expect(canAccess(role, 'platform')).toBe(false);
      expect(canAccess(role, 'health')).toBe(false);
    }
    expect(canAccess('superadmin', 'health')).toBe(true);
  });
  it('separates member viewing from administrative views', () => {
    expect(canAccess('member', 'team')).toBe(false);
    expect(canAccess('member', 'activity')).toBe(false);
    expect(canAccess('member', 'cameras')).toBe(true);
  });
  it('chooses grids which fit the existing 8 and 16 channel recorders', () => {
    expect(gridFor(1)).toBe(1);
    expect(gridFor(4)).toBe(4);
    expect(gridFor(8)).toBe(9);
    expect(gridFor(16)).toBe(16);
  });
  it('keeps sample inventory coherent', () => {
    expect(recorders.reduce((n, r) => n + r.channels, 0)).toBe(48);
    expect(recorders.filter((r) => r.online)).toHaveLength(4);
    expect(channelName(9)).toBe(channelName(1));
  });
  it('formats bytes and limits exported filenames', () => {
    expect(formatBytes(0)).toBe('0 MB');
    expect(formatBytes(1500000000)).toBe('1.50 GB');
    expect(safeFilename('../camera/01')).not.toContain('/');
    expect(safeFilename('x'.repeat(150))).toHaveLength(100);
  });
});
