'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import { createAsciiReveal, type AsciiRevealController } from 'ascii-reveal/core';
import { useWorkspace } from './workspace-provider';

const scopes =
  '.sidebar, .topbar, .main-content, .admin-command-deck, .modal, .dropdown-content, .rgu-toast';
const surfaces = [
  '[data-ascii="surface"]',
  '.panel',
  '.stat-card',
  '.bus-card',
  '.recorder-card',
  '.clip-card',
  '.admin-metric-card',
  '.admin-workspace-card',
  '.monitor-panel',
  '.timeline-panel',
  '.auth-form-card',
  '.coverage-card',
  '.activity-card',
].join(', ');
const ignored = [
  '.ar-overlay',
  '.ascii-loading',
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
  const { state } = useWorkspace();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const root = rootRef.current;
    if (!root || loading || reducedMotion || state.settings.reduceMotion) return;
    const controllers = new Map<HTMLElement, AsciiRevealController>();
    const pending = new Set<HTMLElement>();
    let frame = 0;
    let disposed = false;
    let fontsReady = false;

    const flush = () => {
      frame = 0;
      if (disposed || !fontsReady) return;
      for (const [scope, controller] of controllers) {
        if (!scope.isConnected) {
          controller.destroy();
          controllers.delete(scope);
        }
      }
      const batch = [...pending].filter(
        (element) => element.isConnected && !element.closest(ignored),
      );
      pending.clear();
      // One wave for a newly inserted section, rather than one per child.
      for (const element of batch.filter(
        (element) => !batch.some((other) => other !== element && other.contains(element)),
      )) {
        const scope = element.closest<HTMLElement>(scopes);
        if (!scope || scope.closest(ignored)) continue;
        let controller = controllers.get(scope);
        const first = !controller;
        if (!controller) {
          controller = createAsciiReveal(scope, {
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
        }
        void controller.reveal(first ? {} : { within: element });
      }
    };
    const schedule = () => {
      if (fontsReady && !frame) frame = requestAnimationFrame(flush);
    };
    const enqueue = (node: Node) => {
      const element =
        node instanceof HTMLElement
          ? node
          : node.nodeType === Node.TEXT_NODE
            ? node.parentElement
            : null;
      if (!element || element.closest(ignored)) return;
      const children = [...element.querySelectorAll<HTMLElement>(scopes)];
      if (children.length) children.forEach((scope) => pending.add(scope));
      else if (element.matches(scopes)) pending.add(element);
      else if (
        element.closest(scopes) &&
        (element.textContent?.trim() || element.matches(surfaces))
      )
        pending.add(element);
      schedule();
    };
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.target instanceof Element && record.target.closest(ignored)) continue;
        if (record.type === 'characterData') {
          if (
            !record.target.parentElement?.closest(
              '[data-ascii-live], .hud-clock, [data-testid="cursor-time"]',
            )
          )
            enqueue(record.target);
          continue;
        }
        if (record.type === 'attributes') {
          enqueue(record.target);
          continue;
        }
        // Retire an old section's canvas when React removes it mid-wave.
        if (
          [...record.removedNodes].some(
            (node) =>
              node instanceof Element &&
              (node.matches('[data-ar-t], [data-ar-s]') ||
                node.querySelector('[data-ar-t], [data-ar-s]')),
          )
        ) {
          const scope =
            record.target instanceof Element ? record.target.closest<HTMLElement>(scopes) : null;
          if (scope) {
            controllers.get(scope)?.destroy();
            controllers.delete(scope);
          }
        }
        record.addedNodes.forEach(enqueue);
      }
      schedule();
    });
    // Portalled menus and dialogs belong to the same reveal system.
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['data-ascii-trigger'],
    });
    void document.fonts.ready.then(() => {
      if (disposed) return;
      fontsReady = true;
      document.body.querySelectorAll<HTMLElement>(scopes).forEach(enqueue);
      schedule();
    });

    return () => {
      disposed = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
      controllers.forEach((controller) => controller.destroy());
    };
  }, [loading, reducedMotion, state.settings.reduceMotion]);

  return (
    <div ref={rootRef} className={className} aria-busy={loading || undefined}>
      {children}
    </div>
  );
}
