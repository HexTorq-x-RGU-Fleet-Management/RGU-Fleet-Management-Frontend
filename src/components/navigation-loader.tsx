'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';

/** Gives immediate feedback while a sidebar route and its API data are loading. */
export function NavigationLoader() {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(false);
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      const target = event.target as Element | null;
      const link = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      setPending(true);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  if (!pending) return null;
  return (
    <div className="navigation-loader" role="status" aria-live="polite">
      <span className="navigation-loader-bar" />
      <span className="navigation-loader-label">
        <LoaderCircle size={14} className="spin" /> Loading workspace…
      </span>
    </div>
  );
}
