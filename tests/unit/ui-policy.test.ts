import { it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

it('keeps photo assets, emoji icons and native JS dialogs out of the frontend', () => {
  const source = files('src')
    .filter((path) => /\.tsx?$/.test(path))
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');
  expect(source).not.toMatch(/(?:window\.)?(?:alert|confirm|prompt)\s*\(/);
  expect(source).not.toMatch(/images\.unsplash|imagegen|\p{Extended_Pictographic}/u);
  expect(source).not.toMatch(
    /\b(?:mockVehicle|mockEnvelope|mockHistory|sampleMembers|sampleBuses)\b/,
  );
  expect(source).not.toContain('export const recorders');
  expect(files('public').some((path) => /\.(jpg|jpeg|png|webp|avif)$/i.test(path))).toBe(false);
});
