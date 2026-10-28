'use client';

import { AsciiSkeleton, type SkeletonVariant } from 'ascii-reveal';
import { TextAsciiReveal } from './text-ascii-reveal';

function SkeletonCards({
  cards,
  compact,
  variant,
}: {
  cards: number;
  compact: boolean;
  variant: SkeletonVariant;
}) {
  return (
    <div className={`ascii-skeleton-grid ${compact ? 'ascii-skeleton-grid-compact' : ''}`} aria-hidden="true">
      {Array.from({ length: cards }, (_, index) => (
        <div className="ascii-skeleton-card" key={index}>
          <AsciiSkeleton
            as="div"
            variant={variant}
            lines={compact ? 2 : 4}
            widths={compact ? ['52%', '84%'] : ['38%', '78%', '92%', '64%']}
            seed={index + 1}
          />
        </div>
      ))}
    </div>
  );
}

export function AsciiLoading({
  label = 'Loading workspace data...',
  cards = 3,
  compact = false,
  shell = false,
  variant = 'dither',
}: {
  label?: string;
  cards?: number;
  compact?: boolean;
  shell?: boolean;
  variant?: SkeletonVariant;
}) {
  return (
    <div
      className={`ascii-loading ${compact ? 'ascii-loading-compact' : ''} ${
        shell ? 'ascii-loading-shell' : ''
      }`}
      role="status"
      aria-busy="true"
    >
      <SkeletonCards cards={cards} compact={compact} variant={variant} />
      <span className="ascii-loading-label">{label}</span>
    </div>
  );
}

/**
 * The same decode treatment used by the shared application reveal, with a
 * skeleton kept in place until asynchronous data is actually available.
 *
 *   <TextAsciiReveal loading={!data}>
 *     {data ? <Profile data={data} /> : <AsciiSkeleton variant="dither" />}
 *   </TextAsciiReveal>
 *
 */
export function AsciiRevealArea({
  loading,
  children,
  cards = 3,
  compact = false,
  variant = 'dither',
}: {
  loading: boolean;
  children: React.ReactNode;
  cards?: number;
  compact?: boolean;
  variant?: SkeletonVariant;
}) {
  return (
    <TextAsciiReveal loading={loading}>
      {loading ? (
        <div
          className={`ascii-loading ${compact ? 'ascii-loading-compact' : ''}`}
          role="status"
          aria-busy="true"
        >
          <SkeletonCards cards={cards} compact={compact} variant={variant} />
        </div>
      ) : (
        children
      )}
    </TextAsciiReveal>
  );
}
