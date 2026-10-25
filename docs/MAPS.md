# Tamil Nadu road map

Leaflet 1.9.4 renders real OpenStreetMap Standard road tiles directly in the
browser, loaded only for the normal viewport and maintained tile buffer.
It does not download Tamil Nadu in bulk or offer offline prefetch.
No paid API key or image generation service is used.

The map starts on an approximate Tamil Nadu viewing rectangle:
latitude 7.8–13.7, longitude 76.0–80.5. It restricts panning/zooming to this region.
This is not an administrative border polygon: some neighbouring geography remains
visible. Tamil Nadu resets the overview; Follow bus centres/zooms to the selected
sample and follows the history cursor. Dragging turns following off. Normal
page wheel scrolling is preserved; use map zoom controls, double-click or pinch.
ResizeObserver keeps the map fitted to its container when the sidebar changes.

The marker and trail come from the selected vehicle's latitude/longitude.
They remain labelled mock GPS until real vendor telemetry is connected.
Lines connect GPS observations; they are not road-matched routing directions.
Tile errors show a retry control while the telemetry values/timeline remain usable.

Default URL: https://tile.openstreetmap.org/{z}/{x}/{y}.png
Attribution remains visible: © OpenStreetMap contributors, linked to
https://www.openstreetmap.org/copyright.
The browser sends its normal User-Agent, Referer and caching behavior.
The frontend uses strict-origin-when-cross-origin referrer policy.

The public standard tile service is best-effort, with no SLA:
https://operations.osmfoundation.org/policies/tiles/
Before production scale/offline use, choose a provider or self-hosted regional
tiles whose usage terms cover the workload. Do not scrape public OSM tiles.
NEXT_PUBLIC_MAP_TILE_URL can change the compatible endpoint at build time;
update the attribution in journey-map.tsx for any additional provider requirements.
No map secret belongs in public frontend config.

Browser acceptance tests use tiles served by the isolated backend fixture to
avoid network-dependent tests or repeated requests to public servers. No frontend
tile interception is installed. An earlier local Chrome smoke check loaded real
OSM tiles and verified attribution.
Leaflet reference: https://leafletjs.com/reference.html.
