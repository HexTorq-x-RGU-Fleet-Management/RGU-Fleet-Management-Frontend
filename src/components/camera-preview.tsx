'use client';
import { useState, useEffect, useRef } from 'react';
import { Cctv } from 'lucide-react';
import { request } from '@/lib/api';
let queue = Promise.resolve();
export function CameraPreview({
  deviceId,
  channel,
  enabled = true,
}: {
  deviceId: string;
  channel: number;
  enabled?: boolean;
}) {
  const [image, setImage] = useState<string | null>(null),
    [error, setError] = useState(''),
    ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!enabled || !ref.current) return;
    let disposed = false;
    const abort = new AbortController();
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      queue = queue
        .catch(() => {})
        .then(async () => {
          if (disposed) return;
          try {
            const d = await request(
              '/api/previews/frame?' + new URLSearchParams({ deviceId, channel: String(channel) }),
              undefined,
              abort.signal,
            );
            if (!disposed) setImage('data:image/jpeg;base64,' + d.jpeg);
          } catch (e) {
            if (!disposed) setError((e as Error).message);
          }
        });
    });
    observer.observe(ref.current);
    return () => {
      disposed = true;
      abort.abort();
      observer.disconnect();
    };
  }, [deviceId, channel, enabled]);
  return (
    <div ref={ref} className="bus-camera-placeholder">
      {image ? (
        <img
          src={image}
          alt={'Camera ' + channel + ' last received frame'}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <>
          <Cctv size={26} />
          <span>Camera {channel}</span>
          <small>
            {error ||
              (!enabled ? 'Recorder offline or playback not authorized' : 'Fetching camera frame…')}
          </small>
        </>
      )}
    </div>
  );
}
