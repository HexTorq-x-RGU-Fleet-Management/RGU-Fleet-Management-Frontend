'use client';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  BusFront,
  Navigation,
  Fuel,
  Cctv,
  Plus,
  ArrowUpRight,
  ArrowLeft,
  Pencil,
  Star,
  Radio,
  MapPin,
  Clock3,
  Gauge,
  UserRound,
  Trash2,
  RefreshCw,
  Route,
  Unplug,
  Play,
  Pause,
} from 'lucide-react';
import { toast } from 'sonner';
import { JourneyMap } from './journey-map';
import { useWorkspace } from './workspace-provider';
import { Badge, Button, Confirm, Field, Modal, PageHeading, SearchInput, Reveal } from './ui';
import { recorders, channelName } from '@/lib/model';
import {
  type Bus,
  type Vehicle,
  sampleBuses,
  telemetryDevices,
  mockEnvelope,
  mockHistory,
  workingChannels,
  cameraChannels,
  validateBus,
  timeLabel,
  telemetryAge,
} from '@/lib/fleet';

function useTelemetry(buses: Bus[]) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Math.floor(Date.now() / 1000));
    update();
    const id = setInterval(update, 10000);
    return () => clearInterval(id);
  }, []);
  const envelope = useMemo(() => mockEnvelope(buses, now ?? 0), [buses, now]);
  return { now, envelope, refresh: () => setNow(Math.floor(Date.now() / 1000)) };
}
function Metric({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof Fuel;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <Icon size={18} />
      </div>
      <div className="stat-value">{value}</div>
      <p>{note}</p>
    </div>
  );
}
function FuelMeter({ value }: { value: number }) {
  return (
    <div className="fuel-meter" aria-label={'Fuel ' + value.toFixed(1) + ' percent'}>
      <span style={{ width: Math.max(0, Math.min(100, value)) + '%' }} />
    </div>
  );
}
function RouteMap({ samples, index }: { samples: Vehicle[]; index: number }) {
  if (!samples[index])
    return (
      <div className="fleet-no-data">
        <Unplug size={30} />
        <h3>No telemetry device mapped</h3>
        <p>Map a GPS/fuel device in bus settings to explore this route.</p>
      </div>
    );
  return <JourneyMap samples={samples} index={index} />;
}
function FleetHeading({
  compact,
  count,
  eyebrow,
  title,
  description,
  children,
}: {
  compact: boolean;
  count: number;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  if (compact)
    return (
      <div className="bus-directory-heading">
        <div>
          <h1>Buses</h1>
          <span className="count-chip">{count}</span>
        </div>
        <div className="bus-directory-actions">{children}</div>
      </div>
    );
  return (
    <PageHeading eyebrow={eyebrow} title={title} description={description}>
      {children}
    </PageHeading>
  );
}
export function FleetWorkspace({ busesOnly = false }: { busesOnly?: boolean }) {
  const { state, ready } = useWorkspace(),
    query = useSearchParams();
  const [search, setSearch] = useState(''),
    [filter, setFilter] = useState('all'),
    [editor, setEditor] = useState<Bus | null>(null);
  const { now, envelope, refresh } = useTelemetry(state.buses);
  const detail = state.buses.find((b) => b.id === query.get('bus'));
  if (!ready || now === null)
    return <div className="skeleton h-96" role="status" aria-label="Loading fleet" />;
  if (query.get('bus') && !detail)
    return (
      <div className="fleet-no-data">
        <BusFront size={32} />
        <h1>Bus not found</h1>
        <Link href="/">Return to fleet</Link>
      </div>
    );
  const list = state.buses
    .filter((b) =>
      (b.busNumber + ' ' + b.registration + ' ' + b.driverName + ' ' + b.routeName)
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .filter((b) => {
      const v = envelope.data.vehicles.find((v) => v.deviceId === b.telemetryDeviceId);
      return (
        filter === 'all' ||
        (filter === 'moving' && v?.status === 'MOVING') ||
        (filter === 'unmapped' && (!b.recorderId || !b.telemetryDeviceId))
      );
    });
  return (
    <div className={`fleet-workspace ${busesOnly && !detail ? 'bus-directory' : ''}`}>
      {detail ? (
        <BusDetail bus={detail} now={now} onEdit={() => setEditor(detail)} />
      ) : (
        <>
          <FleetHeading
            compact={busesOnly}
            count={state.buses.length}
            eyebrow={busesOnly ? 'VEHICLE DIRECTORY' : 'RGU FLEET MANAGEMENT'}
            title={busesOnly ? 'Buses' : 'One fleet. Every perspective.'}
            description={
              busesOnly
                ? 'Manage vehicles, drivers and connected devices.'
                : 'Bus cameras, GPS and fuel intelligence — connected around the vehicle.'
            }
          >
            <Button onClick={refresh}>
              <RefreshCw size={15} />
              Refresh telemetry
            </Button>
            {state.role === 'admin' && (
              <Button
                variant="primary"
                onClick={() =>
                  setEditor({
                    id: '',
                    busNumber: '',
                    registration: '',
                    driverName: '',
                    driverPhone: '',
                    routeName: '',
                    recorderId: null,
                    telemetryDeviceId: null,
                    favoriteChannels: [],
                  })
                }
              >
                <Plus size={16} />
                Add bus
              </Button>
            )}
          </FleetHeading>
          {!busesOnly && (
            <>
              <div className="fleet-source">
                <Radio size={15} />
                <strong>Mock provider</strong>
                <span>
                  Vendor-format GPS + fuel · polled every 10 seconds · simulated samples at 1-minute
                  intervals
                </span>
                <time>Checked {timeLabel(now)} IST</time>
              </div>
              <div className="stats-grid">
                <Metric
                  icon={BusFront}
                  label="Fleet size"
                  value={String(state.buses.length).padStart(2, '0')}
                  note="Individually mapped buses"
                />
                <Metric
                  icon={Navigation}
                  label="Moving"
                  value={String(
                    envelope.data.vehicles.filter((v) => v.status === 'MOVING').length,
                  ).padStart(2, '0')}
                  note="Simulated ignition and speed"
                />
                <Metric
                  icon={Fuel}
                  label="Fuel monitored"
                  value={String(envelope.data.vehicles.length).padStart(2, '0')}
                  note="GPS and fuel from one device"
                />
                <Metric
                  icon={Cctv}
                  label="Available camera channels"
                  value={String(
                    state.buses.reduce((n, b) => n + workingChannels(b.recorderId).length, 0),
                  ).padStart(2, '0')}
                  note="Sample per-channel availability"
                />
              </div>
            </>
          )}
          <div className={busesOnly ? 'bus-directory-tools' : ''}>
            <div className="fleet-toolbar">
              {!busesOnly && (
                <div>
                  <h2>{busesOnly ? state.buses.length + ' vehicles' : 'Your buses'}</h2>
                  <p className="muted">Choose a vehicle to explore its complete journey.</p>
                </div>
              )}
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search buses, drivers or routes"
              />
            </div>
            <div className="segmented fleet-filters" aria-label="Bus filter">
              {[
                ['all', 'All buses'],
                ['moving', 'Moving'],
                ['unmapped', 'Needs mapping'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={filter === id}
                  className={filter === id ? 'selected' : ''}
                  onClick={() => setFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {list.length === 0 ? (
            <div className="fleet-no-data">
              <BusFront size={30} />
              <h3>No matching buses</h3>
              <p>Adjust your filters or add a bus.</p>
            </div>
          ) : (
            <div className="fleet-bus-grid">
              {list.map((bus, i) => {
                const vehicle = envelope.data.vehicles.find(
                    (v) => v.deviceId === bus.telemetryDeviceId,
                  ),
                  recorder = recorders.find((r) => r.id === bus.recorderId);
                return (
                  <Reveal key={bus.id} delay={Math.min(i * 0.035, 0.2)} className="bus-card">
                    <Link
                      href={'/buses?bus=' + bus.id}
                      className="bus-card-main"
                      aria-label={'Open ' + bus.busNumber}
                    >
                      <div className="bus-card-head">
                        <span className="bus-glyph">
                          <BusFront size={26} />
                        </span>
                        <Badge tone={vehicle?.status === 'MOVING' ? 'green' : 'neutral'}>
                          {vehicle?.status.toLowerCase() ?? 'No GPS'}
                        </Badge>
                        <ArrowUpRight size={18} />
                      </div>
                      <h2>{bus.busNumber}</h2>
                      <span className="bus-registration">{bus.registration}</span>
                      <p className="bus-route">
                        <Route size={14} />
                        {bus.routeName || 'Route not set'}
                      </p>
                      <div className="bus-reading">
                        <div>
                          <Gauge size={16} />
                          <strong>{vehicle?.speed.toFixed(0) ?? '—'}</strong>
                          <span>km/h</span>
                        </div>
                        <div>
                          <Fuel size={16} />
                          <strong>{vehicle?.fuelData.currentLiters.toFixed(1) ?? '—'}</strong>
                          <span>litres</span>
                        </div>
                      </div>
                      {vehicle && <FuelMeter value={vehicle.fuelData.fuelPercentage} />}
                      <div className="bus-card-footer">
                        <span>
                          <UserRound size={14} />
                          {bus.driverName}
                        </span>
                        <span>
                          <Cctv size={14} />
                          {workingChannels(bus.recorderId).length}/{recorder?.channels ?? 0}
                        </span>
                      </div>
                    </Link>
                    <div className="bus-mapping">
                      <span>
                        <i className={'status-dot ' + (recorder?.online ? '' : 'offline')} />
                        {recorder?.name ?? 'No recorder'}
                      </span>
                      <span>{bus.telemetryDeviceId ?? 'No telemetry'}</span>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          )}
        </>
      )}
      <BusEditor bus={editor} onClose={() => setEditor(null)} />
    </div>
  );
}
function BusEditor({ bus, onClose }: { bus: Bus | null; onClose: () => void }) {
  const { state, patch, log } = useWorkspace();
  const [draft, setDraft] = useState<Bus | null>(null);
  useEffect(() => setDraft(bus), [bus]);
  if (!draft) return null;
  const set = (change: Partial<Bus>) => setDraft({ ...draft, ...change });
  return (
    <Modal
      open={!!bus}
      onOpenChange={(open) => !open && onClose()}
      title={draft.id ? 'Edit bus' : 'Add a bus'}
      description="Map one recorder and one GPS/fuel device to this bus. Sample details stay in this browser."
      wide
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (state.role !== 'admin') return;
          const clean = {
            ...draft,
            busNumber: draft.busNumber.trim(),
            registration: draft.registration.trim().toUpperCase(),
            driverName: draft.driverName.trim(),
          };
          const error = validateBus(clean, state.buses);
          if (error) return toast.error(error);
          const value = { ...clean, id: clean.id || crypto.randomUUID() };
          patch({
            buses: clean.id
              ? state.buses.map((b) => (b.id === value.id ? value : b))
              : [...state.buses, value],
          });
          log(clean.id ? 'Bus updated' : 'Bus created', value.busNumber, 'settings');
          toast.success('Bus saved in preview workspace.');
          onClose();
        }}
      >
        <div className="fleet-form-grid">
          <Field label="Bus number">
            <input
              required
              maxLength={40}
              value={draft.busNumber}
              onChange={(e) => set({ busNumber: e.target.value })}
              placeholder="RGU 06"
            />
          </Field>
          <Field label="Registration">
            <input
              required
              maxLength={40}
              value={draft.registration}
              onChange={(e) => set({ registration: e.target.value })}
              placeholder="TN 37 AB 1234"
            />
          </Field>
          <Field label="Driver name">
            <input
              required
              maxLength={100}
              value={draft.driverName}
              onChange={(e) => set({ driverName: e.target.value })}
            />
          </Field>
          <Field label="Driver phone">
            <input
              type="tel"
              maxLength={30}
              value={draft.driverPhone}
              onChange={(e) => set({ driverPhone: e.target.value })}
            />
          </Field>
          <Field label="Route">
            <input
              maxLength={100}
              value={draft.routeName}
              onChange={(e) => set({ routeName: e.target.value })}
            />
          </Field>
          <Field label="Recorder" hint="Recorders are imported separately from Hik-Connect.">
            <select
              value={draft.recorderId ?? ''}
              onChange={(e) =>
                set({
                  recorderId: e.target.value || null,
                  favoriteChannels: workingChannels(e.target.value),
                })
              }
            >
              <option value="">Not mapped</option>
              {recorders.map((r) => (
                <option
                  key={r.id}
                  value={r.id}
                  disabled={state.buses.some((b) => b.id !== draft.id && b.recorderId === r.id)}
                >
                  {r.name}
                  {state.buses.some((b) => b.id !== draft.id && b.recorderId === r.id)
                    ? ' · assigned'
                    : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="GPS + fuel device" hint="Both measurements use this same vendor device ID.">
            <input
              aria-label="GPS + fuel device"
              maxLength={256}
              list="telemetry-devices"
              value={draft.telemetryDeviceId ?? ''}
              onChange={(e) => set({ telemetryDeviceId: e.target.value.trim() || null })}
              placeholder="Vendor device ID"
            />
            <datalist id="telemetry-devices">
              {telemetryDevices.map((id) => (
                <option key={id} value={id} />
              ))}
            </datalist>
          </Field>
        </div>
        <p className="muted small">
          Camera stars choose the default bus view. Unavailable channels are excluded from playback.
        </p>
        <div className="modal-footer">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            Save bus
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function BusDetail({ bus, now, onEdit }: { bus: Bus; now: number; onEdit: () => void }) {
  const router = useRouter();
  const { state, patch, log } = useWorkspace(),
    [tab, setTab] = useState('journey'),
    [remove, setRemove] = useState(false);
  const current = mockEnvelope([bus], now).data.vehicles[0],
    r = recorders.find((r) => r.id === bus.recorderId),
    working = workingChannels(bus.recorderId);
  function star(channel: number) {
    if (state.role !== 'admin') return;
    patch({
      buses: state.buses.map((b) =>
        b.id === bus.id
          ? {
              ...b,
              favoriteChannels: b.favoriteChannels.includes(channel)
                ? b.favoriteChannels.filter((n) => n !== channel)
                : [...b.favoriteChannels, channel],
            }
          : b,
      ),
    });
  }
  return (
    <>
      <Link className="btn btn-ghost fleet-back" href="/">
        <ArrowLeft size={16} />
        Back to fleet
      </Link>
      <PageHeading
        eyebrow="VEHICLE OPERATIONS"
        title={bus.busNumber}
        description={bus.registration + ' · ' + (bus.routeName || 'Route not set')}
      >
        <Badge tone="amber">Mock vehicle</Badge>
        {state.role === 'admin' && (
          <>
            <Button onClick={onEdit}>
              <Pencil size={15} />
              Edit bus
            </Button>
            <Button variant="ghost" onClick={() => setRemove(true)}>
              <Trash2 size={15} />
              Remove bus
            </Button>
          </>
        )}
      </PageHeading>
      <div className="fleet-bus-context">
        <span>
          <UserRound size={16} />
          {bus.driverName}
          {bus.driverPhone && ' · ' + bus.driverPhone}
        </span>
        <span>
          <Cctv size={16} />
          {r?.name ?? 'Recorder not mapped'}
        </span>
        <span>
          <Radio size={16} />
          {bus.telemetryDeviceId ?? 'Telemetry not mapped'}
        </span>
      </div>
      <div className="stats-grid">
        <Metric
          icon={Gauge}
          label="Speed"
          value={current ? current.speed.toFixed(1) + ' km/h' : '—'}
          note={current?.status ?? 'No telemetry'}
        />
        <Metric
          icon={Fuel}
          label="Fuel remaining"
          value={current ? current.fuelData.currentLiters.toFixed(1) + ' L' : '—'}
          note={
            current
              ? current.fuelData.fuelPercentage.toFixed(1) + '% · simulated'
              : 'Map a telemetry device'
          }
        />
        <Metric
          icon={Route}
          label="Odometer"
          value={current ? current.odometer.toLocaleString('en-IN') : '—'}
          note="km · simulated"
        />
        <Metric
          icon={Cctv}
          label="Working cameras"
          value={working.length + ' / ' + (r?.channels ?? 0)}
          note={cameraChannels(bus).length + ' starred for bus view'}
        />
      </div>
      <div className="segmented fleet-tabs" role="tablist" aria-label="Bus sections">
        {[
          ['journey', 'GPS & fuel timeline'],
          ['cameras', 'Bus cameras'],
          ['details', 'Vehicle details'],
        ].map(([id, label]) => (
          <button
            role="tab"
            aria-selected={tab === id}
            aria-controls={'panel-' + id}
            id={'tab-' + id}
            key={id}
            className={tab === id ? 'selected' : ''}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <section role="tabpanel" id={'panel-' + tab} aria-labelledby={'tab-' + tab}>
        {tab === 'journey' && <Journey bus={bus} now={now} />}
        {tab === 'details' && (
          <div className="fleet-section">
            <h2>Connected sources</h2>
            <dl className="fleet-details">
              {[
                ['Bus number', bus.busNumber],
                ['Registration', bus.registration],
                ['Driver', bus.driverName],
                ['Driver phone', bus.driverPhone || 'Not supplied'],
                ['Route', bus.routeName || 'Not set'],
                ['Recorder', r?.name || 'Not mapped'],
                ['GPS + fuel device', bus.telemetryDeviceId || 'Not mapped'],
                ['Telemetry source', 'Mock · vendor API pending'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        {tab === 'cameras' && (
          <div className="fleet-section">
            <div className="fleet-toolbar">
              <div>
                <h2>Onboard cameras</h2>
                <p className="muted">
                  Only working sample channels appear. Star cameras for this bus’s default view.
                </p>
              </div>
              {cameraChannels(bus).length > 0 && (
                <Link
                  className="btn btn-primary"
                  href={'/cameras?bus=' + bus.id + '&recorder=' + bus.recorderId}
                >
                  <Cctv size={16} />
                  Open bus camera view
                </Link>
              )}
            </div>
            {working.length === 0 ? (
              <div className="fleet-no-data">
                <Unplug size={28} />
                <h3>No available cameras</h3>
                <p>
                  {r
                    ? 'Recorder offline or channels unavailable in sample data.'
                    : 'Map a recorder to this bus first.'}
                </p>
              </div>
            ) : (
              <div className="bus-camera-grid">
                {working.map((channel) => (
                  <div key={channel} className="bus-camera-card">
                    <div className="bus-camera-placeholder">
                      <Cctv size={27} />
                      <span>CAM {String(channel).padStart(2, '0')}</span>
                      <small>Preview · no live feed connected</small>
                    </div>
                    <div className="bus-camera-label">
                      <div>
                        <strong>{channelName(channel)}</strong>
                        <small>Channel {channel} · sample available</small>
                      </div>
                      <Button
                        variant="ghost"
                        disabled={state.role !== 'admin'}
                        aria-label={
                          (bus.favoriteChannels.includes(channel) ? 'Unstar' : 'Star') +
                          ' Camera ' +
                          channel
                        }
                        aria-pressed={bus.favoriteChannels.includes(channel)}
                        onClick={() => star(channel)}
                      >
                        <Star
                          size={17}
                          fill={bus.favoriteChannels.includes(channel) ? 'currentColor' : 'none'}
                        />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="small muted mt-4">
              SDK channel probes and real live-feed wiring remain separate integration work. Stars
              never grant access permissions.
            </p>
          </div>
        )}
      </section>
      <Confirm
        open={remove}
        onOpenChange={setRemove}
        title={'Remove ' + bus.busNumber + '?'}
        description="This removes the preview bus and its mappings. It does not delete your Hik-Connect recorder."
        action="Remove bus"
        onConfirm={() => {
          patch({ buses: state.buses.filter((b) => b.id !== bus.id) });
          log('Bus removed', bus.busNumber, 'settings');
          toast.success('Preview bus removed.');
          router.push('/');
        }}
      />
    </>
  );
}
function Journey({ bus, now }: { bus: Bus; now: number }) {
  const [range, setRange] = useState(120),
    [cursor, setCursor] = useState<number | null>(null),
    [playing, setPlaying] = useState(false);
  const samples = useMemo(() => mockHistory(bus, now, range), [bus, Math.floor(now / 60), range]);
  const index =
      cursor === null
        ? samples.length - 1
        : Math.max(
            0,
            Math.min(samples.length - 1, Math.round((cursor - (samples[0]?.gpsTime ?? 0)) / 60)),
          ),
    v = samples[index];
  useEffect(() => {
    setCursor(null);
    setPlaying(false);
  }, [bus.id, range, bus.telemetryDeviceId]);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(
      () =>
        setCursor((i) => {
          const next = (i ?? samples[0].gpsTime) + 60;
          if (next >= samples.at(-1)!.gpsTime) {
            setPlaying(false);
            return samples.at(-1)!.gpsTime;
          }
          return next;
        }),
      600,
    );
    return () => clearInterval(id);
  }, [playing, samples.length, samples[0]?.gpsTime]);
  return (
    <div className="journey">
      <div className="fleet-toolbar">
        <div>
          <h2>Journey explorer</h2>
          <p className="muted">One timestamp. The bus location, speed and fuel together.</p>
        </div>
        <label className="compact-select">
          Window
          <select
            aria-label="History window"
            value={range}
            onChange={(e) => setRange(Number(e.target.value))}
          >
            <option value={30}>Last 30 minutes</option>
            <option value={120}>Last 2 hours</option>
            <option value={360}>Last 6 hours</option>
          </select>
        </label>
      </div>
      <div className="journey-grid">
        <RouteMap samples={samples} index={index} />
        <aside className="journey-reading">
          <div>
            <span className="eyebrow">{cursor === null ? 'LATEST SAMPLE' : 'HISTORY CURSOR'}</span>
            <h2>
              {v ? timeLabel(v.gpsTime) : '—'} <small>IST</small>
            </h2>
          </div>
          <Badge tone="amber">Simulated history</Badge>
          {v && (
            <>
              <p>
                <Navigation size={16} />
                {v.status.toLowerCase()} · {v.speed.toFixed(1)} km/h
              </p>
              <div className="journey-fuel">
                <Fuel size={22} />
                <strong>
                  {v.fuelData.currentLiters.toFixed(1)}
                  <small> litres</small>
                </strong>
                <span>{v.fuelData.fuelPercentage.toFixed(1)}% remaining</span>
                <FuelMeter value={v.fuelData.fuelPercentage} />
              </div>
              <p>
                <Radio size={16} />
                Ignition {v.ignition ? 'on' : 'off'}
              </p>
              <p className="small muted">{v.location.address}</p>
              <p className="small muted">
                GPS: {timeLabel(v.gpsTime)} ·{' '}
                {telemetryAge(v, now) === 'stale' ? 'Historical sample' : 'Latest mock sample'}
              </p>
            </>
          )}
        </aside>
      </div>
      {v && (
        <div className="timeline-panel">
          <div className="fleet-toolbar">
            <div className="timeline-title">
              <Clock3 size={16} />
              <strong>GPS + fuel timeline</strong>
              <Badge>{range} min</Badge>
            </div>
            <div className="timeline-buttons">
              <Button
                onClick={() => {
                  if (!playing && (cursor === null || index === samples.length - 1))
                    setCursor(samples[0].gpsTime);
                  setPlaying(!playing);
                }}
              >
                {playing ? <Pause size={14} /> : <Play size={14} />}{' '}
                {playing ? 'Pause replay' : 'Replay'}
              </Button>
              <Button
                onClick={() => {
                  setCursor(null);
                  setPlaying(false);
                }}
              >
                Latest
              </Button>
            </div>
          </div>
          <svg
            className="fuel-chart"
            viewBox="0 0 720 110"
            role="img"
            aria-label="Mock fuel percentage over the selected history window"
          >
            {[25, 50, 75].map((n) => (
              <g key={n}>
                <line x1="35" y1={100 - n} x2="710" y2={100 - n} stroke="var(--line)" />
                <text x="0" y={104 - n} fill="var(--muted)" fontSize="10">
                  {n}%
                </text>
              </g>
            ))}
            <polyline
              points={samples
                .map(
                  (v, i) =>
                    35 +
                    (i / Math.max(1, samples.length - 1)) * 675 +
                    ',' +
                    (100 - v.fuelData.fuelPercentage),
                )
                .join(' ')}
              fill="none"
              stroke="var(--rgu-green)"
              strokeWidth="3"
            />
            <line
              x1={35 + (index / Math.max(1, samples.length - 1)) * 675}
              x2={35 + (index / Math.max(1, samples.length - 1)) * 675}
              y1="0"
              y2="105"
              stroke="var(--accent)"
              strokeWidth="2"
            />
          </svg>
          <input
            className="history-slider"
            type="range"
            aria-label="Journey timeline"
            min={0}
            max={samples.length - 1}
            value={index}
            onChange={(e) => {
              setCursor(samples[Number(e.target.value)].gpsTime);
              setPlaying(false);
            }}
          />
          <div className="timeline-labels">
            <span>{timeLabel(samples[0].gpsTime)}</span>
            <strong data-testid="cursor-time">
              {timeLabel(v.gpsTime)} IST · {v.fuelData.currentLiters.toFixed(1)} L ·{' '}
              {v.speed.toFixed(1)} km/h
            </strong>
            <span>{timeLabel(samples.at(-1)!.gpsTime)}</span>
          </div>
          <p className="small muted">
            This is telemetry history, not recorded camera footage. Mock fuel resets are simulated
            cycles, not detected refuelling events.
          </p>
        </div>
      )}
    </div>
  );
}
