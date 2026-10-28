'use client';
import { useState, useEffect, useMemo, type ReactNode, type CSSProperties } from 'react';
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
import { useWorkspace } from './workspace-provider';
import { Badge, Button, Confirm, Field, Modal, PageHeading, SearchInput, Reveal } from './ui';
import { JourneyMap } from './journey-map';
import { CameraPreview } from './camera-preview';
import { AsciiLoading } from './ascii-loading';
import { channelName } from '@/lib/model';
import {
  type Bus,
  type Vehicle,
  workingChannels,
  cameraChannels,
  validateBus,
  timeLabel,
  telemetryAge,
} from '@/lib/fleet';
import { request, fleetApi } from '@/lib/api';
function useClock() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 10000);
    return () => clearInterval(t);
  }, []);
  return now;
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
function Heading({
  compact,
  count,
  children,
}: {
  compact: boolean;
  count: number;
  children: ReactNode;
}) {
  return compact ? (
    <div className="bus-directory-heading">
      <div>
        <h1>Buses</h1>
        <span className="count-chip">{count}</span>
      </div>
      <div className="bus-directory-actions">{children}</div>
    </div>
  ) : (
    <PageHeading
      eyebrow="RGU FLEET MANAGEMENT"
      title="One fleet. Every perspective."
      description="Your bus cameras, fleet and stored GPS/fuel observations."
    >
      {children}
    </PageHeading>
  );
}
export function FleetWorkspace({ busesOnly = false }: { busesOnly?: boolean }) {
  const { state, ready, user, provider, telemetry, refresh, refreshDevices } = useWorkspace(),
    query = useSearchParams(),
    now = useClock();
  const [search, setSearch] = useState(''),
    [filter, setFilter] = useState('all'),
    [busColumns, setBusColumns] = useState(3),
    [editor, setEditor] = useState<Bus | null>(null),
    [busy, setBusy] = useState(false);
  const recorders = state.recorders,
    vehicles = telemetry?.data.vehicles ?? [],
    detail = state.buses.find((b) => b.id === query.get('bus')),
    busCardHeights = [0, 440, 380, 340, 310, 285, 265];

  useEffect(() => {
    const qParam = query.get('q');
    if (qParam && qParam !== search) {
      setSearch(qParam);
    }
  }, [query]);

  if (!ready || now === null) return <AsciiLoading label="Loading fleet..." cards={4} />;
  if (query.get('bus') && !detail)
    return (
      <div className="fleet-no-data">
        <BusFront size={30} />
        <h1>Bus not found</h1>
        <Link href="/buses">Return to buses</Link>
      </div>
    );
  const reading = (b: Bus) => vehicles.find((v) => v.deviceId === b.telemetryDeviceId);
  const list = state.buses
    .filter((b) =>
      (b.busNumber + ' ' + b.registration + ' ' + b.driverName + ' ' + b.routeName)
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .filter(
      (b) =>
        filter === 'all' ||
        (filter === 'moving' &&
          reading(b)?.status === 'MOVING' &&
          telemetryAge(reading(b), now) === 'fresh') ||
        (filter === 'unmapped' && (!b.recorderId || !b.telemetryDeviceId)),
    );
  return (
    <div className={`fleet-workspace ${busesOnly && !detail ? 'bus-directory' : ''}`}>
      {detail ? (
        <BusDetail bus={detail} now={now} onEdit={() => setEditor(detail)} />
      ) : (
        <>
          <Heading compact={busesOnly} count={state.buses.length}>
            <Button
              loading={busy}
              onClick={() => {
                setBusy(true);
                void (async () => {
                  try {
                    if (provider?.connected) await refreshDevices();
                    await refresh();
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              <RefreshCw size={15} />
              Refresh
            </Button>
            {user?.role === 'admin' && (
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
          </Heading>
          {!busesOnly && (
            <>
              <div className="fleet-source">
                <Radio size={15} />
                <strong>
                  {provider?.connected
                    ? 'Hik-Connect connected'
                    : 'Connect Hik-Connect in Settings'}
                </strong>
                <span>
                  {vehicles.length
                    ? 'GPS/fuel: stored WheelsEye observations'
                    : 'GPS/fuel: no observations stored yet'}
                </span>
              </div>
              <div className="stats-grid">
                <Metric
                  icon={BusFront}
                  label="Fleet size"
                  value={String(state.buses.length)}
                  note="Saved in your workspace"
                />
                <Metric
                  icon={Navigation}
                  label="Moving"
                  value={String(
                    vehicles.filter(
                      (v) => v.status === 'MOVING' && telemetryAge(v, now) === 'fresh',
                    ).length,
                  )}
                  note="Fresh telemetry observations"
                />
                <Metric
                  icon={Fuel}
                  label="Fuel monitored"
                  value={String(vehicles.length)}
                  note="Stored telemetry device readings"
                />
                <Metric
                  icon={Cctv}
                  label="Verified camera channels"
                  value={String(
                    recorders.reduce((n, r) => n + workingChannels(recorders, r.id).length, 0),
                  )}
                  note="Recently observed SDK frames"
                />
              </div>
            </>
          )}
          <div className={busesOnly ? 'bus-directory-tools' : ''}>
            <div className="fleet-toolbar">
              {!busesOnly && (
                <div>
                  <h2>Your buses</h2>
                  <p className="muted">Select a vehicle for its cameras and journey data.</p>
                </div>
              )}
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search buses, drivers or routes"
              />
              <div className="bus-density-control">
                <span className="bus-density-caption">Buses per row</span>
                <div className="bus-density-slider-deck">
                  <span className="density-bound min" title="Minimum: 1 bus per row">
                    <span className="bound-tag">Min</span> 1
                  </span>
                  <div className="density-track-wrapper">
                    <input
                      type="range"
                      className="density-range-input"
                      min="1"
                      max="6"
                      step="1"
                      value={busColumns}
                      aria-label="Buses per row (min: 1, max: 6)"
                      onChange={(e) => setBusColumns(Number(e.target.value))}
                    />
                    <div className="density-ticks" aria-hidden="true">
                      {[1, 2, 3, 4, 5, 6].map((lvl) => (
                        <span
                          key={lvl}
                          className={`density-tick ${busColumns >= lvl ? 'filled' : ''} ${busColumns === lvl ? 'active' : ''}`}
                          title={`Level ${lvl}`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="density-bound max" title="Maximum: 6 buses per row">
                    <span className="bound-tag">Max</span> 6
                  </span>
                </div>
                <div
                  className="bus-density-indicator"
                  title={`Selected: ${busColumns} buses per row (Min: 1, Max: 6)`}
                >
                  <strong>{busColumns}</strong>
                  <span className="density-max-hint">/ 6</span>
                </div>
              </div>
            </div>
            <div className="segmented fleet-filters" aria-label="Bus filter">
              {[
                ['all', 'All buses'],
                ['moving', 'Moving'],
                ['unmapped', 'Needs mapping'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  className={filter === id ? 'selected' : ''}
                  aria-pressed={filter === id}
                  onClick={() => setFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {!list.length ? (
            <div className="fleet-no-data">
              <BusFront size={30} />
              <h3>{state.buses.length ? 'No matching buses' : 'No buses configured'}</h3>
              <p>
                {user?.role === 'admin'
                  ? 'Import your Hik-Connect recorders, then add and map a bus.'
                  : 'Your administrator manages bus configuration and recorder access.'}
              </p>
            </div>
          ) : (
            <div
              className="fleet-bus-grid"
              style={
                {
                  '--bus-columns': busColumns,
                  '--bus-card-height': `${busCardHeights[busColumns]}px`,
                } as CSSProperties
              }
            >
              {list.map((bus, i) => {
                const v = reading(bus),
                  r = recorders.find((r) => r.id === bus.recorderId),
                  stale = telemetryAge(v, now) === 'stale';
                return (
                  <Reveal className="bus-card" key={bus.id} delay={Math.min(i * 0.035, 0.2)}>
                    <Link
                      className="bus-card-main"
                      href={'/buses?bus=' + bus.id}
                      aria-label={'Open ' + bus.busNumber}
                    >
                      <div className="bus-card-head">
                        <span className="bus-glyph">
                          <BusFront size={26} />
                        </span>
                        <Badge
                          tone={stale ? 'amber' : v?.status === 'MOVING' ? 'green' : 'neutral'}
                        >
                          {stale ? 'Stale GPS' : (v?.status.toLowerCase() ?? 'No GPS')}
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
                          <strong>{v?.speed.toFixed(0) ?? '—'}</strong>
                          <span>km/h</span>
                        </div>
                        <div>
                          <Fuel size={16} />
                          <strong>{v?.fuelData ? v.fuelData.currentLiters.toFixed(1) : '—'}</strong>
                          <span>litres</span>
                        </div>
                      </div>
                      {v?.fuelData && <FuelMeter value={v.fuelData.fuelPercentage} />}
                      <div className="bus-card-footer">
                        <span>
                          <UserRound size={14} />
                          {bus.driverName}
                        </span>
                        <span>
                          <Cctv size={14} />
                          {workingChannels(recorders, bus.recorderId).length}/{r?.channels ?? 0}
                        </span>
                      </div>
                    </Link>
                    <div className="bus-mapping">
                      <span>
                        <i className={'status-dot ' + (r?.online ? '' : 'offline')} />
                        {r?.name ?? 'No recorder mapped'}
                      </span>
                      <span>{bus.telemetryDeviceId ?? 'No telemetry device'}</span>
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
  const { state, user, saveBus } = useWorkspace(),
    [draft, setDraft] = useState<Bus | null>(null),
    [busy, setBusy] = useState(false),
    [telemetrySources, setTelemetrySources] = useState<any[]>([]),
    [telemetryLoading, setTelemetryLoading] = useState(false),
    [telemetryError, setTelemetryError] = useState('');
  useEffect(() => setDraft(bus), [bus]);
  useEffect(() => {
    if (!bus || user?.role !== 'admin') return;
    setTelemetryLoading(true);
    setTelemetryError('');
    void fleetApi
      .wheelseyeSources()
      .then((result) => setTelemetrySources(result.sources || []))
      .catch((error) => setTelemetryError(error.message || 'Unable to load GPS devices.'))
      .finally(() => setTelemetryLoading(false));
  }, [bus, user?.id]);
  if (!draft) return null;
  const set = (change: Partial<Bus>) => setDraft({ ...draft, ...change });
  return (
    <Modal
      open={!!bus}
      onOpenChange={(v) => !v && onClose()}
      title={draft.id ? 'Edit bus' : 'Add a bus'}
      description="Save bus details and device mappings to your workspace’s PostgreSQL database."
      wide
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (user?.role !== 'admin') return;
          const clean = {
              ...draft,
              busNumber: draft.busNumber.trim(),
              registration: draft.registration.trim().toUpperCase(),
              driverName: draft.driverName.trim(),
            },
            error = validateBus(clean, state.buses);
          if (error) return toast.error(error);
          setBusy(true);
          try {
            await saveBus(clean);
            onClose();
            toast.success('Bus saved.');
          } catch (e) {
            toast.error((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="fleet-form-grid">
          <Field label="Bus number">
            <input
              required
              maxLength={40}
              value={draft.busNumber}
              onChange={(e) => set({ busNumber: e.target.value })}
            />
          </Field>
          <Field label="Registration">
            <input
              required
              maxLength={40}
              value={draft.registration}
              onChange={(e) => set({ registration: e.target.value })}
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
          <Field label="Recorder">
            <select
              value={draft.recorderId ?? ''}
              onChange={(e) => set({ recorderId: e.target.value || null, favoriteChannels: [] })}
            >
              <option value="">Not mapped</option>
              {state.recorders.map((r) => (
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
          <Field label="GPS + fuel device">
            <select
              aria-label="GPS + fuel device"
              value={draft.telemetryDeviceId ?? ''}
              onChange={(e) => set({ telemetryDeviceId: e.target.value.trim() || null })}
            >
              <option value="">Not mapped</option>
              {!telemetryLoading && !telemetrySources.some((source) => source.devices?.length) && (
                <option value="" disabled>
                  No discovered WheelsEye devices yet
                </option>
              )}
              {telemetrySources.flatMap((source) =>
                (source.devices || []).map((device: any) => (
                  <option key={`${source.id}:${device.deviceNumber}`} value={device.deviceNumber}>
                    {device.vehicleNumber || device.deviceNumber} · {device.deviceNumber} ·{' '}
                    {source.label}
                  </option>
                )),
              )}
            </select>
          </Field>
        </div>
        <div className="fleet-form-help">
          <span>
            {telemetryLoading
              ? 'Loading discovered WheelsEye devices…'
              : telemetryError ||
                'Select the provider device that belongs to this bus. Its GPS history will appear on the bus journey page.'}
          </span>
          <Button
            type="button"
            variant="ghost"
            loading={telemetryLoading}
            onClick={async () => {
              setTelemetryLoading(true);
              setTelemetryError('');
              try {
                const result = await fleetApi.wheelseyeSources();
                setTelemetrySources(result.sources || []);
                toast.success('WheelsEye device list refreshed.');
              } catch (error) {
                setTelemetryError((error as Error).message);
              } finally {
                setTelemetryLoading(false);
              }
            }}
          >
            <RefreshCw size={14} />
            Refresh devices
          </Button>
        </div>
        <p className="small muted">
          Only real imported recorders and discovered WheelsEye devices are listed. Camera
          availability is checked through the SDK, separately from recorder status.
        </p>
        <div className="modal-footer">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={busy}>
            Save bus
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function BusDetail({ bus, now, onEdit }: { bus: Bus; now: number; onEdit: () => void }) {
  const { state, user, provider, telemetry, saveBus, removeBus, refresh } = useWorkspace(),
    router = useRouter();
  const [tab, setTab] = useState('journey'),
    [remove, setRemove] = useState(false),
    [probing, setProbing] = useState(false);
  const r = state.recorders.find((r) => r.id === bus.recorderId),
    working = workingChannels(state.recorders, bus.recorderId),
    v = telemetry?.data.vehicles.find((v) => v.deviceId === bus.telemetryDeviceId);
  async function probe() {
    if (!r) return;
    setProbing(true);
    let count = 0;
    try {
      for (const channel of r.channelList) {
        try {
          await request(
            '/api/previews/frame?' +
              new URLSearchParams({ deviceId: r.id, channel: String(channel.number) }),
          );
          count++;
        } catch (e) {
          if (
            ['provider-auth-required', 'playback-auth-required', 'viewer-auth-required'].includes(
              (e as any).code,
            )
          )
            throw e;
        }
      }
      await refresh();
      toast.info(count + ' camera channels returned frames.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setProbing(false);
    }
  }
  return (
    <>
      <Link className="btn btn-ghost fleet-back" href="/buses">
        <ArrowLeft size={16} />
        Back to buses
      </Link>
      <PageHeading
        eyebrow="VEHICLE OPERATIONS"
        title={bus.busNumber}
        description={bus.registration + ' · ' + (bus.routeName || 'Route not set')}
      >
        {user?.role === 'admin' && (
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
          {r?.name ?? 'No recorder mapped'}
        </span>
        <span>
          <Radio size={16} />
          {bus.telemetryDeviceId ?? 'No telemetry mapped'}
        </span>
      </div>
      <div className="stats-grid">
        <Metric
          icon={Gauge}
          label="Speed"
          value={v ? v.speed.toFixed(1) + ' km/h' : '—'}
          note={
            v
              ? telemetryAge(v, now) === 'stale'
                ? 'Stale observation'
                : v.status
              : 'No stored reading'
          }
        />
        <Metric
          icon={Fuel}
          label="Fuel remaining"
          value={v?.fuelData ? v.fuelData.currentLiters.toFixed(1) + ' L' : 'Unavailable'}
          note={
            v
              ? v.fuelData
                ? v.fuelData.fuelPercentage.toFixed(1) + '% · ' + telemetry?.source
                : 'Fuel data unavailable from provider'
              : 'No stored reading'
          }
        />
        <Metric
          icon={Route}
          label="Odometer"
          value={v ? v.odometer.toLocaleString('en-IN') : '—'}
          note={v ? 'km · stored observation' : 'No stored reading'}
        />
        <Metric
          icon={Cctv}
          label="Verified cameras"
          value={working.length + ' / ' + (r?.channels ?? 0)}
          note={cameraChannels(bus, state.recorders).length + ' starred for bus view'}
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
            key={id}
            className={tab === id ? 'selected' : ''}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'journey' && <Journey bus={bus} now={now} />}
      {tab === 'details' && (
        <section className="fleet-section">
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
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {tab === 'cameras' && (
        <section className="fleet-section">
          <div className="fleet-toolbar">
            <div>
              <h2>Onboard cameras</h2>
              <p className="muted">
                A successful SDK frame verifies availability. Unchecked channels stay unknown.
              </p>
            </div>
            <div className="control-actions">
              <Button
                loading={probing}
                disabled={!r?.online || !provider?.playbackReady}
                onClick={() => void probe()}
              >
                Check camera availability
              </Button>
              {cameraChannels(bus, state.recorders).length > 0 && (
                <Link
                  className="btn btn-primary"
                  href={
                    '/cameras?bus=' + bus.id + '&recorder=' + encodeURIComponent(bus.recorderId!)
                  }
                >
                  Open bus camera view
                </Link>
              )}
            </div>
          </div>
          {!working.length ? (
            <div className="fleet-no-data">
              <Cctv size={28} />
              <h3>No verified cameras yet</h3>
              <p>
                {!r
                  ? 'Map a recorder first.'
                  : !r.online
                    ? 'Hik-Connect reports this recorder offline.'
                    : !provider?.playbackReady
                      ? 'Connect playback authorization in Settings.'
                      : 'Check camera availability to find working channels.'}
              </p>
            </div>
          ) : (
            <div className="bus-camera-grid">
              {working.map((channel) => (
                <div className="bus-camera-card" key={channel}>
                  <CameraPreview
                    deviceId={r!.id}
                    channel={channel}
                    enabled={r?.online && provider?.playbackReady}
                  />
                  <div className="bus-camera-label">
                    <div>
                      <strong>{channelName(channel, r)}</strong>
                      <small>Channel {channel} · SDK verified</small>
                    </div>
                    <Button
                      variant="ghost"
                      disabled={user?.role !== 'admin'}
                      aria-label={
                        (bus.favoriteChannels.includes(channel) ? 'Unstar' : 'Star') +
                        ' Camera ' +
                        channel
                      }
                      aria-pressed={bus.favoriteChannels.includes(channel)}
                      onClick={() =>
                        void saveBus({
                          ...bus,
                          favoriteChannels: bus.favoriteChannels.includes(channel)
                            ? bus.favoriteChannels.filter((n) => n !== channel)
                            : [...bus.favoriteChannels, channel],
                        }).catch((e) => toast.error(e.message))
                      }
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
            {r?.channelList.filter((c) => c.health === 'unknown').length ?? 0} unchecked channels.
            Stars are display preferences and never grant permissions.
          </p>
        </section>
      )}
      <Confirm
        open={remove}
        onOpenChange={setRemove}
        title={'Remove ' + bus.busNumber + '?'}
        description="Removes this bus and its stored telemetry, not the physical recorder."
        action="Remove bus"
        onConfirm={async () => {
          try {
            await removeBus(bus.id);
            router.push('/buses');
            toast.success('Bus removed.');
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />
    </>
  );
}
function Journey({ bus, now }: { bus: Bus; now: number }) {
  const { user } = useWorkspace();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()),
    [date, setDate] = useState(today),
    [range, setRange] = useState(1440),
    [cursor, setCursor] = useState<number | null>(null),
    [playing, setPlaying] = useState(false),
    [samples, setSamples] = useState<Vehicle[]>([]),
    [source, setSource] = useState<string | undefined>(),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    setSamples([]);
    setLoading(true);
    setError('');
    if (!bus.telemetryDeviceId) {
      setLoading(false);
      return;
    }
    const dayStart = Math.floor(new Date(`${date}T00:00:00+05:30`).getTime() / 1000),
      dayEnd = dayStart + 86400,
      selectedEnd = Math.min(dayEnd, Math.floor(Date.now() / 1000)),
      from = Math.max(dayStart, selectedEnd - range * 60);
    let first = true;
    const readHistory = async () => {
      try {
        const result = await fleetApi.history(
          bus.id,
          from,
          selectedEnd,
          abort.signal,
        );
        const ordered = result.samples
          .map((sample) => sample.vehicle)
          .sort((a, b) => a.gpsTime - b.gpsTime);
        setSamples(ordered);
        setSource(result.samples.some((sample) => sample.source === 'vendor') ? 'vendor' : undefined);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setError((e as Error).message);
      } finally {
        if (first && !abort.signal.aborted) {
          first = false;
          setLoading(false);
        }
      }
    };
    void readHistory();
    const timer = setInterval(() => void readHistory(), 60000);
    return () => {
      clearInterval(timer);
      abort.abort();
    };
  }, [bus.id, bus.telemetryDeviceId, range, date, user?.id]);
  const index =
      cursor === null
        ? samples.length - 1
        : samples.reduce((best, sample, i) =>
            Math.abs(sample.gpsTime - cursor) < Math.abs(samples[best].gpsTime - cursor) ? i : best,
          0),
    v = samples[index];
  useEffect(() => {
    setCursor(null);
    setPlaying(false);
  }, [bus.id, range, date, bus.telemetryDeviceId]);
  useEffect(() => {
    if (!playing || !samples.length) return;
    const id = setInterval(
      () =>
        setCursor((i) => {
          const n = (i ?? samples[0].gpsTime) + 60;
          if (n >= samples.at(-1)!.gpsTime) {
            setPlaying(false);
            return samples.at(-1)!.gpsTime;
          }
          return n;
        }),
      600,
    );
    return () => clearInterval(id);
  }, [playing, samples]);
  if (loading) return <AsciiLoading label="Loading stored GPS/fuel history..." cards={2} compact />;
  if (!v)
    return (
      <div className="fleet-no-data">
        <Unplug size={28} />
        <h3>
          {!bus.telemetryDeviceId ? 'No telemetry device mapped' : 'No observations stored yet'}
        </h3>
        <p>
          {error ||
            'The backend will show this timeline after the WheelsEye device is discovered and mapped to this bus.'}
        </p>
      </div>
    );
  return (
    <section className="journey">
      <div className="fleet-toolbar">
        <div>
          <h2>Journey explorer</h2>
          <p className="muted">Persisted one-minute WheelsEye GPS, speed, ignition and fuel samples.</p>
        </div>
        <label className="compact-select">
          Date
          <input
            type="date"
            aria-label="Timeline date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
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
            <option value={1440}>Full day</option>
          </select>
        </label>
      </div>
      <div className="journey-grid">
        <JourneyMap samples={samples} index={index} source={source} />
        <aside className="journey-reading">
          <div>
            <span className="eyebrow">
              {cursor === null ? 'LATEST STORED SAMPLE' : 'HISTORY CURSOR'}
            </span>
            <h2>
              {timeLabel(v.gpsTime)} <small>IST</small>
            </h2>
          </div>
          <Badge tone="neutral">{source === 'vendor' ? 'WheelsEye observations' : 'Provider observations'}</Badge>
          <p>
            <Navigation size={16} />
            {v.status.toLowerCase()} · {v.speed.toFixed(1)} km/h
          </p>
          <div className="journey-fuel">
            <Fuel size={22} />
            <strong>
              {v.fuelData ? v.fuelData.currentLiters.toFixed(1) : '—'}
              {v.fuelData && <small> litres</small>}
            </strong>
            <span>
              {v.fuelData
                ? `${v.fuelData.fuelPercentage.toFixed(1)}% remaining`
                : 'Fuel data unavailable'}
            </span>
            {v.fuelData && <FuelMeter value={v.fuelData.fuelPercentage} />}
          </div>
          <p>
            <Radio size={16} />
            Ignition {v.ignition ? 'on' : 'off'}
          </p>
          <p className="small muted">{v.location.address}</p>
          <p className="small muted">
            GPS: {timeLabel(v.gpsTime)} ·{' '}
            {telemetryAge(v, now) === 'stale'
              ? 'Historical / stale observation'
              : 'Recent observation'}
          </p>
        </aside>
      </div>
      <div className="timeline-panel">
        <div className="fleet-toolbar">
          <div className="timeline-title">
            <Clock3 size={16} />
            <strong>GPS + fuel timeline</strong>
            <Badge>{source || 'Stored'}</Badge>
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
          aria-label="Stored fuel percentage history"
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
              .flatMap((v, i) =>
                v.fuelData
                  ? [
                      35 +
                        (i / Math.max(1, samples.length - 1)) * 675 +
                        ',' +
                        (100 - v.fuelData.fuelPercentage),
                    ]
                  : [],
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
            {timeLabel(v.gpsTime)} IST ·{' '}
            {v.fuelData ? v.fuelData.currentLiters.toFixed(1) + ' L · ' : 'Fuel unavailable · '}
            {v.speed.toFixed(1)} km/h
          </strong>
          <span>{timeLabel(samples.at(-1)!.gpsTime)}</span>
        </div>
        <p className="small muted">
          The active map and timeline are refreshed directly from WheelsEye for this mapped bus.
        </p>
      </div>
    </section>
  );
}
