'use client';

import { AsciiSkeleton } from 'ascii-reveal';

export function AsciiLoading({
  label = 'Loading workspace data...',
  cards = 3,
  compact = false,
  shell = false,
}: {
  label?: string;
  cards?: number;
  compact?: boolean;
  shell?: boolean;
}) {
  return (
    <div
      className={`ascii-loading ${compact ? 'ascii-loading-compact' : ''} ${
        shell ? 'ascii-loading-shell' : ''
      }`}
      role="status"
      aria-busy="true"
    >
      <div className="ascii-skeleton-grid" aria-hidden="true">
        {Array.from({ length: cards }, (_, index) => (
          <div className="ascii-skeleton-card" key={index}>
            <AsciiSkeleton
              as="div"
              variant="terminal"
              lines={compact ? 2 : 4}
              widths={compact ? ['52%', '84%'] : ['38%', '78%', '92%', '64%']}
              seed={index + 1}
            />
          </div>
        ))}
      </div>
      <span className="ascii-loading-label">{label}</span>
    </div>
  );
}
