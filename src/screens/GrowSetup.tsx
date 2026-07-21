// screens/GrowSetup.tsx
// Multi-step wizard -> useCreateGrow / useUpdateGrow. Creates the grow if none
// exists yet, otherwise edits the active one (v1 is single-grow).
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGrows, useCreateGrow, useUpdateGrow } from '../db/hooks';
import type { Grow, GrowInput } from '../db/types';

const STEPS = ['Basics', 'Location', 'Plants', 'Growing', 'Nutrition', 'Review'] as const;

interface Draft {
  name: string; indoor_start: string; outdoor_transplant: string; experience: string;
  location: string; elevation_ft: string; lat: string; lng: string; sun_exposure: string; protection: string;
  plant_count: string; photo_type: '' | 'Photoperiod' | 'Autoflower'; cultivars: string[]; cultivarInput: string;
  container: string; medium: string; irrigation: string;
  nutrition_approach: string; concerns: string;
}

const NIWOT = { lat: '40.1046', lng: '-105.1705' };

function blankDraft(): Draft {
  return {
    name: '', indoor_start: '', outdoor_transplant: '', experience: '',
    location: '', elevation_ft: '', lat: NIWOT.lat, lng: NIWOT.lng, sun_exposure: '', protection: '',
    plant_count: '', photo_type: '', cultivars: [], cultivarInput: '',
    container: '', medium: '', irrigation: '',
    nutrition_approach: '', concerns: '',
  };
}
function draftFromGrow(g: Grow): Draft {
  return {
    name: g.name, indoor_start: g.indoor_start ?? '', outdoor_transplant: g.outdoor_transplant ?? '', experience: g.experience ?? '',
    location: g.location ?? '', elevation_ft: g.elevation_ft != null ? String(g.elevation_ft) : '',
    lat: g.lat != null ? String(g.lat) : NIWOT.lat, lng: g.lng != null ? String(g.lng) : NIWOT.lng,
    sun_exposure: g.sun_exposure ?? '', protection: g.protection ?? '',
    plant_count: g.plant_count != null ? String(g.plant_count) : '', photo_type: g.photo_type ?? '',
    cultivars: g.cultivars ?? [], cultivarInput: '',
    container: g.container ?? '', medium: g.medium ?? '', irrigation: g.irrigation ?? '',
    nutrition_approach: g.nutrition_approach ?? '', concerns: g.concerns ?? '',
  };
}

export function GrowSetup() {
  const navigate = useNavigate();
  const grows = useGrows();
  const grow = grows.data?.[0];
  const createGrow = useCreateGrow();
  const updateGrow = useUpdateGrow();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (grows.isLoading) return <div className="content muted">Loading…</div>;
  if (grows.error) return <div className="content error-state">Couldn't load your grows. Retry in a moment.</div>;
  if (draft === null) { setDraft(grow ? draftFromGrow(grow) : blankDraft()); return null; }

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((s) => (s ? { ...s, [key]: value } : s));
  }
  function addCultivar() {
    const v = draft!.cultivarInput.trim();
    if (!v || draft!.cultivars.includes(v)) return;
    set('cultivars', [...draft!.cultivars, v]);
    set('cultivarInput', '');
  }
  function removeCultivar(c: string) {
    set('cultivars', draft!.cultivars.filter((x) => x !== c));
  }

  function toPatch(): GrowInput {
    const num = (s: string) => (s.trim() ? Number(s) : null);
    const int = (s: string) => (s.trim() ? Math.round(Number(s)) : null);
    return {
      name: draft!.name.trim(),
      indoor_start: draft!.indoor_start || null,
      outdoor_transplant: draft!.outdoor_transplant || null,
      experience: draft!.experience || null,
      location: draft!.location.trim() || null,
      elevation_ft: int(draft!.elevation_ft),
      lat: num(draft!.lat),
      lng: num(draft!.lng),
      sun_exposure: draft!.sun_exposure || null,
      protection: draft!.protection || null,
      plant_count: int(draft!.plant_count),
      photo_type: draft!.photo_type || null,
      cultivars: draft!.cultivars,
      container: draft!.container || null,
      medium: draft!.medium || null,
      irrigation: draft!.irrigation || null,
      nutrition_approach: draft!.nutrition_approach || null,
      concerns: draft!.concerns.trim() || null,
    };
  }

  async function save() {
    if (!draft!.name.trim()) { setError('Grow name is required.'); setStep(0); return; }
    setError(null);
    try {
      if (grow) {
        await updateGrow.mutateAsync({ id: grow.id, patch: toPatch() });
      } else {
        await createGrow.mutateAsync(toPatch());
      }
      navigate('/my-grow');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save this grow.');
    }
  }

  const busy = createGrow.isPending || updateGrow.isPending;
  const d = draft;

  return (
    <div className="content" style={{ maxWidth: 640 }}>
      <div className="page-head"><h2>{grow ? 'Edit grow' : 'Set up your grow'}</h2></div>
      <div className="page-sub">Step {step + 1} of {STEPS.length} — {STEPS[step]}</div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(i)}
            className="pill"
            style={{
              flex: 1, textAlign: 'center', cursor: 'pointer', border: 'none',
              background: i <= step ? 'var(--forest)' : 'var(--gray-bg)',
              color: i <= step ? '#fff' : 'var(--muted)',
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 20 }}>
        {step === 0 && (
          <>
            <label className="field"><span className="lab req">Grow name</span>
              <input value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. 2026 backyard grow" />
            </label>
            <div className="grid2">
              <label className="field"><span className="lab">Indoor start</span>
                <input type="date" value={d.indoor_start} onChange={(e) => set('indoor_start', e.target.value)} />
              </label>
              <label className="field"><span className="lab">Outdoor transplant</span>
                <input type="date" value={d.outdoor_transplant} onChange={(e) => set('outdoor_transplant', e.target.value)} />
              </label>
            </div>
            <label className="field"><span className="lab">Experience</span>
              <select value={d.experience} onChange={(e) => set('experience', e.target.value)}>
                <option value="">Unset</option>
                <option>New</option>
                <option>Some seasons</option>
                <option>Experienced</option>
              </select>
            </label>
          </>
        )}

        {step === 1 && (
          <>
            <label className="field"><span className="lab">Location</span>
              <input value={d.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Niwot, CO" />
            </label>
            <div className="grid2">
              <label className="field"><span className="lab">Elevation (ft)</span>
                <input inputMode="numeric" value={d.elevation_ft} onChange={(e) => set('elevation_ft', e.target.value)} />
              </label>
              <label className="field"><span className="lab">Sun exposure</span>
                <select value={d.sun_exposure} onChange={(e) => set('sun_exposure', e.target.value)}>
                  <option value="">Unset</option>
                  <option>Full sun</option>
                  <option>Partial</option>
                  <option>Mostly shade</option>
                </select>
              </label>
            </div>
            <div className="grid2">
              <label className="field"><span className="lab">Latitude</span>
                <input inputMode="decimal" value={d.lat} onChange={(e) => set('lat', e.target.value)} />
              </label>
              <label className="field"><span className="lab">Longitude</span>
                <input inputMode="decimal" value={d.lng} onChange={(e) => set('lng', e.target.value)} />
              </label>
            </div>
            <div className="small muted" style={{ marginTop: -8, marginBottom: 12 }}>Defaults to Niwot, CO — edit to match your site.</div>
            <label className="field"><span className="lab">Protection</span>
              <select value={d.protection} onChange={(e) => set('protection', e.target.value)}>
                <option value="">Unset</option>
                <option>None</option>
                <option>Windbreak</option>
                <option>Greenhouse-assisted</option>
                <option>Hoop house</option>
              </select>
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <div className="grid2">
              <label className="field"><span className="lab">Plant count</span>
                <input inputMode="numeric" value={d.plant_count} onChange={(e) => set('plant_count', e.target.value)} />
              </label>
              <label className="field"><span className="lab">Photoperiod / Autoflower</span>
                <select value={d.photo_type} onChange={(e) => set('photo_type', e.target.value as Draft['photo_type'])}>
                  <option value="">Unset</option>
                  <option value="Photoperiod">Photoperiod</option>
                  <option value="Autoflower">Autoflower</option>
                </select>
              </label>
            </div>
            <label className="field"><span className="lab">Cultivars</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={d.cultivarInput}
                  onChange={(e) => set('cultivarInput', e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCultivar(); } }}
                  placeholder="Type a cultivar and press Enter"
                />
                <button type="button" className="btn sm" onClick={addCultivar}>Add</button>
              </div>
            </label>
            {d.cultivars.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {d.cultivars.map((c) => (
                  <span key={c} className="tag on" onClick={() => removeCultivar(c)} title="Remove">{c} ×</span>
                ))}
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <label className="field"><span className="lab">Container</span>
              <select value={d.container} onChange={(e) => set('container', e.target.value)}>
                <option value="">Unset</option>
                <option>In-ground</option>
                <option>Fabric pot</option>
                <option>Plastic container</option>
                <option>Raised bed</option>
              </select>
            </label>
            <label className="field"><span className="lab">Medium</span>
              <select value={d.medium} onChange={(e) => set('medium', e.target.value)}>
                <option value="">Unset</option>
                <option>Native soil</option>
                <option>Amended soil</option>
                <option>Soilless mix</option>
                <option>Coco</option>
              </select>
            </label>
            <label className="field"><span className="lab">Irrigation</span>
              <select value={d.irrigation} onChange={(e) => set('irrigation', e.target.value)}>
                <option value="">Unset</option>
                <option>Hand watering</option>
                <option>Drip</option>
                <option>Soaker hose</option>
                <option>None yet</option>
              </select>
            </label>
          </>
        )}

        {step === 4 && (
          <>
            <label className="field"><span className="lab">Nutrition approach</span>
              <select value={d.nutrition_approach} onChange={(e) => set('nutrition_approach', e.target.value)}>
                <option value="">Unset</option>
                <option>Organic</option>
                <option>Synthetic</option>
                <option>Mixed</option>
                <option>Undecided</option>
              </select>
            </label>
            <label className="field"><span className="lab">Concerns</span>
              <textarea value={d.concerns} onChange={(e) => set('concerns', e.target.value)} placeholder="What are you worried about this season?" />
            </label>
          </>
        )}

        {step === 5 && (
          <div className="small">
            <ReviewRow label="Name" value={d.name} />
            <ReviewRow label="Indoor start" value={d.indoor_start} />
            <ReviewRow label="Outdoor transplant" value={d.outdoor_transplant} />
            <ReviewRow label="Experience" value={d.experience} />
            <ReviewRow label="Location" value={d.location} />
            <ReviewRow label="Elevation" value={d.elevation_ft ? `${d.elevation_ft} ft` : ''} />
            <ReviewRow label="Coordinates" value={`${d.lat}, ${d.lng}`} />
            <ReviewRow label="Sun exposure" value={d.sun_exposure} />
            <ReviewRow label="Protection" value={d.protection} />
            <ReviewRow label="Plant count" value={d.plant_count} />
            <ReviewRow label="Type" value={d.photo_type} />
            <ReviewRow label="Cultivars" value={d.cultivars.join(', ')} />
            <ReviewRow label="Container" value={d.container} />
            <ReviewRow label="Medium" value={d.medium} />
            <ReviewRow label="Irrigation" value={d.irrigation} />
            <ReviewRow label="Nutrition approach" value={d.nutrition_approach} />
            <ReviewRow label="Concerns" value={d.concerns} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
        {step > 0 && <button className="btn" onClick={() => setStep((s) => s - 1)}>Back</button>}
        {error && <span className="small" style={{ color: 'var(--red)' }}>{error}</span>}
        <span className="spacer" />
        {step < STEPS.length - 1 && <button className="btn primary" onClick={() => setStep((s) => s + 1)}>Next</button>}
        {step === STEPS.length - 1 && (
          <button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save grow'}</button>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
      <span className="muted">{label}</span>
      <span>{value || '—'}</span>
    </div>
  );
}
