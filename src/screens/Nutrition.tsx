// screens/Nutrition.tsx
// hooks -> pure logic (lib/nutrition) -> render. A mix calculator, an
// application logger, feed-advisability cautions, and history — the app stores
// what the user reports and does the arithmetic, but never supplies product
// data, schedules, or a "your plant needs X". Nutrient decisions defer to
// root-zone verification; symptoms overlap with pH lockout / overwatering /
// senescence, so the screen cross-links to Diagnostics.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGrows, usePlants, useJournal, useCreateEntry } from '../db/hooks';
import { useWeather } from '../weather/useWeather';
import { Sparkline } from '../components/Sparkline';
import {
  mixSolution, applicationHistory, overlapWarnings, feedAdvisability, fmtMeasure,
  type VolumeUnit, type RateUnit,
} from '../lib/nutrition';
import * as d from '../lib/derive';

const PROGRAMS = ['Organic', 'Bottled synthetic', 'Hybrid', 'Custom'] as const;
const RATE_UNITS: RateUnit[] = ['ml/L', 'ml/gal', 'tsp/gal', 'tbsp/gal', 'oz/gal'];
const VOLUME_UNITS: VolumeUnit[] = ['L', 'gal', 'ml', 'oz'];

const CAUTION_COLOR = { red: 'var(--red)', amber: 'var(--amber)', info: 'var(--forest-300)' } as const;

export function Nutrition() {
  const grows = useGrows();
  const grow = grows.data?.[0];
  const plants = usePlants(grow?.id);
  const journal = useJournal(grow?.id);
  const createEntry = useCreateEntry();
  const wx = useWeather(grow?.lat, grow?.lng);

  const activePlants = useMemo(() => (plants.data ?? []).filter((p) => !p.archived), [plants.data]);
  const [plantId, setPlantId] = useState('');
  const [program, setProgram] = useState<typeof PROGRAMS[number] | ''>('');

  // mix calculator
  const [productRate, setProductRate] = useState('2');
  const [rateUnit, setRateUnit] = useState<RateUnit>('ml/L');
  const [solutionVolume, setSolutionVolume] = useState('5');
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>('L');

  // log form
  const [nutrients, setNutrients] = useState('');
  const [ph, setPh] = useState('');
  const [ec, setEc] = useState('');
  const [waterGal, setWaterGal] = useState('');

  const entries = journal.data ?? [];

  const mix = useMemo(() => mixSolution({
    productRate: Number(productRate) || 0, rateUnit,
    solutionVolume: Number(solutionVolume) || 0, volumeUnit,
  }), [productRate, rateUnit, solutionVolume, volumeUnit]);

  const history = useMemo(() => applicationHistory(entries, plantId ? { plantId } : undefined), [entries, plantId]);

  const overlaps = useMemo(
    () => overlapWarnings(history.feeds.filter((f) => f.nutrients).slice(0, 12).map((f) => ({ name: f.nutrients ?? '', npk: f.nutrients ?? '' }))),
    [history.feeds],
  );

  const advis = useMemo(() => {
    const plant = activePlants.find((p) => p.id === plantId);
    const plantEntries = entries.filter((e) => e.plant_id === plantId).sort((a, b) => +new Date(b.occurred_at) - +new Date(a.occurred_at));
    const latest = plantEntries[0];
    const activeRisks = wx.risks.filter((r) => r.level !== 'ok').map((r) => r.title).join(', ');
    const symptoms = latest?.symptoms ?? '';
    return feedAdvisability({
      plantHealth: plant?.health ?? null,
      recentWeather: activeRisks,
      rootZone: latest?.soil_moisture ?? '',
      symptoms,
      wilting: /wilt/i.test(symptoms),
    });
  }, [activePlants, plantId, entries, wx.risks]);

  if (grows.isLoading) return <div className="content muted">Loading…</div>;
  if (grows.error) return <div className="content error-state">Couldn't load your grows. Retry in a moment.</div>;
  if (!grow) {
    return <div className="content"><div className="card empty"><h4>No grow yet</h4><p>Set up your grow to plan feeding.</p></div></div>;
  }

  async function logApplication() {
    if (!nutrients.trim() && !ph.trim() && !ec.trim()) { alert('Add at least a product/NPK, pH, or EC to log.'); return; }
    try {
      await createEntry.mutateAsync({
        grow_id: grow!.id,
        plant_id: plantId || null,
        tags: ['Fed'],
        nutrients: nutrients.trim() || null,
        ph: ph.trim() ? Number(ph) : null,
        ec: ec.trim() ? Number(ec) : null,
        water_vol_gal: waterGal.trim() ? Number(waterGal) : null,
      });
      setNutrients(''); setPh(''); setEc(''); setWaterGal('');
    } catch {
      alert('Could not log the application. Try again.');
    }
  }

  return (
    <div className="content" style={{ maxWidth: 940 }}>
      <div className="page-head"><h2>Nutrition Manager</h2></div>
      <div className="page-sub">This does the mixing arithmetic and tracks what you log. It never supplies product data, a schedule, or a "your plant needs X". Verify root-zone pH/EC and condition before feeding.</div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 4 }}>
        <label className="field" style={{ maxWidth: 280, margin: 0 }}>
          <span className="lab">Log / view for</span>
          <select value={plantId} onChange={(e) => setPlantId(e.target.value)}>
            <option value="">Whole grow</option>
            {activePlants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="field" style={{ maxWidth: 240, margin: 0 }}>
          <span className="lab">Program type (informational)</span>
          <select value={program} onChange={(e) => setProgram(e.target.value as typeof PROGRAMS[number] | '')}>
            <option value="">Unset</option>
            {PROGRAMS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
      </div>
      {program && <div className="small muted" style={{ marginBottom: 16 }}>Framing only — this tool does not provide a {program.toLowerCase()} schedule or product list. Follow your products' labels.</div>}

      {/* Advisability */}
      <div className="eyebrow" style={{ marginBottom: 8 }}>Before you feed {plantId ? '(this plant)' : '(pick a plant for a sharper read)'}</div>
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        {advis.cautions.map((c, i) => (
          <div key={i} style={{ borderLeft: `3px solid ${CAUTION_COLOR[c.level]}`, padding: '4px 0 4px 10px', marginBottom: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 13.5, color: c.level === 'info' ? 'inherit' : CAUTION_COLOR[c.level] }}>{c.title}</div>
            <div className="small muted">{c.body}</div>
          </div>
        ))}
        <div className="small" style={{ marginTop: 4 }}>{advis.reminder}</div>
      </div>

      {/* Mix calculator */}
      <div className="eyebrow" style={{ marginBottom: 8 }}>Mix calculator</div>
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))' }}>
          <label className="field" style={{ margin: 0 }}><span className="lab">Product rate</span>
            <input inputMode="decimal" value={productRate} onChange={(e) => setProductRate(e.target.value)} /></label>
          <label className="field" style={{ margin: 0 }}><span className="lab">Rate unit</span>
            <select value={rateUnit} onChange={(e) => setRateUnit(e.target.value as RateUnit)}>{RATE_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</select></label>
          <label className="field" style={{ margin: 0 }}><span className="lab">Solution volume</span>
            <input inputMode="decimal" value={solutionVolume} onChange={(e) => setSolutionVolume(e.target.value)} /></label>
          <label className="field" style={{ margin: 0 }}><span className="lab">Volume unit</span>
            <select value={volumeUnit} onChange={(e) => setVolumeUnit(e.target.value as VolumeUnit)}>{VOLUME_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</select></label>
        </div>

        <div className="grid2" style={{ marginTop: 14 }}>
          <div className="card" style={{ padding: 12 }}>
            <div className="eyebrow">{mix.labels.concentrate}</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{fmtMeasure(mix.productToAdd)}</div>
            <div className="small muted">at {mix.ratePerUnit}</div>
          </div>
          <div className="card" style={{ padding: 12 }}>
            <div className="eyebrow">{mix.labels.finalSolution}</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{fmtMeasure(mix.finalSolutionVolume)}</div>
            <div className="small muted">add the concentrate to reach this volume</div>
          </div>
        </div>
        {mix.warnings.map((w, i) => (
          <div key={i} className="small" style={{ color: 'var(--amber)', marginTop: 8 }}>⚠ {w}</div>
        ))}
        <ul className="list" style={{ marginTop: 8 }}>
          {mix.assumptions.map((a, i) => <li key={i} className="small muted" style={{ padding: '2px 0' }}>• {a}</li>)}
        </ul>
      </div>

      {/* Log application */}
      <div className="eyebrow" style={{ marginBottom: 8 }}>Log application</div>
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <label className="field"><span className="lab">Product &amp; N-P-K (as you read it off the label)</span>
          <input value={nutrients} onChange={(e) => setNutrients(e.target.value)} placeholder="e.g. Grow 5-1-1, 2 ml/L" /></label>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))' }}>
          <label className="field" style={{ margin: 0 }}><span className="lab">pH</span><input inputMode="decimal" value={ph} onChange={(e) => setPh(e.target.value)} /></label>
          <label className="field" style={{ margin: 0 }}><span className="lab">EC</span><input inputMode="decimal" value={ec} onChange={(e) => setEc(e.target.value)} /></label>
          <label className="field" style={{ margin: 0 }}><span className="lab">Water (gal)</span><input inputMode="decimal" value={waterGal} onChange={(e) => setWaterGal(e.target.value)} /></label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="small muted">Stored exactly as you type it — the app doesn't supply product data.</span>
          <span className="spacer" />
          <button className="btn primary" onClick={logApplication} disabled={createEntry.isPending}>{createEntry.isPending ? 'Logging…' : 'Log application'}</button>
        </div>
      </div>

      {overlaps.length > 0 && (
        <div className="card" style={{ padding: '10px 14px', marginBottom: 16, borderLeft: '3px solid var(--amber)' }}>
          <div className="eyebrow" style={{ color: 'var(--amber)' }}>Possible overlap in your logged inputs</div>
          <ul className="list" style={{ marginTop: 4 }}>{overlaps.map((w, i) => <li key={i} className="small" style={{ padding: '2px 0' }}>• {w}</li>)}</ul>
        </div>
      )}

      {/* History */}
      <div className="grid2" style={{ marginBottom: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="eyebrow">pH over time</div>
          <Sparkline points={history.phSeries} />
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div className="eyebrow">EC over time</div>
          <Sparkline points={history.ecSeries} />
        </div>
      </div>

      <div className="eyebrow" style={{ marginBottom: 8 }}>Application history {plantId ? '(this plant)' : '(whole grow)'}</div>
      <div className="card" style={{ marginBottom: 16 }}>
        {history.feeds.length === 0 ? (
          <div className="empty"><p>No feeds logged yet. Use “Log application” above.</p></div>
        ) : (
          <ul className="list">
            {history.feeds.slice(0, 20).map((f) => (
              <li key={f.id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{f.nutrients || 'Feed'}</span>
                  <span className="small muted">{d.fmtDateTime(f.occurredAt)}</span>
                </div>
                <div className="small muted">
                  {[f.ph != null ? `pH ${f.ph}` : null, f.ec != null ? `EC ${f.ec}` : null, f.waterVolGal != null ? `${f.waterVolGal} gal` : null].filter(Boolean).join(' · ') || '—'}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card" style={{ padding: '12px 14px', borderLeft: '3px solid var(--forest-300)' }}>
        <div className="small">
          Nutrient decisions need root-zone verification. Yellowing and "deficiency" looks overlap heavily with <strong>pH lockout</strong>, <strong>overwatering</strong>, and <strong>natural senescence</strong> — feeding the wrong cause makes it worse.{' '}
          <Link to="/diagnose">Work the differential in Diagnostics →</Link>
        </div>
      </div>
    </div>
  );
}
