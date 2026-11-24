'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { createAsciiReveal, type AsciiRevealController } from 'ascii-reveal/core';
import { useWorkspace } from './workspace-provider';

const scopes = '.sidebar, .topbar, .main-content';
const surfaces = [
  '[data-ascii="surface"]',
  '.panel',
  '.stat-card',
  '.bus-card',
  '.coverage-card',
  '.activity-card',
].join(', ');
const ignored = [
  '.ar-overlay',
  '.fleet-overview-skeleton',
  '.loading-block',
  '.workspace-shell-loading',
  '[data-ascii-skeleton]',
  '[data-ascii="skip"]',
  '[aria-hidden="true"]',
  '[inert]',
  '[contenteditable="true"]',
  'svg',
  'script',
  'style',
  'input',
  'textarea',
  'select',
  'iframe',
].join(', ');

/**
 * Runs the decode reveal once per page load, only on the main dashboard.
 * Navigation, live updates and dialogs never restart it.
 */
export function TextAsciiReveal({
  children,
  className,
  loading = false,
}: {
  children: ReactNode;
  className?: string;
  loading?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const revealedRef = useRef(false);
  const { state, ready } = useWorkspace();
  const reducedMotion = useReducedMotion();
  const pathname = usePathname();
  const reduceMotion = Boolean(reducedMotion || state.settings.reduceMotion);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || pathname !== '/' || !ready || loading || reduceMotion || revealedRef.current)
      return;

    const controllers = new Map<HTMLElement, AsciiRevealController>();
    let observer: MutationObserver | null = null;
    let timeout = 0;
    let disposed = false;

    const stopWaiting = () => {
      observer?.disconnect();
      observer = null;
      window.clearTimeout(timeout);
    };

    const reveal = () => {
      if (disposed || revealedRef.current) return;
      // Wait for the real dashboard, not the loading skeleton.
      if (!root.querySelector('.fleet-workspace')) return;
      revealedRef.current = true;
      stopWaiting();
      root.querySelectorAll<HTMLElement>(scopes).forEach((scope) => {
        if (scope.closest(ignored)) return;
        const controller = createAsciiReveal(scope, {
          preset: 'decode',
          duration: 'fast',
          speed: 0.8,
          origin: 'top-left',
          surfaces,
          fades: '[data-ascii="fade"]',
          // Operational media and the ambient WebGL background remain live.
          media: ':not(*)',
        });
        controllers.set(scope, controller);
        void controller.reveal({});
      });
    };

    void document.fonts.ready.then(() => {
      if (disposed || revealedRef.current) return;
      reveal();
      if (disposed || revealedRef.current) return;
      // The dashboard is still loading: observe until its content mounts,
      // then reveal once and stop for the rest of this page load.
      observer = new MutationObserver(reveal);
      observer.observe(root, { childList: true, subtree: true });
      timeout = window.setTimeout(stopWaiting, 10_000);
    });

    return () => {
      disposed = true;
      stopWaiting();
      controllers.forEach((controller) => controller.destroy());
    };
  }, [pathname, ready, loading, reduceMotion]);

  return (
    <div ref={rootRef} className={className} aria-busy={loading || undefined}>
      {children}
    </div>
  );
}
