import { it, expect } from 'vitest';
import { withinTamilNaduView, defaultTileUrl } from '../../src/lib/map-config';
it('regional viewing limits include Coimbatore and Chennai without accepting invalid/global positions', () => {
  expect(withinTamilNaduView(10.932, 76.978)).toBe(true);
  expect(withinTamilNaduView(13.08, 80.27)).toBe(true);
  expect(withinTamilNaduView(28.61, 77.21)).toBe(false);
  expect(withinTamilNaduView(NaN, 76.9)).toBe(false);
  expect(defaultTileUrl).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
});
