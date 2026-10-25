'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Cctv, HardDrive } from 'lucide-react';
import { CameraWorkspace } from './camera-workspace';
import { RecorderLibrary } from './dashboard';
export function CameraHub() {
  const library = useSearchParams().get('view') === 'recorders';
  return (
    <>
      <nav className="camera-hub-tabs" aria-label="Camera tools">
        <Link
          href="/cameras"
          className={!library ? 'active' : ''}
          aria-current={!library ? 'page' : undefined}
        >
          <Cctv size={16} />
          Camera workspace
        </Link>
        <Link
          href="/cameras?view=recorders"
          className={library ? 'active' : ''}
          aria-current={library ? 'page' : undefined}
        >
          <HardDrive size={16} />
          Recorder library
        </Link>
      </nav>
      {library ? <RecorderLibrary /> : <CameraWorkspace />}
    </>
  );
}
