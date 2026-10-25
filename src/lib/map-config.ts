// Approximate viewing rectangle, not an administrative boundary polygon.
export const tamilNaduBounds: [number, number][] = [
  [7.8, 76.0],
  [13.7, 80.5],
];
export const defaultTileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export function withinTamilNaduView(lat: number, lon: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= 7.8 &&
    lat <= 13.7 &&
    lon >= 76 &&
    lon <= 80.5
  );
}
