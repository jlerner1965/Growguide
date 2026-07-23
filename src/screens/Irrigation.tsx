// screens/Irrigation.tsx
// hooks -> pure calculators (lib/irrigation) -> render. Setup is device-local
// (localStorage per grow). The calculators describe hardware output, container
// capacity, and what you've already logged — never a prescriptive "needs X
// gallons". A soil-check how-to sits next to every number, because the root
// zone, not the math, is the real signal.
import { useEffect, useMemo, useState } from 'react';
import { useGrows, usePlants, useJournal, useCreateEntry, useProfile } from '../db/hooks';
import { useWeather } from '../weather/useWeather';
import { Sparkline } from '../components/Sparkline';
import {
  emitterOutput, containerVolume, weeklyTotals, plannedVsActual, demandContext,
  SOIL_CHECK_HOWTO, type ContainerShape,
} from '../lib/irrigation';
import * as d from '../lib/derive';

interface IrrigationSetup {
  method: '' | 'Hand' | 'Drip' | 'Soaker hose' | 'Automated';
  placement: '' | 'Container' | 'Raised bed' | 'In-ground';
  soilType: '' | 'Native soil' | 'Amended soil' | 'Potting/soilless mix' | 'Coco';
  shape: ContainerShape;
  // Dimensions are stored canonically in cm; the UI enters/shows them in inches
  // (or cm only if the user's units preference is metric).
  diameterCm: number; lengthCm: number; widthCm: number; heightCm: number;
  emitterCount: number; flowRateGph: number; plannedEventsPerWeek: number;
  /** For a raised bed: whether it has a known finite volume (else treated like in-ground). */
  bedHasKnownVolume: boolean;
}
const DEFAULT_SETUP: IrrigationSetup = {
  method: '', placement: '', soilType: '', shape: 'cylinder',
  diameterCm: 0, lengthCm: 0, widthCm: 0, heightCm: 0,
  emitterCount: 0, flowRateGph: 0, plannedEventsPerWeek: 0,
  bedHasKnownVolume: false,
};

function useLocalSetup(growId: string): [IrrigationSetup, (patch: Partial<IrrigationSetup>) => void] {
  const key = `irrigation-setup:${growId}`;
  const [val, setVal] = useState<IrrigationSetup>(DEFAULT_SETUP);
  useEffect(() => {
    try {
      const raw = growId ? localStorage.getItem(key) : null;
      setVal(raw ? { ...DEFAULT_SETUP, ...JSON.parse(raw) } : DEFAULT_SETUP);
    } catch { setVal(DEFAULT_SETUP); }
  }, [key, growId]);
  function patch(p: Partial<IrrigationSetup>) {
    setVal((prev) => {
      const next = { ...prev, ...p };
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }
  return [val, patch];
}

function SoilCheck() {
  return (
    <div className="card" style={{ padding: '10px 14px', marginTop: 10, borderLeft: '3px solid var(--forest-300)' }}>
      <div className="eyebrow">Before you trust any number — check the soil</div>
      <ul className="list" style={{ marginTop: 4 }}>
        {SOIL_CHECK_HOWTO.map((s, i) => <li key={i} className="small" style={{ padding: '2px 0' }}>• {s}</li>)}
      </ul>
    </div>
  );
}

export function Irrigation() {
  const grows = useGrows();
  const grow = grows.data?.[0];
  const plants = usePlants(grow?.id);
  const journal = useJournal(grow?.id);
  const createEntry = useCreateEntry();
  const wx = useWeather(grow?.lat, grow?.lng);

  const profile = useProfile();
  const units = profile.data?.units ?? 'imperial';
  const activePlants = useMemo(() => (plants.data ?? []).filter((p) => !p.archived), [plants.data]);
  const [plantId, setPlantId] = useState('');
  const [setup, patch] = useLocalSetup(grow?.id ?? '');
  const [runtimeMinutes, setRuntimeMinutes] = useState(30);
  const [manualGal, setManualGal] = useState('');

  // A container volume only makes sense with an actual container (or a raised
  // bed the user says has a known finite volume). In-ground has no container.
  const showContainer = setup.placement === 'Container'
    || (setup.placement === 'Raised bed' && setup.bedHasKnownVolume);

  const entries = journal.data ?? [];

  const emitterGal = emitterOutput({ emitterCount: setup.emitterCount, flowRateGph: setup.flowRateGph, runtimeMinutes });
  const galToLog = manualGal.trim() !== '' && Number.isFinite(Number(manualGal)) ? Number(manualGal) : emitterGal;
  const vol = useMemo(() => containerVolume({
    shape: setup.shape, diameterCm: setup.diameterCm, lengthCm: setup.lengthCm, widthCm: setup.widthCm, heightCm: setup.heightCm,
  }), [setup.shape, setup.diameterCm, setup.lengthCm, setup.widthCm, setup.heightCm]);

  const weeks = useMemo(() => weeklyTotals(entries, plantId ? { plantId } : undefined), [entries, plantId]);
  const pva = useMemo(() => plannedVsActual({
    plannedGalPerEvent: galToLog, eventsPerWeek: setup.plannedEventsPerWeek, entries, plantId: plantId || undefined,
  }), [galToLog, setup.plannedEventsPerWeek, entries, plantId]);
  const demand = useMemo(() => demandContext({
    weatherRisks: wx.risks.map((r) => ({ title: r.title, level: r.level, advice: r.advice })),
    days: wx.days.map((day) => ({ hi: day.hi, precip: day.precip, gust: day.gust })),
  }), [wx.risks, wx.days]);

  if (grows.isLoading) return <div className="content muted">Loading…</div>;
  if (grows.error) return <div className="content error-state">Couldn't load your grows. Retry in a moment.</div>;
  if (!grow) {
    return <div className="content"><div className="card empty"><h4>No grow yet</h4><p>Set up your grow to plan irrigation.</p></div></div>;
  }

  const wateringHistory = entries
    .filter((e) => (plantId ? e.plant_id === plantId : true))
    .filter((e) => e.water_vol_gal != null)
    .slice()
    .sort((a, b) => +new Date(b.occurred_at) - +new Date(a.occurred_at));

  async function logWatering() {
    if (!(galToLog > 0)) { alert('Enter a runtime or a manual gallon amount first.'); return; }
    try {
      await createEntry.mutateAsync({ grow_id: grow!.id, plant_id: plantId || null, tags: ['Watered'], water_vol_gal: galToLog });
    } catch {
      alert('Could not log watering. Try again.');
    }
  }

  const numField = (label: string, value: number, on: (n: number) => void, opts?: { step?: string }) => (
    <label className="field" style={{ margin: 0 }}>
      <span className="lab">{label}</span>
      <input inputMode="decimal" step={opts?.step} value={String(value)} onChange={(e) => on(e.target.value === '' ? 0 : Number(e.target.value))} />
    </label>
  );
  // A length input shown in the user's units (inches by default) but stored in cm.
  const lenField = (label: string, cm: number, setCm: (cm: number) => void) =>
    numField(`${label} (${d.lengthUnit(units)})`, d.cmToLengthInput(cm, units), (v) => setCm(d.heightInputToCm(v, units)));

  return (
    <div className="content" style={{ maxWidth: 940 }}>
      <div className="page-head"><h2>Irrigation Manager</h2></div>
      <div className="page-sub">These tools do the arithmetic and track what you've logged. They can't know your plant's actual need — only a hand check of the root zone can. Never water purely by a number here.</div>

      <label className="field" style={{ maxWidth: 320 }}>
        <span className="lab">Log / view for</span>
        <select value={plantId} onChange={(e) => setPlantId(e.target.value)}>
          <option value="">Whole grow</option>
          {activePlants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>

      {/* Setup */}
      <div className="eyebrow" style={{ marginBottom: 8 }}>Setup</div>
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div className="small muted" style={{ marginBottom: 10 }}>Saved on this device for this grow (no account sync).</div>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
          <label className="field" style={{ margin: 0 }}>
            <span className="lab">Method</span>
            <select value={setup.method} onChange={(e) => patch({ method: e.target.value as IrrigationSetup['method'] })}>
              <option value="">Unset</option><option>Hand</option><option>Drip</option><option>Soaker hose</option><option>Automated</option>
            </select>
          </label>
          <label className="field" style={{ margin: 0 }}>
            <span className="lab">Placement</span>
            <select value={setup.placement} onChange={(e) => patch({ placement: e.target.value as IrrigationSetup['placement'] })}>
              <option value="">Unset</option><option>Container</option><option>Raised bed</option><option>In-ground</option>
            </select>
          </label>
          <label className="field" style={{ margin: 0 }}>
            <span className="lab">Soil type</span>
            <select value={setup.soilType} onChange={(e) => patch({ soilType: e.target.value as IrrigationSetup['soilType'] })}>
              <option value="">Unset</option><option>Native soil</option><option>Amended soil</option><option>Potting/soilless mix</option><option>Coco</option>
            </select>
          </label>
          {setup.placement === 'Raised bed' && (
            <label className="field" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
              <span className="lab">Known finite volume?</span>
              <label className="small" style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer', paddingTop: 8 }}>
                <input type="checkbox" checked={setup.bedHasKnownVolume} onChange={(e) => patch({ bedHasKnownVolume: e.target.checked })} />
                This bed has a known volume
              </label>
            </label>
          )}
          {showContainer && (
            <label className="field" style={{ margin: 0 }}>
              <span className="lab">Container shape</span>
              <select value={setup.shape} onChange={(e) => patch({ shape: e.target.value as ContainerShape })}>
                <option value="cylinder">Round pot</option><option value="rectangular">Rectangular bed/pot</option>
              </select>
            </label>
          )}
          {showContainer && (setup.shape === 'cylinder'
            ? lenField('Diameter', setup.diameterCm, (cm) => patch({ diameterCm: cm }))
            : (<>{lenField('Length', setup.lengthCm, (cm) => patch({ lengthCm: cm }))}{lenField('Width', setup.widthCm, (cm) => patch({ widthCm: cm }))}</>))}
          {showContainer && lenField('Medium depth', setup.heightCm, (cm) => patch({ heightCm: cm }))}
          {numField('Emitter count', setup.emitterCount, (n) => patch({ emitterCount: n }))}
          {numField('Flow rate (GPH/emitter)', setup.flowRateGph, (n) => patch({ flowRateGph: n }), { step: '0.1' })}
          {numField('Planned events / week', setup.plannedEventsPerWeek, (n) => patch({ plannedEventsPerWeek: n }))}
        </div>
      </div>

      {/* Calculators */}
      <div className="eyebrow" style={{ marginBottom: 8 }}>Calculators</div>
      <div className="card" style={{ padding: 16, marginBottom: 8 }}>
        <div className="grid2">
          <div>
            <div className="eyebrow">Gallons per event (emitter math)</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginTop: 6 }}>
              {numField('Runtime (min)', runtimeMinutes, setRuntimeMinutes)}
              <div style={{ paddingBottom: 8 }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{emitterGal} gal</div>
                <div className="small muted">{setup.emitterCount} emitter(s) × {setup.flowRateGph} GPH</div>
              </div>
            </div>
            <label className="field" style={{ marginTop: 8 }}>
              <span className="lab">…or enter gallons manually</span>
              <input inputMode="decimal" value={manualGal} onChange={(e) => setManualGal(e.target.value)} placeholder={`${emitterGal}`} />
            </label>
          </div>
          {showContainer ? (
            <div>
              <div className="eyebrow">Container volume</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{d.fmtVolume(vol.gallons, units)}</div>
              <div className="small muted">Rough water-holding estimate: ~{d.fmtVolume(vol.rootZoneHoldingGalEstimate, units)}</div>
              <div className="small muted" style={{ marginTop: 4 }}>{vol.assumption}</div>
            </div>
          ) : (
            <div>
              <div className="eyebrow">In-ground / open bed</div>
              <div className="small muted" style={{ marginTop: 6 }}>
                No container, so there's no fixed volume to compute. Irrigation here is about the wetted area and how deep the water penetrates — verified by probing the root zone, not by a gallon figure. The emitter math on the left still applies.
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <span className="small muted">Logging <strong>{galToLog} gal</strong>{plantId ? '' : ' to the whole grow'}.</span>
          <span className="spacer" />
          <button className="btn primary" onClick={logWatering} disabled={createEntry.isPending || !(galToLog > 0)}>
            {createEntry.isPending ? 'Logging…' : 'Log watering'}
          </button>
        </div>
        <SoilCheck />
      </div>

      {/* Planned vs actual + demand */}
      <div className="grid2" style={{ marginBottom: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="eyebrow">Planned vs. actual (last 7 days)</div>
          <div style={{ display: 'flex', gap: 16, margin: '8px 0' }}>
            <div><div style={{ fontSize: 20, fontWeight: 700 }}>{pva.actualLast7DaysGal}</div><div className="small muted">logged gal</div></div>
            <div><div style={{ fontSize: 20, fontWeight: 700 }}>{pva.plannedWeeklyGal}</div><div className="small muted">planned gal/wk</div></div>
            <div><div style={{ fontSize: 20, fontWeight: 700, color: pva.differenceGal >= 0 ? 'var(--forest)' : 'var(--amber)' }}>{pva.differenceGal >= 0 ? '+' : ''}{pva.differenceGal}</div><div className="small muted">difference</div></div>
          </div>
          <div className="small muted">{pva.note}</div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div className="eyebrow">Weather &amp; demand — qualitative only</div>
          <ul className="list" style={{ marginTop: 6 }}>
            {demand.notes.map((n, i) => <li key={i} className="small" style={{ padding: '3px 0' }}>• {n}</li>)}
          </ul>
        </div>
      </div>

      {/* Weekly chart + history */}
      <div className="eyebrow" style={{ marginBottom: 8 }}>Weekly gallons {plantId ? 'for this plant' : '(whole grow)'}</div>
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <Sparkline points={weeks.map((w) => ({ x: w.weekStart, y: w.gallons }))} />
        <div className="small muted" style={{ marginTop: 6 }}>Gallons logged per week (weeks with entries). This is history, not a target.</div>
      </div>

      <div className="eyebrow" style={{ marginBottom: 8 }}>Recent watering</div>
      <div className="card">
        {wateringHistory.length === 0 ? (
          <div className="empty"><p>No watering logged yet. Use “Log watering” above.</p></div>
        ) : (
          <ul className="list">
            {wateringHistory.slice(0, 20).map((e) => {
              const plant = activePlants.find((p) => p.id === e.plant_id);
              return (
                <li key={e.id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span><strong>{e.water_vol_gal} gal</strong> <span className="small muted">· {plant ? plant.name : 'Whole grow'}</span></span>
                  <span className="small muted">{d.fmtDateTime(e.occurred_at)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
