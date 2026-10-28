'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createAsciiReveal } from 'ascii-reveal';

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

  useEffect(() => {
    const root = rootRef.current;
    if (!root || loading) return;

    const reveal = createAsciiReveal(root, {
      preset: 'decode',
      duration: 'cinematic',
      speed: 0.5,
      origin: 'top-left',
      media: '[data-ascii="ascii-reveal-media"]',
    });
    void reveal.reveal();

    return () => {
      reveal.destroy();
    };
  }, [loading]);

  return (
    <div ref={rootRef} className={className} aria-busy={loading || undefined}>
      {children}
    </div>
  );
}
