'use client';

import Link from 'next/link';
import { ArrowUpRight, BusFront, Gauge, MapPin, Route } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { fleetApi } from '@/lib/api';
import { gpsState, timeLabel, type Bus, type Vehicle } from '@/lib/fleet';
import { withinTamilNaduView } from '@/lib/map-config';
import { JourneyMap } from './journey-map';
import { Badge, Button, SearchInput } from './ui';
import { useWorkspace } from './workspace-provider';

const pages = {
  tracking: {
    title: 'Live tracking',
    description: 'Latest stored GPS positions and signal status for your buses.',
  },
  drivers: { title: 'Drivers', description: 'Driver contacts and their current bus assignments.' },
  routes: { title: 'Routes', description: 'Review route names and the buses assigned to them.' },
  reports: {
    title: 'Reports',
    description: 'Review stored movement observations and speed alerts by bus and date.',
  },
};

const busHref = (bus: Bus) => '/buses?' + new URLSearchParams({ bus: bus.id });
const istDate = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

export function FleetOperations({ view }: { view: keyof typeof pages }) {
  const { state, telemetry, user } = useWorkspace();
  if (user?.role === 'superadmin') {
    return (
      <section className="fleet-operations">
        <h1>Workspace account required</h1>
        <p>Fleet data belongs to an individual workspace.</p>
      </section>
    );
  }
  const { title, description } = pages[view];
  return (
    <section className="fleet-operations">
      <header className="fleet-ops-heading">
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      {view === 'tracking' && (
        <Tracking
          buses={state.buses}
          vehicles={telemetry?.data.vehicles ?? []}
          source={telemetry?.source}
        />
      )}
      {(view === 'drivers' || view === 'routes') && <Directory buses={state.buses} view={view} />}
      {view === 'reports' && <Reports key={user?.id} buses={state.buses} />}
    </section>
  );
}

function Tracking({
  buses,
  vehicles,
  source,
}: {
  buses: Bus[];
  vehicles: Vehicle[];
  source?: string;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState('');
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 15_000);
    return () => clearInterval(timer);
  }, []);
  const byDevice = new Map(vehicles.map((vehicle) => [vehicle.deviceId, vehicle]));
  const matching = buses.flatMap((bus) => {
    const vehicle = bus.telemetryDeviceId ? byDevice.get(bus.telemetryDeviceId) : undefined;
    const status = gpsState(bus, vehicle, now);
    const searchable = [bus.busNumber, bus.registration, bus.routeName].join(' ').toLowerCase();
    return searchable.includes(query.trim().toLowerCase()) &&
      (filter === 'all' || status === filter || (filter === 'moving' && status === 'online' && (vehicle?.speed ?? 0) > 0))
      ? [{ bus, vehicle, status }]
      : [];
  });
  const all = buses.map((bus) => ({
    bus,
    vehicle: bus.telemetryDeviceId ? byDevice.get(bus.telemetryDeviceId) : undefined,
  }));
  const statusCounts = all.reduce(
    (counts, entry) => {
      const status = gpsState(entry.bus, entry.vehicle, now);
      counts[status] = (counts[status] ?? 0) + 1;
      if ((entry.vehicle?.speed ?? 0) > 0 && status === 'online') counts.moving += 1;
      return counts;
    },
    { online: 0, offline: 0, unmapped: 0, moving: 0 } as Record<string, number>,
  );
  const selected = matching.find(({ bus }) => bus.id === selectedId) ?? matching[0];
  const vehicle = selected?.vehicle;
  const inBounds =
    vehicle && withinTamilNaduView(vehicle.location.latitude, vehicle.location.longitude);
  return (
    <div className="fleet-ops-tracking neotrack-live-tracking">
      <div className="tracking-mode-strip" role="tablist" aria-label="Tracking mode">
        <button type="button" role="tab" aria-selected>Live</button>
        <Link role="tab" href={selected ? busHref(selected.bus) + '&tab=journey' : '/buses'}>Journey history</Link>
      </div>
      <div className="fleet-ops-panel fleet-ops-picker tracking-roster">
        <div className="tracking-status-tabs" role="group" aria-label="Vehicle status filter">
          {[
            ['all', `All ${buses.length}`],
            ['online', `GPS online ${statusCounts.online}`],
            ['moving', `Moving ${statusCounts.moving}`],
            ['offline', `GPS offline ${statusCounts.offline}`],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={filter === value ? 'selected' : ''}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >{label}</button>
          ))}
        </div>
        <div className="fleet-ops-controls">
          <SearchInput value={query} onChange={setQuery} placeholder="Search buses or routes" />
          <select
            aria-label="GPS status"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="all">All GPS statuses</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="unmapped">Unmapped</option>
          </select>
        </div>
        <div className="fleet-ops-bus-list" data-lenis-prevent>
          {matching.map(({ bus, vehicle, status }) => (
            <button
              type="button"
              key={bus.id}
              aria-pressed={selected?.bus.id === bus.id}
              onClick={() => setSelectedId(bus.id)}
            >
              <BusFront size={19} aria-hidden="true" />
              <span className="tracking-roster-copy">
                <strong>{bus.busNumber}</strong>
                <small>{bus.registration} · {vehicle ? `Observed ${timeLabel(vehicle.gpsTime)} IST` : 'No GPS observation'}</small>
                <span className="tracking-roster-metrics">
                  <Route size={12} aria-hidden="true" /> {bus.routeName || 'Route not set'}
                  <Gauge size={12} aria-hidden="true" /> {vehicle ? `${vehicle.speed.toFixed(0)} km/h` : '—'}
                </span>
              </span>
              <Badge tone={status === 'online' ? 'green' : status === 'offline' ? 'red' : 'neutral'}>{status}</Badge>
            </button>
          ))}
          {!matching.length && <p role="status">No matching buses.</p>}
        </div>
      </div>
      <div className="fleet-ops-panel fleet-ops-position tracking-map-panel">
        {selected ? (
          <>
            <div className="fleet-ops-position-title">
              <div>
                <span className="tracking-map-kicker">Live vehicle position</span>
                <h2>{selected.bus.busNumber}</h2>
              </div>
              <Link href={busHref(selected.bus) + '&tab=journey'}>
                Journey history <ArrowUpRight size={15} />
              </Link>
            </div>
            {vehicle && (
              <div className="fleet-ops-reading tracking-reading">
                <span>Observed {timeLabel(vehicle.gpsTime)} IST</span>
                <span>{vehicle.speed.toFixed(1)} km/h</span>
                <span>
                  {vehicle.fuelData ? vehicle.fuelData.currentLiters + ' L' : 'Fuel unavailable'}
                </span>
                <Badge tone={selected.status === 'online' ? 'green' : 'amber'}>
                  {selected.status === 'online' ? 'Recent observation' : 'Last known position'}
                </Badge>
              </div>
            )}
            {vehicle && inBounds ? (
              <JourneyMap
                key={selected.bus.id}
                samples={[vehicle]}
                index={0}
                source={source}
                followOnMount
              />
            ) : (
              <p className="fleet-ops-empty">
                <MapPin size={18} />
                {vehicle
                  ? 'Latest position is outside the map coverage.'
                  : 'No GPS observation for this bus yet.'}
              </p>
            )}
          </>
        ) : (
          <p className="fleet-ops-empty">Select a bus to see its position.</p>
        )}
      </div>
    </div>
  );
}

function Directory({ buses, view }: { buses: Bus[]; view: 'drivers' | 'routes' }) {
  const [query, setQuery] = useState('');
  const drivers = view === 'drivers';
  const records = buses.filter((bus) =>
    [
      bus.busNumber,
      bus.registration,
      bus.routeName,
      ...(drivers ? [bus.driverName, bus.driverPhone] : []),
    ]
      .join(' ')
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <div className="fleet-ops-panel">
      <div className="fleet-ops-controls">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={drivers ? 'Search driver or bus' : 'Search route or bus'}
        />
        <span>
          {records.length} {records.length === 1 ? 'bus' : 'buses'}
        </span>
      </div>
      <div
        className="fleet-ops-table"
        role="region"
        aria-label={drivers ? 'Driver assignments' : 'Route assignments'}
        tabIndex={0}
        data-lenis-prevent
      >
        <table>
          <thead>
            <tr>
              <th scope="col">{drivers ? 'Driver' : 'Route'}</th>
              <th scope="col">Bus</th>
              <th scope="col">Registration</th>
              <th scope="col">{drivers ? 'Contact' : 'Driver'}</th>
            </tr>
          </thead>
          <tbody>
            {records.map((bus) => (
              <tr key={bus.id}>
                <td>{(drivers ? bus.driverName : bus.routeName) || 'Unassigned'}</td>
                <td>
                  <Link href={busHref(bus)}>
                    {bus.busNumber} <ArrowUpRight size={13} />
                  </Link>
                </td>
                <td>{bus.registration}</td>
                <td>{(drivers ? bus.driverPhone : bus.driverName) || '—'}</td>
              </tr>
            ))}
            {!records.length && (
              <tr>
                <td colSpan={4}>No matching bus assignments.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Reports({ buses }: { buses: Bus[] }) {
  const [busId, setBusId] = useState('');
  const [date, setDate] = useState(istDate);
  const [report, setReport] = useState<{
    data: Awaited<ReturnType<typeof fleetApi.history>>;
    from: number;
    to: number;
    date: string;
    busId: string;
  }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mapped = buses.filter((bus) => bus.telemetryDeviceId);
  const currentId = mapped.some((bus) => bus.id === busId) ? busId : (mapped[0]?.id ?? '');
  const result = report?.busId === currentId && report.date === date ? report : undefined;
  async function load(event: FormEvent) {
    event.preventDefault();
    const from = Date.parse(date + 'T00:00:00+05:30') / 1000;
    const to = Math.min(from + 86399, Math.floor(Date.now() / 1000));
    if (!currentId || !Number.isFinite(from) || to < from || loading) return;
    setLoading(true);
    setError('');
    setReport(undefined);
    try {
      const data = await fleetApi.history(currentId, from, to);
      setReport({ data, from, to, date, busId: currentId });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not load the report.');
    } finally {
      setLoading(false);
    }
  }
  const samples = result
    ? [...new Map(result.data.samples.map(({ vehicle }) => [vehicle.gpsTime, vehicle])).values()]
        .filter(({ gpsTime }) => gpsTime >= result.from && gpsTime <= result.to)
        .sort((a, b) => a.gpsTime - b.gpsTime)
    : [];
  return (
    <div className="fleet-ops-panel">
      <form className="fleet-ops-controls" onSubmit={load}>
        <label>
          Bus
          <select
            value={currentId}
            disabled={loading || !mapped.length}
            onChange={(event) => {
              setBusId(event.target.value);
              setError('');
            }}
          >
            {!mapped.length && <option value="">No mapped GPS devices</option>}
            {mapped.map((bus) => (
              <option key={bus.id} value={bus.id}>
                {bus.busNumber} · {bus.registration}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date (IST)
          <input
            type="date"
            required
            max={istDate()}
            value={date}
            disabled={loading}
            onChange={(event) => {
              setDate(event.target.value);
              setError('');
            }}
          />
        </label>
        <Button type="submit" variant="primary" disabled={!currentId || !date} loading={loading}>
          Load report
        </Button>
      </form>
      {error && (
        <p className="fleet-ops-empty" role="alert">
          {error}
        </p>
      )}
      {result && (
        <>
          <div className="fleet-ops-controls" role="status">
            <strong>{samples.length} movement observations</strong>
            <strong>{result.data.violations.length} speed alerts</strong>
            <Link href={'/buses?' + new URLSearchParams({ bus: result.busId, tab: 'journey' })}>
              Open journey <ArrowUpRight size={15} />
            </Link>
          </div>
          <div
            className="fleet-ops-table"
            role="region"
            aria-label="Daily telemetry observations"
            tabIndex={0}
            data-lenis-prevent
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">IST</th>
                  <th scope="col">Position</th>
                  <th scope="col">Speed</th>
                  <th scope="col">Fuel</th>
                </tr>
              </thead>
              <tbody>
                {samples.map((sample) => (
                  <tr key={sample.gpsTime}>
                    <td>{timeLabel(sample.gpsTime)}</td>
                    <td>
                      {sample.location.address ||
                        [
                          sample.location.latitude.toFixed(5),
                          sample.location.longitude.toFixed(5),
                        ].join(', ')}
                    </td>
                    <td>{sample.speed.toFixed(1)} km/h</td>
                    <td>{sample.fuelData ? sample.fuelData.currentLiters + ' L' : '—'}</td>
                  </tr>
                ))}
                {!samples.length && (
                  <tr>
                    <td colSpan={4}>No movement observations recorded on this date.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
