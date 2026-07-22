// screens/Harvest.tsx
// hooks -> pure logic (lib/harvest) -> render. Per-plant harvest view:
// an estimated WINDOW (never a single date) with confidence, what drove it,
// and what would sharpen it; a trichome-check logger (saved as a journal
// entry, no schema change); and interactive preharvest checklists persisted
// in device-local storage (kept deliberately simple — no new tables).
import { useEffect, useMemo, useState } from 'react';
import { useGrows, usePlants, useJournal, useCreateEntry } from '../db/hooks';
import { useWeather } from '../weather/useWeather';
import {
  estimateHarvest, latestTrichomeCheck, TRICHOME_TAG, TRICHOME_STAGES, TRICHOME_GUIDE,
  type TrichomeStage, type Confidence, type HarvestWeatherRisk,
} from '../lib/harvest';
import * as d from '../lib/derive';

const CONFIDENCE_PILL: Record<Confidence, string> = { High: 'blue', Moderate: 'amber', Low: 'gray' };

const CHECKLISTS: { title: string; items: string[] }[] = [
  { title: 'Preharvest inspection', items: ['Trichomes checked on multiple colas (top + lower)', 'Pistil color/curl noted on main colas', 'Plants photographed for your records'] },
  { title: 'Weather evaluation', items: ['7-day forecast checked for frost and rain', 'Cutoff date decided if a hard frost is coming', 'Dry-weather harvest morning planned if possible'] },
  { title: 'Pest & mold inspection', items: ['Dense colas inspected for gray fuzzy rot (botrytis)', 'Leaf undersides checked for mites/eggs', 'Any rotted/damaged bud removed immediately'] },
  { title: 'Equipment prep', items: ['Clean, sharp pruners/scissors ready', 'Gloves and collection bins/bags on hand', 'Labels/tags for each plant'] },
  { title: 'Harvest sequencing', items: ['Whole-plant vs staggered-by-ripeness decided', 'Ripest colas harvested first if staggering', 'Plants/cultivars kept separated and labeled'] },
  { title: 'Drying-space prep', items: ['Dark space (~60°F / ~60% RH target) with gentle airflow', 'Hangers or drying racks set up', 'Hygrometer/thermometer placed in the space'] },
  { title: 'Sanitation', items: ['Hands, tools, and surfaces cleaned', 'Fresh bags/containers ready', 'Debris cleared from the work area'] },
  { title: 'Recordkeeping', items: ['Harvest date logged per plant', 'Wet weight recorded (optional)', 'Observations noted for next season'] },
];

function useChecklist(plantId: string) {
  const key = `harvest-checklist:${plantId}`;
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const raw = plantId ? localStorage.getItem(key) : null;
      setChecked(raw ? JSON.parse(raw) : {});
    } catch { setChecked({}); }
  }, [key, plantId]);
  function toggle(itemKey: string) {
    setChecked((prev) => {
      const next = { ...prev, [itemKey]: !prev[itemKey] };
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore quota/availability */ }
      return next;
    });
  }
  return { checked, toggle };
}

export function Harvest() {
  const grows = useGrows();
  const grow = grows.data?.[0];
  const plants = usePlants(grow?.id);
  const journal = useJournal(grow?.id);
  const wx = useWeather(grow?.lat, grow?.lng);
  const createEntry = useCreateEntry();

  const activePlants = useMemo(() => (plants.data ?? []).filter((p) => !p.archived), [plants.data]);
  const [plantId, setPlantId] = useState('');
  const selectedPlantId = plantId || activePlants[0]?.id || '';
  const plant = activePlants.find((p) => p.id === selectedPlantId);

  const [stage, setStage] = useState<TrichomeStage | ''>('');
  const [trichNote, setTrichNote] = useState('');
  const { checked, toggle } = useChecklist(selectedPlantId);

  if (grows.isLoading) return <div className="content muted">Loading…</div>;
  if (grows.error) return <div className="content error-state">Couldn't load your grows. Retry in a moment.</div>;
  if (!grow) {
    return <div className="content"><div className="card empty"><h4>No grow yet</h4><p>Set up your grow and add a plant to plan a harvest.</p></div></div>;
  }

  const entries = journal.data ?? [];
  const loading = plants.isLoading || journal.isLoading;
  const weatherRisks: HarvestWeatherRisk[] = wx.risks.map((r) => ({ title: r.title, level: r.level, advice: r.advice }));

  async function logTrichome() {
    if (!stage || !plant) return;
    try {
      await createEntry.mutateAsync({
        grow_id: grow!.id,
        plant_id: plant.id,
        tags: [TRICHOME_TAG, stage],
        notes: trichNote.trim() || null,
      });
      setStage('');
      setTrichNote('');
    } catch {
      alert('Could not log the trichome check. Try again.');
    }
  }

  const est = plant ? estimateHarvest({ grow, plant, entries, weatherRisks, now: new Date() }) : null;
  const lastCheck = plant ? latestTrichomeCheck(entries, plant.id) : null;

  return (
    <div className="content" style={{ maxWidth: 900 }}>
      <div className="page-head"><h2>Harvest Planner</h2></div>
      <div className="page-sub">A harvest <strong>window</strong>, never a single date. It leans on this plant's own logged flip and trichome checks — not a breeder countdown.</div>

      <label className="field" style={{ maxWidth: 320 }}>
        <span className="lab">Plant</span>
        <select value={selectedPlantId} onChange={(e) => setPlantId(e.target.value)}>
          {activePlants.length === 0 && <option value="">No plants yet</option>}
          {activePlants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>

      {loading && <div className="card empty muted">Loading…</div>}
      {!loading && activePlants.length === 0 && (
        <div className="card empty"><h4>No plants yet</h4><p>Add a plant on the Plants screen to plan its harvest.</p></div>
      )}

      {!loading && plant && est && (
        <>
          {/* Estimate */}
          <div className="card" style={{ padding: 18, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <div className="eyebrow">Estimated harvest window</div>
              <span className={`pill ${CONFIDENCE_PILL[est.confidence]}`}>{est.confidence} confidence</span>
              {est.readyNow && <span className="pill green">In ripe window now</span>}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, margin: '6px 0' }}>
              {d.fmtShort(est.window.from)} – {d.fmtShort(est.window.to)}
            </div>
            <div className="small muted">
              Anchored to {est.anchor === 'trichomes' ? 'your trichome checks' : est.anchor === 'flowering-observed' ? 'your logged flowering flip' : 'a regional heuristic'}. A range, not a promise — confirm on the plant.
            </div>

            {est.cautions.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {est.cautions.map((c, i) => (
                  <div key={i} style={{ borderLeft: `3px solid var(--${c.level === 'red' ? 'red' : 'amber'})`, padding: '4px 0 4px 10px', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>⚠ {c.title} — consider harvesting earlier</div>
                    <div className="small muted">{c.body}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid2" style={{ marginTop: 12 }}>
              <div>
                <div className="eyebrow">What drove this</div>
                <ul className="list" style={{ marginTop: 4 }}>
                  {est.drivers.map((x, i) => <li key={i} className="small" style={{ padding: '2px 0' }}>• {x}</li>)}
                </ul>
              </div>
              <div>
                <div className="eyebrow">What would sharpen it</div>
                {est.missing.length === 0
                  ? <div className="small muted" style={{ marginTop: 4 }}>You've logged the key signals — keep trichome checks current.</div>
                  : <ul className="list" style={{ marginTop: 4 }}>{est.missing.map((x, i) => <li key={i} className="small" style={{ padding: '2px 0' }}>• {x}</li>)}</ul>}
              </div>
            </div>
          </div>

          {/* Trichome logger */}
          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Log a trichome check</div>
            <div className="small muted" style={{ marginBottom: 10 }}>
              Look at the resin heads under a 10–60x loupe. {lastCheck && <>Last check: <strong>{lastCheck.stage}</strong> on {d.fmtShort(lastCheck.date)}.</>}
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {TRICHOME_STAGES.map((s) => (
                <label key={s} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', padding: 8, borderRadius: 8, border: `1px solid ${stage === s ? 'var(--forest)' : 'var(--line)'}` }}>
                  <input type="radio" name="trichome" checked={stage === s} onChange={() => setStage(s)} style={{ marginTop: 3 }} />
                  <span>
                    <span style={{ fontWeight: 600, fontSize: 13.5 }}>{s}</span>
                    <span className="small muted" style={{ display: 'block' }}>{TRICHOME_GUIDE[s]}</span>
                  </span>
                </label>
              ))}
            </div>
            <label className="field" style={{ marginTop: 10 }}>
              <span className="lab">Note (optional)</span>
              <input value={trichNote} onChange={(e) => setTrichNote(e.target.value)} placeholder="e.g. top colas ahead of lower branches" />
            </label>
            <button className="btn primary" onClick={logTrichome} disabled={!stage || createEntry.isPending}>
              {createEntry.isPending ? 'Logging…' : 'Log trichome check'}
            </button>
          </div>

          {/* Checklists */}
          <div className="eyebrow" style={{ marginBottom: 8 }}>Preharvest checklists</div>
          <div className="small muted" style={{ marginBottom: 10 }}>Saved on this device for {plant.name}. A working checklist, not a compliance record.</div>
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))' }}>
            {CHECKLISTS.map((group) => {
              const done = group.items.filter((it) => checked[`${group.title}::${it}`]).length;
              return (
                <div key={group.title} className="card" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{group.title}</div>
                    <span className="pill gray">{done}/{group.items.length}</span>
                  </div>
                  <ul className="list" style={{ marginTop: 8 }}>
                    {group.items.map((it) => {
                      const k = `${group.title}::${it}`;
                      return (
                        <li key={it} style={{ padding: '4px 0' }}>
                          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
                            <input type="checkbox" checked={!!checked[k]} onChange={() => toggle(k)} style={{ marginTop: 3 }} />
                            <span className="small" style={{ textDecoration: checked[k] ? 'line-through' : 'none', color: checked[k] ? 'var(--muted)' : 'inherit' }}>{it}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
