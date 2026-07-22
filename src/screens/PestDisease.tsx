// screens/PestDisease.tsx
// hooks -> static library (lib/pests) -> render. A searchable/filterable
// pest & disease reference, a profile detail view, a zone-by-zone scouting
// checklist that logs a journal entry, and recent pest history. Identification
// from a description is uncertain — the screen says so, persistently.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGrows, usePlants, useJournal, useCreateEntry } from '../db/hooks';
import {
  PROFILES, PLANT_ZONES, SEVERITY_SCALE, SEVERITY_ORDER, PEAK_SEVERITY,
  type PestProfile, type PestType, type PlantZone, type Severity,
} from '../lib/pests';
import * as d from '../lib/derive';

const SEVERITY_PILL: Record<Severity, string> = {
  'Observation only': 'gray',
  Monitor: 'blue',
  'Intervention may be warranted': 'amber',
  'Serious risk': 'red',
};
const PEST_TAGS = ['Pest found', 'Scouted', 'Damage', 'Sprayed'];

interface ZoneState { inspected: boolean; issue: boolean; note: string }
const emptyZones = (): Record<PlantZone, ZoneState> =>
  Object.fromEntries(PLANT_ZONES.map((z) => [z, { inspected: false, issue: false, note: '' }])) as Record<PlantZone, ZoneState>;

export function PestDisease() {
  const grows = useGrows();
  const grow = grows.data?.[0];
  const plants = usePlants(grow?.id);
  const journal = useJournal(grow?.id);
  const createEntry = useCreateEntry();

  const activePlants = useMemo(() => (plants.data ?? []).filter((p) => !p.archived), [plants.data]);
  const [plantId, setPlantId] = useState('');

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<PestType | ''>('');
  const [zoneFilter, setZoneFilter] = useState<PlantZone | ''>('');
  const [sevFilter, setSevFilter] = useState<Severity | ''>('');
  const [detail, setDetail] = useState<PestProfile | null>(null);

  const [zones, setZones] = useState<Record<PlantZone, ZoneState>>(emptyZones);
  const [sessionSeverity, setSessionSeverity] = useState<Severity | ''>('');

  const entries = journal.data ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PROFILES.filter((p) => {
      if (typeFilter && p.type !== typeFilter) return false;
      if (zoneFilter && !p.typicalLocation.includes(zoneFilter)) return false;
      if (sevFilter && PEAK_SEVERITY[p.id] !== sevFilter) return false;
      if (q && !(`${p.name} ${p.identification}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [query, typeFilter, zoneFilter, sevFilter]);

  const history = useMemo(() => entries
    .filter((e) => (plantId ? e.plant_id === plantId : true))
    .filter((e) => e.tags?.some((t) => PEST_TAGS.includes(t)))
    .slice()
    .sort((a, b) => +new Date(b.occurred_at) - +new Date(a.occurred_at)), [entries, plantId]);

  if (grows.isLoading) return <div className="content muted">Loading…</div>;
  if (grows.error) return <div className="content error-state">Couldn't load your grows. Retry in a moment.</div>;
  if (!grow) {
    return <div className="content"><div className="card empty"><h4>No grow yet</h4><p>Set up your grow to scout and log pests.</p></div></div>;
  }

  function setZone(z: PlantZone, patch: Partial<ZoneState>) {
    setZones((prev) => ({ ...prev, [z]: { ...prev[z], ...patch } }));
  }

  async function logScouting() {
    const inspected = PLANT_ZONES.filter((z) => zones[z].inspected);
    const issues = PLANT_ZONES.filter((z) => zones[z].issue || zones[z].note.trim());
    if (inspected.length === 0 && issues.length === 0 && !sessionSeverity) {
      alert('Mark at least one zone inspected (or a finding) before logging.');
      return;
    }
    const tags = ['Scouted'];
    if (issues.some((z) => zones[z].issue)) tags.push('Pest found');
    const findings = issues.map((z) => `${z}${zones[z].note.trim() ? `: ${zones[z].note.trim()}` : ''}`).join('; ');
    const notes = [
      `Scouting session${sessionSeverity ? ` — severity: ${sessionSeverity}` : ''}.`,
      inspected.length ? `Inspected: ${inspected.join(', ')}.` : 'No zones marked inspected.',
      findings ? `Findings: ${findings}.` : 'No specific findings noted.',
    ].join(' ');
    try {
      await createEntry.mutateAsync({ grow_id: grow!.id, plant_id: plantId || null, tags, notes });
      setZones(emptyZones());
      setSessionSeverity('');
    } catch {
      alert('Could not log the scouting session. Try again.');
    }
  }

  return (
    <div className="content" style={{ maxWidth: 980 }}>
      <div className="page-head"><h2>Pest &amp; Disease Center</h2></div>
      <div className="page-sub">Identification from a description alone is uncertain — confirm visually, ideally with magnification, before acting. Start with the least-aggressive response.</div>

      <label className="field" style={{ maxWidth: 320 }}>
        <span className="lab">Scout / view history for</span>
        <select value={plantId} onChange={(e) => setPlantId(e.target.value)}>
          <option value="">Whole grow</option>
          {activePlants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>

      {/* Library */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="toolbar">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search pests & diseases…" style={{ flex: 1, minWidth: 160, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface)', color: 'var(--ink)' }} />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as PestType | '')}>
            <option value="">All types</option>
            <option value="pest">Pests</option>
            <option value="disease">Diseases</option>
          </select>
          <select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value as PlantZone | '')}>
            <option value="">Any location</option>
            {PLANT_ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
          <select value={sevFilter} onChange={(e) => setSevFilter(e.target.value as Severity | '')}>
            <option value="">Any risk</option>
            {SEVERITY_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {(plants.isLoading || journal.isLoading) && <div className="empty muted">Loading…</div>}
        {filtered.length === 0 ? (
          <div className="empty"><h4>Nothing matches</h4><p>Try clearing the search or filters.</p></div>
        ) : (
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', padding: 16 }}>
            {filtered.map((p) => (
              <div key={p.id} className="card" style={{ padding: 14, cursor: 'pointer' }} onClick={() => setDetail(p)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                  <span className={`pill ${p.type === 'disease' ? 'blue' : 'gray'}`}>{p.type}</span>
                </div>
                <div className="small muted" style={{ margin: '4px 0 8px' }}>{p.identification.slice(0, 110)}…</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className={`pill ${SEVERITY_PILL[PEAK_SEVERITY[p.id]]}`}>Can reach: {PEAK_SEVERITY[p.id]}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scouting checklist */}
      <div className="eyebrow" style={{ marginBottom: 8 }}>Scouting checklist</div>
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div className="small muted" style={{ marginBottom: 10 }}>Walk each zone. Mark what you inspected, flag anything you saw, then pick a severity and log it.</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {PLANT_ZONES.map((z) => (
            <div key={z} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 10 }}>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                <strong style={{ fontSize: 13.5, minWidth: 130 }}>{z}</strong>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }} className="small">
                  <input type="checkbox" checked={zones[z].inspected} onChange={(e) => setZone(z, { inspected: e.target.checked })} /> Inspected
                </label>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }} className="small">
                  <input type="checkbox" checked={zones[z].issue} onChange={(e) => setZone(z, { issue: e.target.checked })} /> Issue seen
                </label>
                <input
                  value={zones[z].note}
                  onChange={(e) => setZone(z, { note: e.target.value })}
                  placeholder="what you saw (optional)"
                  style={{ flex: 1, minWidth: 140, padding: '6px 9px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface)', color: 'var(--ink)', fontSize: 13 }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="grid2" style={{ marginTop: 12 }}>
          <label className="field">
            <span className="lab">Overall severity</span>
            <select value={sessionSeverity} onChange={(e) => setSessionSeverity(e.target.value as Severity | '')}>
              <option value="">— pick one —</option>
              {SEVERITY_SCALE.map((s) => <option key={s.level} value={s.level}>{s.level}</option>)}
            </select>
          </label>
          <div className="field">
            <span className="lab">What that means</span>
            <div className="small muted" style={{ paddingTop: 4 }}>{sessionSeverity ? SEVERITY_SCALE.find((s) => s.level === sessionSeverity)?.meaning : 'Pick a severity to see the plain-English guidance.'}</div>
          </div>
        </div>
        <button className="btn primary" onClick={logScouting} disabled={createEntry.isPending}>
          {createEntry.isPending ? 'Logging…' : 'Log scouting session'}
        </button>
      </div>

      {/* Recent pest history */}
      <div className="eyebrow" style={{ marginBottom: 8 }}>Recent pest & scouting log {plantId ? 'for this plant' : '(whole grow)'}</div>
      <div className="card">
        {history.length === 0 ? (
          <div className="empty"><p>No pest or scouting entries yet. Log a scouting session above to start tracking over time.</p></div>
        ) : (
          <ul className="list">
            {history.slice(0, 20).map((e) => (
              <li key={e.id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {e.tags.filter((t) => PEST_TAGS.includes(t)).map((t) => <span key={t} className={`pill ${t === 'Pest found' ? 'red' : 'gray'}`}>{t}</span>)}
                  </span>
                  <span className="small muted">{d.fmtDateTime(e.occurred_at)}</span>
                </div>
                {e.notes && <div className="small muted" style={{ marginTop: 4 }}>{e.notes}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Detail modal */}
      {detail && (
        <div className="overlay" onClick={() => setDetail(null)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{detail.name}</h3>
              <button className="close" onClick={() => setDetail(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                <span className={`pill ${detail.type === 'disease' ? 'blue' : 'gray'}`}>{detail.type}</span>
                <span className={`pill ${SEVERITY_PILL[PEAK_SEVERITY[detail.id]]}`}>Can reach: {PEAK_SEVERITY[detail.id]}</span>
                {detail.typicalLocation.map((z) => <span key={z} className="pill gray">{z}</span>)}
              </div>
              <Section title="What you actually see">{detail.identification}</Section>
              <ListSection title="Commonly confused with (how to tell them apart)" items={detail.lookAlikes} tone="amber" />
              <Section title="What drives it">{detail.favorableConditions}</Section>
              <ListSection title="How to scout for it" items={detail.scoutingProcedure} />
              <ListSection title="Prevention" items={detail.prevention} />
              <ListSection title="Cultural controls" items={detail.culturalControls} />
              <ListSection title="Mechanical controls" items={detail.mechanicalControls} />
              <ListSection title="Biological options" items={detail.biologicalOptions} />
              <Section title="Re-inspect">{detail.followUpInterval}</Section>
              <div className="card" style={{ padding: '10px 12px', marginTop: 10, borderLeft: '3px solid var(--amber)' }}>
                <div className="small">{detail.productLabelReminder}</div>
              </div>
            </div>
            <div className="modal-foot">
              <span className="small muted" style={{ marginRight: 'auto' }}>Not sure it's this? Work the differential.</span>
              <Link className="btn" to="/diagnose" onClick={() => setDetail(null)}>Run Diagnostics →</Link>
              <button className="btn primary" onClick={() => setDetail(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div className="eyebrow">{title}</div>
      <div className="small" style={{ marginTop: 3 }}>{children}</div>
    </div>
  );
}
function ListSection({ title, items, tone }: { title: string; items: string[]; tone?: 'amber' }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div className="eyebrow" style={{ color: tone === 'amber' ? 'var(--amber)' : undefined }}>{title}</div>
      <ul className="list" style={{ marginTop: 3 }}>
        {items.map((it, i) => <li key={i} className="small" style={{ padding: '2px 0' }}>• {it}</li>)}
      </ul>
    </div>
  );
}
