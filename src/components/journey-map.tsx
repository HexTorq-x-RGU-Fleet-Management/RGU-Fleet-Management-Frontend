'use client';
import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import { MapPin, Navigation, Map, RefreshCw } from 'lucide-react';
import { AsciiSkeleton } from 'ascii-reveal';
import { type Vehicle, timeLabel } from '@/lib/fleet';
import { tamilNaduBounds, defaultTileUrl, withinTamilNaduView } from '@/lib/map-config';
import { Badge, Button } from './ui';

type Layers = {
  map: Leaflet.Map;
  tiles: Leaflet.TileLayer;
  trail: Leaflet.Polyline;
  past: Leaflet.Polyline;
  marker: Leaflet.CircleMarker;
};
export function JourneyMap({
  samples,
  index,
  source,
}: {
  samples: Vehicle[];
  index: number;
  source?: string;
}) {
  const element = useRef<HTMLDivElement>(null),
    layers = useRef<Layers | null>(null);
  const [ready, setReady] = useState(false),
    [status, setStatus] = useState('loading'),
    [following, setFollowing] = useState(false);
  const current = samples[index];
  const data = useRef({ samples, index });
  data.current = { samples, index };
  useEffect(() => {
    let disposed = false;
    const observer = new ResizeObserver(() => layers.current?.map.invalidateSize({ pan: false }));
    if (element.current) observer.observe(element.current);
    void import('leaflet')
      .then((L) => {
        if (disposed || !element.current) return;
        const bounds = L.latLngBounds(tamilNaduBounds as Leaflet.LatLngTuple[]);
        const map = L.map(element.current, {
          maxBounds: bounds,
          maxBoundsViscosity: 1,
          minZoom: 6,
          maxZoom: 18,
          scrollWheelZoom: false,
          attributionControl: true,
        });
        map.fitBounds(bounds, { padding: [12, 12], animate: false });
        const tiles = L.tileLayer(process.env.NEXT_PUBLIC_MAP_TILE_URL || defaultTileUrl, {
          bounds,
          maxZoom: 18,
          keepBuffer: 1,
          referrerPolicy: 'strict-origin-when-cross-origin',
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        });
        let failed = false;
        tiles.on('loading', () => {
          failed = false;
          setStatus('loading');
        });
        tiles.on('tileerror', () => {
          failed = true;
          setStatus('error');
        });
        tiles.on('load', () => setStatus(failed ? 'error' : 'ready'));
        tiles.addTo(map);
        const initial = data.current.samples[data.current.index];
        const points = data.current.samples.map(
          (v) => [v.location.latitude, v.location.longitude] as Leaflet.LatLngTuple,
        );
        const trail = L.polyline(points, {
          color: '#00a3e0',
          weight: 3,
          opacity: 0.4,
          dashArray: '6 7',
          interactive: false,
        }).addTo(map);
        const past = L.polyline(points.slice(0, data.current.index + 1), {
          color: '#852482',
          weight: 4,
          interactive: false,
        }).addTo(map);
        const marker = L.circleMarker(
          initial ? [initial.location.latitude, initial.location.longitude] : [10.932, 76.978],
          { radius: 9, color: '#ffffff', weight: 3, fillColor: '#852482', fillOpacity: 1 },
        ).addTo(map);
        marker.bindTooltip('Selected bus position · WheelsEye GPS', { direction: 'top' });
        map.on('dragstart', () => setFollowing(false));
        layers.current = { map, tiles, trail, past, marker };
        setReady(true);
      })
      .catch(() => {
        if (!disposed) setStatus('unavailable');
      });
    return () => {
      disposed = true;
      observer.disconnect();
      layers.current?.map.remove();
      layers.current = null;
    };
  }, []);
  useEffect(() => {
    const value = layers.current;
    if (!ready || !value || !current) return;
    const points = samples.map(
      (v) => [v.location.latitude, v.location.longitude] as Leaflet.LatLngTuple,
    );
    value.trail.setLatLngs(points);
    value.past.setLatLngs(points.slice(0, index + 1));
    value.marker.setLatLng([current.location.latitude, current.location.longitude]);
    if (following && withinTamilNaduView(current.location.latitude, current.location.longitude))
      value.map.setView(
        [current.location.latitude, current.location.longitude],
        Math.max(value.map.getZoom(), 13),
        { animate: false },
      );
  }, [ready, samples, index, current, following]);
  return (
    <div className="fleet-map real-road-map">
      <div className="map-topline">
        <span>
          <MapPin size={14} /> TAMIL NADU / ROAD MAP
        </span>
        <Badge tone="neutral">{source === 'vendor' ? 'WheelsEye GPS' : 'Stored GPS'}</Badge>
      </div>
      <div className="map-view-actions">
        <Button
          disabled={!ready}
          aria-pressed={!following}
          onClick={() => {
            setFollowing(false);
            layers.current?.map.fitBounds(tamilNaduBounds as Leaflet.LatLngTuple[], {
              animate: false,
            });
          }}
        >
          <Map size={14} />
          Tamil Nadu
        </Button>
        <Button
          disabled={
            !ready ||
            !current ||
            !withinTamilNaduView(current.location.latitude, current.location.longitude)
          }
          aria-pressed={following}
          onClick={() => setFollowing(true)}
        >
          <Navigation size={14} />
          Follow bus
        </Button>
      </div>
      <div
        ref={element}
        className="road-map-canvas"
        role="region"
        aria-label="Tamil Nadu road map"
        data-lenis-prevent
      />
      {status === 'loading' && (
        <div className="map-network-state" role="status">
          <AsciiSkeleton
            as="div"
            variant="dither"
            rows={2}
            width="100%"
            height={22}
            seed={11}
          />
          Loading road tiles...
        </div>
      )}
      {(status === 'error' || status === 'unavailable') && (
        <div className="map-network-state" role="status">
          <span>Road tiles unavailable. GPS readings remain below.</span>
          {ready && (
            <Button
              variant="ghost"
              onClick={() => {
                setStatus('loading');
                layers.current?.tiles.redraw();
              }}
            >
              <RefreshCw size={13} />
              Retry tiles
            </Button>
          )}
        </div>
      )}
      <div className="map-coordinate">
        <MapPin size={15} />
        <strong>
          {current?.location.latitude.toFixed(5)}, {current?.location.longitude.toFixed(5)}
        </strong>
        <span>{current ? timeLabel(current.gpsTime) : '—'} IST</span>
      </div>
      <p className="map-source-note">
        Real OpenStreetMap roads · Stored GPS trail, not road routing. Tamil Nadu viewing bounds
        include some neighbouring areas.
      </p>
    </div>
  );
}
