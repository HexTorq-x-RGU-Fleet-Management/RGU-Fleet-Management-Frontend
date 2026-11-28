'use client';

import Link from 'next/link';
import { ArrowUpRight, BusFront, Download, Gauge, MapPin, Pencil, Plus, Route, UserRound } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { fleetApi } from '@/lib/api';
import { gpsState, timeLabel, type Bus, type Driver, type Vehicle } from '@/lib/fleet';
import { withinTamilNaduView } from '@/lib/map-config';
import { JourneyMap } from './journey-map';
import { Badge, Button, Confirm, Field, Modal, SearchInput } from './ui';
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
      {view === 'drivers' && <DriversDirectory buses={state.buses} canManage={user?.role === 'admin'} />}
      {view === 'routes' && <Directory buses={state.buses} view="routes" />}
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

function DriversDirectory({ buses, canManage }: { buses: Bus[]; canManage: boolean }) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Driver | null | undefined>(undefined);
  const [removing, setRemoving] = useState<Driver | null>(null);
  const [assigning, setAssigning] = useState<Driver | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedBusId, setSelectedBusId] = useState('');
  const load = async () => {
    setLoading(true);
    try {
      setDrivers((await fleetApi.drivers()).drivers);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load drivers.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);
  const term = query.trim().toLowerCase();
  const visible = drivers.filter((driver) =>
    [driver.fullName, driver.phone, driver.status, ...driver.assignments.flatMap((bus) => [bus.busNumber, bus.registration])]
      .join(' ')
      .toLowerCase()
      .includes(term),
  );
  const assignedBusIds = new Set(drivers.flatMap((driver) => driver.assignments.map((bus) => bus.id)));
  const assignable = buses.filter((bus) => !assignedBusIds.has(bus.id) || assigning?.assignments.some((item) => item.id === bus.id));
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const result = await fleetApi.saveDriver({
        ...(editing.id ? { id: editing.id } : {}),
        fullName: String(form.get('fullName') || ''),
        phone: String(form.get('phone') || ''),
        status: String(form.get('status') || 'active') as Driver['status'],
      });
      setDrivers((current) => {
        const index = current.findIndex((driver) => driver.id === result.driver.id);
        return index < 0
          ? [...current, result.driver].sort((a, b) => a.fullName.localeCompare(b.fullName))
          : current.map((driver) => driver.id === result.driver.id ? { ...result.driver, assignments: driver.assignments } : driver);
      });
      toast.success(editing.id ? 'Driver updated.' : 'Driver added.');
      setEditing(undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save driver.');
    } finally {
      setBusy(false);
    }
  }
  async function assign() {
    if (!assigning || !selectedBusId || busy) return;
    setBusy(true);
    try {
      await fleetApi.assignDriver(selectedBusId, assigning.id);
      toast.success(`${assigning.fullName} assigned to the bus.`);
      setAssigning(null);
      setSelectedBusId('');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not assign driver.');
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!removing) return;
    try {
      await fleetApi.removeDriver(removing.id);
      setDrivers((current) => current.filter((driver) => driver.id !== removing.id));
      toast.success('Driver removed.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove driver.');
      throw error;
    }
  }
  return (
    <div className="fleet-ops-panel neotrack-directory driver-directory">
      <div className="neotrack-directory-heading driver-directory-heading">
        <div><h2><UserRound size={19} /> Manage drivers</h2><span>Total drivers <strong>{drivers.length}</strong></span></div>
        {canManage && <Button variant="primary" onClick={() => setEditing({ id: '', fullName: '', phone: '', status: 'active', createdAt: '', updatedAt: '', assignments: [] })}><Plus size={15} /> Add driver</Button>}
      </div>
      <div className="fleet-ops-controls neotrack-directory-controls">
        <SearchInput value={query} onChange={setQuery} placeholder="Search driver or bus" />
        <span className="directory-result-count">{loading ? 'Loading drivers…' : `${visible.length} ${visible.length === 1 ? 'record' : 'records'}`}</span>
      </div>
      <div className="fleet-ops-table" role="region" aria-label="Driver directory" tabIndex={0} data-lenis-prevent>
        <table>
          <thead><tr><th scope="col">Driver</th><th scope="col">Phone</th><th scope="col">Status</th><th scope="col">Assigned buses</th><th scope="col">Actions</th></tr></thead>
          <tbody>
            {visible.map((driver) => (
              <tr key={driver.id}>
                <td><strong>{driver.fullName}</strong></td>
                <td>{driver.phone || '—'}</td>
                <td><Badge tone={driver.status === 'active' ? 'green' : 'neutral'}>{driver.status}</Badge></td>
                <td>{driver.assignments.length ? driver.assignments.map((bus, index) => <span key={bus.id}>{index > 0 && ', '}<Link href={'/buses?' + new URLSearchParams({ bus: bus.id })}>{bus.busNumber} <ArrowUpRight size={13} /></Link></span>) : 'Not assigned'}</td>
                <td><div className="directory-row-actions">
                  {canManage && <Button type="button" onClick={() => { setAssigning(driver); setSelectedBusId(driver.assignments[0]?.id || ''); }} disabled={driver.status !== 'active'}>Assign</Button>}
                  {canManage && <Button type="button" onClick={() => setEditing(driver)}><Pencil size={14} /> Edit</Button>}
                  {canManage && <Button type="button" variant="danger" onClick={() => setRemoving(driver)} disabled={driver.assignments.length > 0}>Remove</Button>}
                </div></td>
              </tr>
            ))}
            {!loading && !visible.length && <tr><td colSpan={5}>No matching drivers.</td></tr>}
          </tbody>
        </table>
      </div>
      <Modal open={editing !== undefined} onOpenChange={(open) => !open && setEditing(undefined)} title={editing?.id ? 'Edit driver' : 'Add driver'} description="Driver contacts are saved within this workspace and can be assigned to buses.">
        {editing && <form className="driver-form" onSubmit={save}>
          <Field label="Driver name"><input name="fullName" required maxLength={160} defaultValue={editing.fullName} /></Field>
          <Field label="Phone"><input name="phone" maxLength={40} defaultValue={editing.phone} /></Field>
          <Field label="Status"><select name="status" defaultValue={editing.status}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
          <div className="modal-footer"><Button type="button" onClick={() => setEditing(undefined)}>Cancel</Button><Button type="submit" variant="primary" loading={busy}>Save driver</Button></div>
        </form>}
      </Modal>
      <Modal open={assigning !== null} onOpenChange={(open) => !open && setAssigning(null)} title="Assign driver" description={assigning ? `Choose a bus for ${assigning.fullName}. Existing driver information on that bus will be updated.` : ''}>
        <div className="driver-form"><Field label="Bus"><select value={selectedBusId} onChange={(event) => setSelectedBusId(event.target.value)}><option value="">Choose a bus</option>{assignable.map((bus) => <option key={bus.id} value={bus.id}>{bus.busNumber} · {bus.registration}</option>)}</select></Field><div className="modal-footer"><Button type="button" onClick={() => setAssigning(null)}>Cancel</Button><Button type="button" variant="primary" disabled={!selectedBusId} loading={busy} onClick={() => void assign()}>Assign driver</Button></div></div>
      </Modal>
      <Confirm open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)} title="Remove driver" description={removing ? `Remove ${removing.fullName}? Assigned drivers cannot be removed.` : ''} action="Remove driver" onConfirm={remove} />
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
  const routeGroups = !drivers
    ? Array.from(
        records.reduce((groups, bus) => {
          const route = bus.routeName.trim() || 'Unassigned route';
          const current = groups.get(route) ?? [];
          current.push(bus);
          groups.set(route, current);
          return groups;
        }, new Map<string, Bus[]>()),
      ).map(([route, assigned]) => ({ route, assigned }))
    : [];
  const driverGroups = drivers
    ? Array.from(
        records.reduce((groups, bus) => {
          const name = bus.driverName.trim();
          if (!name) return groups;
          const phone = bus.driverPhone.trim();
          const key = `${name.toLocaleLowerCase()}|${phone}`;
          const current = groups.get(key) ?? { name, phone, assigned: [] as Bus[] };
          current.assigned.push(bus);
          groups.set(key, current);
          return groups;
        }, new Map<string, { name: string; phone: string; assigned: Bus[] }>()),
      )
        .map(([, driver]) => driver)
        .sort((left, right) => left.name.localeCompare(right.name))
    : [];
  const directoryCount = drivers ? driverGroups.length : routeGroups.length;
  return (
    <div className={`fleet-ops-panel neotrack-directory ${drivers ? 'driver-directory' : 'route-directory'}`}>
      <div className="neotrack-directory-heading">
        <div>
          <h2>{drivers ? 'Manage drivers' : 'Manage routes'}</h2>
          <span>Total {drivers ? 'drivers' : 'routes'} <strong>{directoryCount}</strong></span>
        </div>
      </div>
      <div className="fleet-ops-controls neotrack-directory-controls">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={drivers ? 'Search driver or bus' : 'Search route or bus'}
        />
        <span className="directory-result-count">{directoryCount} {directoryCount === 1 ? 'record' : 'records'}</span>
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
              <th scope="col">{drivers ? 'Name' : 'Route'}</th>
              {drivers && <th scope="col">Phone</th>}
              <th scope="col">{drivers ? 'Assigned bus' : 'Assigned buses'}</th>
              <th scope="col">{drivers ? 'Registration' : 'Drivers'}</th>
              <th scope="col">{drivers ? 'Actions' : 'GPS mapped'}</th>
              <th scope="col">{drivers ? 'Route' : 'Recorders'}</th>
              {!drivers && <th scope="col">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {drivers && driverGroups.map((driver) => {
              const bus = driver.assigned[0];
              return (
              <tr key={`${driver.name}-${driver.phone}`}>
                <td>{driver.name}</td>
                {drivers && <td>{bus.driverPhone || '—'}</td>}
                <td>
                  {driver.assigned.map((assigned, index) => (
                    <span key={assigned.id}>
                      {index > 0 && ', '}
                      <Link href={busHref(assigned)}>
                        {assigned.busNumber} <ArrowUpRight size={13} />
                      </Link>
                    </span>
                  ))}
                </td>
                <td>{driver.assigned.map((assigned) => assigned.registration).join(', ')}</td>
                <td><Link className="directory-open" href={busHref(bus)}>Open <ArrowUpRight size={14} aria-hidden="true" /></Link></td>
                <td>{(drivers ? bus.routeName : bus.driverName) || '—'}</td>
              </tr>
              );
            })}
            {!drivers && routeGroups.map(({ route, assigned }) => (
              <tr key={route}>
                <td>{route}</td>
                <td>{assigned.map((bus) => bus.busNumber).join(', ')}</td>
                <td>{assigned.map((bus) => bus.driverName || 'Unassigned').join(', ')}</td>
                <td>{assigned.filter((bus) => bus.telemetryDeviceId).length} mapped</td>
                <td>{assigned.filter((bus) => bus.recorderId).length} mapped</td>
                <td><Link className="directory-open" href={busHref(assigned[0])}>Open bus <ArrowUpRight size={14} aria-hidden="true" /></Link></td>
              </tr>
            ))}
            {!(drivers ? driverGroups.length : routeGroups.length) && (
              <tr>
                <td colSpan={6}>No matching {drivers ? 'driver' : 'route'} assignments.</td>
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
  const [page, setPage] = useState(1);
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
    setPage(1);
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
  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(samples.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const visibleSamples = samples.slice(pageStart, pageStart + pageSize);
  function downloadCsv() {
    if (!result) return;
    const quote = (value: string | number | null | undefined) =>
      `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = [
      ['Record type', 'Date (IST)', 'Time (IST)', 'Latitude', 'Longitude', 'Address', 'Speed (km/h)', 'Fuel (L)', 'Speed limit (km/h)'],
      ...samples.map((sample) => [
        'GPS observation',
        result.date,
        timeLabel(sample.gpsTime),
        sample.location.latitude,
        sample.location.longitude,
        sample.location.address,
        sample.speed.toFixed(1),
        sample.fuelData?.currentLiters,
        '',
      ]),
      ...result.data.violations.map((violation) => [
        'Speed-limit crossing',
        result.date,
        timeLabel(violation.gps_time),
        violation.latitude,
        violation.longitude,
        violation.address,
        Number(violation.speed_kph).toFixed(1),
        '',
        Number(violation.speed_limit_kph).toFixed(1),
      ]),
    ];
    const blob = new Blob([rows.map((row) => row.map(quote).join(',')).join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rgu-telemetry-${result.date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="fleet-ops-panel neotrack-report-workbench">
      <div className="report-workbench-heading">
        <div>
          <h2>Movement report</h2>
          <p>Review stored GPS observations and speed-limit events for one IST day.</p>
        </div>
      </div>
      <form className="fleet-ops-controls report-filter-strip" onSubmit={load}>
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
          <div className="report-summary-grid" role="status">
            <div><span>Observations</span><strong>{samples.length}</strong><small>stored for this day</small></div>
            <div><span>Speed alerts</span><strong>{result.data.violations.length}</strong><small>limit crossings</small></div>
            <div><span>First observation</span><strong>{samples[0] ? timeLabel(samples[0].gpsTime) : '—'}</strong><small>IST</small></div>
            <div><span>Last observation</span><strong>{samples.at(-1) ? timeLabel(samples.at(-1)!.gpsTime) : '—'}</strong><small>IST</small></div>
            <Link href={'/buses?' + new URLSearchParams({ bus: result.busId, tab: 'journey' })}>
              Open journey <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="report-export-row">
            <Button type="button" onClick={downloadCsv}>
              <Download size={15} /> Download CSV
            </Button>
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
                {visibleSamples.map((sample) => (
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
          {samples.length > 0 && (
            <div className="report-pagination" aria-label="Report pages">
              <span>
                Showing {pageStart + 1}–{Math.min(pageStart + pageSize, samples.length)} of {samples.length}
              </span>
              <div>
                <Button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                  Previous
                </Button>
                <strong>Page {currentPage} of {totalPages}</strong>
                <Button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
