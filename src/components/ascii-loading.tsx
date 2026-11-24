'use client';

import type { CSSProperties } from 'react';
import { AsciiSkeleton } from 'ascii-reveal';

/**
 * Neutral placeholder for every route except the main dashboard. The ASCII
 * loading effect is reserved for the first dashboard paint.
 */
export function LoadingBlock({
  label = 'Loading...',
  rows = 3,
}: {
  label?: string;
  rows?: number;
}) {
  return (
    <div
      className="loading-block"
      role="status"
      aria-busy="true"
      aria-label={label}
      data-ascii="skip"
    >
      <div className="loading-block-heading" aria-hidden="true">
        <span className="skeleton" />
        <span className="skeleton" />
        <span className="skeleton" />
      </div>
      <div className="loading-block-rows" aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <span className="skeleton" key={index} />
        ))}
      </div>
      <span className="loading-block-label">{label}</span>
    </div>
  );
}

export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="skeleton-rows" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <span className="skeleton" key={index} />
      ))}
    </div>
  );
}

/**
 * Loading skeleton that mirrors the real fleet overview: heading, source
 * banner, four stat cards, toolbar, filter tabs and the bus card grid.
 */
export function FleetOverviewSkeleton({ directory = false }: { directory?: boolean }) {
  const label = directory ? 'Loading bus directory...' : 'Loading fleet overview...';
  const gridStyle = {
    '--bus-columns': 3,
    '--bus-card-height': '440px',
  } as CSSProperties;

  return (
    <div
      className={`fleet-overview-skeleton ${directory ? 'is-directory' : ''}`}
      role="status"
      aria-busy="true"
      aria-label={label}
      data-ascii="skip"
    >
      {directory ? (
        <div className="bus-directory-heading fleet-skeleton-directory-heading" aria-hidden="true">
          <div>
            <span className="skeleton fleet-skeleton-title" />
            <span className="skeleton fleet-skeleton-chip" />
          </div>
          <div className="bus-directory-actions">
            <span className="skeleton fleet-skeleton-button" />
          </div>
        </div>
      ) : (
        <div className="page-heading" aria-hidden="true">
          <div className="fleet-skeleton-heading">
            <span className="skeleton" />
            <span className="skeleton" />
            <span className="skeleton" />
          </div>
          <div className="heading-actions">
            <span className="skeleton fleet-skeleton-button" />
            <span className="skeleton fleet-skeleton-button" />
          </div>
        </div>
      )}

      {!directory && (
        <>
          <div className="fleet-source fleet-skeleton-source" aria-hidden="true">
            <span className="skeleton fleet-skeleton-dot" />
            <span className="skeleton fleet-skeleton-line" />
            <span className="skeleton fleet-skeleton-line wide" />
          </div>
          <div className="stats-grid" aria-hidden="true">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="stat-card" key={index}>
                <AsciiSkeleton
                  variant="dither"
                  lines={3}
                  widths={['52%', '34%', '78%']}
                  seed={index + 1}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {directory ? (
        <div className="bus-directory-tools" aria-hidden="true">
          <div className="segmented fleet-filters fleet-skeleton-filters">
            <span className="skeleton fleet-skeleton-tab" />
            <span className="skeleton fleet-skeleton-tab" />
            <span className="skeleton fleet-skeleton-tab" />
          </div>
          <span className="skeleton fleet-skeleton-search" />
        </div>
      ) : (
        <>
          <div className="fleet-toolbar" aria-hidden="true">
            <div className="fleet-skeleton-toolbar-copy">
              <span className="skeleton fleet-skeleton-line heading" />
              <span className="skeleton fleet-skeleton-line wide" />
            </div>
            <span className="skeleton fleet-skeleton-search" />
            <span className="skeleton fleet-skeleton-density" />
          </div>

          <div className="segmented fleet-filters fleet-skeleton-filters" aria-hidden="true">
            <span className="skeleton fleet-skeleton-tab" />
            <span className="skeleton fleet-skeleton-tab" />
            <span className="skeleton fleet-skeleton-tab" />
          </div>
        </>
      )}

      <div className="fleet-bus-grid" style={gridStyle} aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="fleet-skeleton-bus" key={index}>
            <AsciiSkeleton
              variant="dither"
              lines={9}
              widths={['46%', '68%', '52%', '84%', '58%', '88%', '72%', '90%', '64%']}
              seed={index + 1}
            />
          </div>
        ))}
      </div>

      <span className="loading-block-label">{label}</span>
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
                <span className="skeleton" />
                <span className="skeleton" />
              </div>
            ))}
          </div>
          <div className="workspace-shell-loading-table" aria-hidden="true">
            {Array.from({ length: 7 }, (_, index) => (
              <span className="skeleton" key={index} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
