'use client';

import { AsciiSkeleton, type SkeletonVariant } from 'ascii-reveal';

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
    <div
      className={`ascii-skeleton-grid ${compact ? 'ascii-skeleton-grid-compact' : ''}`}
      aria-hidden="true"
    >
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
      data-ascii="skip"
    >
      <SkeletonCards cards={cards} compact={compact} variant={variant} />
      <span className="ascii-loading-label">{label}</span>
    </div>
  );
}

export function WorkspaceShellLoading() {
  return (
    <div
      className="workspace-shell-loading"
      data-ascii="skip"
      role="status"
      aria-label="Checking account session"
      aria-busy="true"
    >
      <aside className="workspace-shell-loading-sidebar" aria-hidden="true">
        <div className="workspace-shell-loading-brand">
          <span className="skeleton" />
          <div>
            <span className="skeleton" />
            <span className="skeleton" />
          </div>
        </div>
        <span className="workspace-shell-loading-caption skeleton" />
        <div className="workspace-shell-loading-nav">
          {Array.from({ length: 6 }, (_, index) => (
            <span className="skeleton" key={index} />
          ))}
        </div>
        <div className="workspace-shell-loading-profile">
          <span className="skeleton" />
          <div>
            <span className="skeleton" />
            <span className="skeleton" />
          </div>
        </div>
      </aside>
      <main className="workspace-shell-loading-main">
        <header className="workspace-shell-loading-topbar" aria-hidden="true">
          <span className="skeleton" />
          <div>
            <span className="skeleton" />
            <span className="skeleton" />
            <span className="skeleton" />
          </div>
        </header>
        <section className="workspace-shell-loading-content">
          <div className="workspace-shell-loading-heading" aria-hidden="true">
            <span className="skeleton" />
            <span className="skeleton" />
            <span className="skeleton" />
          </div>
          <div className="workspace-shell-loading-stats" aria-hidden="true">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="workspace-shell-loading-stat" key={index}>
                <AsciiSkeleton
                  variant="dither"
                  lines={2}
                  widths={['54%', '28%']}
                  seed={index + 1}
                />
              </div>
            ))}
          </div>
          <div className="workspace-shell-loading-table" aria-hidden="true">
            <AsciiSkeleton
              variant="dither"
              lines={7}
              widths={['22%', '96%', '92%', '94%', '88%', '92%', '76%']}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

/**
 * Keep the real loading placeholder until data arrives. The shared site
 * controller reveals the arriving content, avoiding nested decode waves.
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
    <div aria-busy={loading || undefined}>
      {loading ? (
        <div
          className={`ascii-loading ${compact ? 'ascii-loading-compact' : ''}`}
          role="status"
          aria-busy="true"
          data-ascii="skip"
        >
          <SkeletonCards cards={cards} compact={compact} variant={variant} />
        </div>
      ) : (
        children
      )}
    </div>
  );
}
