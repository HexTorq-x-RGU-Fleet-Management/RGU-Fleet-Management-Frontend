'use client';
import { useEffect, useRef, useState } from 'react';
import maplibregl, { type Map as MapLibreMap } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { layers, namedFlavor } from '@protomaps/basemaps';
import { MapPin, Navigation } from 'lucide-react';
import type { Vehicle } from '@/lib/fleet';
import { tamilNaduBounds, withinTamilNaduView } from '@/lib/map-config';
import { Badge, Button } from './ui';

const tilesUrl =
  process.env.NEXT_PUBLIC_PMTILES_URL ||
  'https://rgu-fleet-management.hextorq.tech/rgu/maps/tamilnadu-kerala-z12.pmtiles';

export function MapLibreJourneyMap({ samples, index, source }: { samples: Vehicle[]; index: number; source?: string }) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [following, setFollowing] = useState(false);
  const current = samples[index];

  useEffect(() => {
    if (!element.current) return;
    const protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);
    const instance = new maplibregl.Map({
      container: element.current,
      style: {
        version: 8,
        glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
        sprite: 'https://protomaps.github.io/basemaps-assets/sprites/v4/light',
        sources: { protomaps: { type: 'vector', url: `pmtiles://${tilesUrl}`, attribution: '&copy; OpenStreetMap contributors' } },
        layers: layers('protomaps', namedFlavor('light')),
      },
      bounds: tamilNaduBounds as [[number, number], [number, number]],
      fitBoundsOptions: { padding: 20 },
      minZoom: 6,
      maxZoom: 18,
      attributionControl: { compact: true },
    });
    map.current = instance;
    instance.on('load', () => {
      instance.addSource('journey-trail', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} },
      });
      instance.addLayer({ id: 'journey-trail-line', type: 'line', source: 'journey-trail', paint: { 'line-color': '#852482', 'line-width': 4, 'line-opacity': 0.8 } });
      instance.addSource('journey-position', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'Point', coordinates: [76.978, 10.932] }, properties: {} },
      });
      instance.addLayer({ id: 'journey-position-dot', type: 'circle', source: 'journey-position', paint: { 'circle-radius': 8, 'circle-color': '#852482', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3 } });
      setReady(true);
    });
    instance.on('dragstart', () => setFollowing(false));
    return () => {
      maplibregl.removeProtocol('pmtiles');
      instance.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance || !current) return;
    const trail = instance.getSource('journey-trail') as maplibregl.GeoJSONSource;
    const position = instance.getSource('journey-position') as maplibregl.GeoJSONSource;
    trail?.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: samples.map((v) => [v.location.longitude, v.location.latitude]) }, properties: {} });
    position?.setData({ type: 'Feature', geometry: { type: 'Point', coordinates: [current.location.longitude, current.location.latitude] }, properties: {} });
    if (following && withinTamilNaduView(current.location.latitude, current.location.longitude))
      instance.easeTo({ center: [current.location.longitude, current.location.latitude], zoom: Math.max(instance.getZoom(), 13), duration: 0 });
  }, [ready, samples, current, following]);

  return (
    <div className="fleet-map real-road-map">
      <div className="map-topline"><span><MapPin size={14} /> MAPLIBRE / PMTILES</span><Badge tone="neutral">{source === 'vendor' ? 'WheelsEye GPS' : 'Stored GPS'}</Badge></div>
      <div className="map-view-actions"><Button disabled={!ready || !current} aria-pressed={following} onClick={() => setFollowing(true)}><Navigation size={14} /> Follow bus</Button></div>
      <div ref={element} className="road-map-canvas" role="region" aria-label="MapLibre Tamil Nadu road map" data-lenis-prevent />
      <div className="map-coordinate"><MapPin size={15} /><strong>{current?.location.latitude.toFixed(5)}, {current?.location.longitude.toFixed(5)}</strong></div>
      <p className="map-source-note">Self-hosted Protomaps vector tiles · OpenStreetMap attribution required.</p>
    </div>
  );
}
