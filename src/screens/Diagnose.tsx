// screens/Diagnose.tsx
// hooks -> pure engine (lib/diagnose) -> render. A grouped, SKIPPABLE
// questionnaire feeds the pure differential engine; results render as ranked
// cards that always show conflicting evidence alongside supporting evidence.
// Optionally attach to a plant and save the session (migration 0002).
//
// The screen carries a persistent disclaimer: this is general horticultural
// guidance, never a guaranteed diagnosis — verify against the physical plant.
import { useMemo, useState } from 'react';
import { useGrows, usePlants, useDiagnoses, useSaveDiagnosis } from '../db/hooks';
import { diagnose, type DiagnoseInput, type Explanation, type Confidence } from '../lib/diagnose';
import * as d from '../lib/derive';

interface Question { key: keyof DiagnoseInput; label: string; options: readonly string[] }
interface Group { title: string; questions: Question[] }

const GROUPS: Group[] = [
  {
    title: 'Where & when',
    questions: [
      { key: 'affectedPart', label: 'Most affected part', options: ['New/upper growth', 'Old/lower growth', 'Whole plant', 'Roots/base'] },
      { key: 'growthAge', label: 'Old vs new growth', options: ['New growth', 'Old growth', 'Both'] },
      { key: 'scope', label: 'One plant or many', options: ['One plant', 'All/most plants'] },
      { key: 'progression', label: 'How fast is it progressing', options: ['Sudden (days)', 'Gradual (weeks)', 'Not spreading', 'Unknown'] },
    ],
  },
  {
    title: 'Leaf appearance',
    questions: [
      { key: 'leafColor', label: 'Leaf color', options: ['Green (normal)', 'Pale/yellow', 'Dark green', 'Purple/red', 'Bronze/brown', 'Mottled/speckled'] },
      { key: 'interveinalChlorosis', label: 'Yellowing between the veins', options: ['Yes', 'No'] },
      { key: 'marginalTipBurn', label: 'Burnt leaf margins/tips', options: ['Yes', 'No'] },
      { key: 'leafCurl', label: 'Leaf curl', options: ['None', 'Curling up', 'Curling down', 'Taco/clawing'] },
      { key: 'spotsLesions', label: 'Spots or lesions', options: ['None', 'White powdery', 'Gray fuzzy', 'Brown spots', 'Yellow spots', 'Black spots'] },
    ],
  },
  {
    title: 'Whole-plant signs',
    questions: [
      { key: 'wilting', label: 'Wilting', options: ['Yes', 'No'] },
      { key: 'stemSymptoms', label: 'Stem symptoms', options: ['None', 'Weak/leggy', 'Discolored', 'Lesions', 'Soft/mushy base'] },
      { key: 'growthRate', label: 'Growth rate', options: ['Normal', 'Slow/stalled', 'Rapid/stretchy'] },
    ],
  },
  {
    title: 'Pests',
    questions: [
      { key: 'pestEvidence', label: 'Pest evidence', options: ['None seen', 'Tiny moving dots', 'Webbing', 'Green/black clusters', 'Chewed holes', 'Silvery stippling', 'Frass/droppings'] },
    ],
  },
  {
    title: 'Recent care & conditions',
    questions: [
      { key: 'recentWeather', label: 'Recent weather', options: ['Normal', 'Hot', 'Cold/frost', 'Windy', 'Heavy rain', 'Hail'] },
      { key: 'recentIrrigation', label: 'Recent watering', options: ['Normal', 'More than usual', 'Less than usual', 'Erratic'] },
      { key: 'recentNutrition', label: 'Recent feeding', options: ['Normal', 'Fed heavy recently', 'Not fed in a while', 'Changed products'] },
      { key: 'rootZone', label: 'Root-zone condition', options: ['Moist/healthy', 'Waterlogged/soggy', 'Bone dry', 'Compacted', 'Foul smell', 'Unknown'] },
      { key: 'ph', label: 'Root-zone pH', options: ['Low (<6)', 'In range (6-7)', 'High (>7)', 'Unknown'] },
      { key: 'ec', label: 'EC / feed strength', options: ['Low', 'In range', 'High', 'Unknown'] },
    ],
  },
];

const CONFIDENCE_PILL: Record<Confidence, string> = { High: 'blue', Moderate: 'amber', Low: 'gray' };

function Disclaimer() {
  return (
    <div className="card" style={{ padding: '10px 14px', marginBottom: 16, borderLeft: '3px solid var(--amber)' }}>
      <div className="small">
        <strong>General horticultural guidance — not a guaranteed diagnosis.</strong> Symptoms overlap between
        causes, so this tool shows several ranked possibilities with the evidence for and against each. Always
        verify against the physical plant before acting, and follow your local law.
      </div>
    </div>
  );
}

function EvidenceList({ title, items, tone }: { title: string; items: string[]; tone?: 'against' | 'do-not' }) {
  if (items.length === 0) return null;
  const color = tone === 'against' ? 'var(--amber)' : tone === 'do-not' ? 'var(--red)' : 'var(--slate)';
  return (
    <div style={{ marginTop: 10 }}>
      <div className="eyebrow" style={{ color }}>{title}</div>
      <ul className="list" style={{ marginTop: 4 }}>
        {items.map((it, i) => <li key={i} className="small" style={{ padding: '2px 0' }}>• {it}</li>)}
      </ul>
    </div>
  );
}

function ResultCard({ r }: { r: Explanation }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{r.label}</div>
        <span className={`pill ${CONFIDENCE_PILL[r.confidence]}`}>{r.confidence} confidence</span>
      </div>
      <EvidenceList title="Evidence for" items={r.evidenceFor} />
      <EvidenceList title="Conflicting evidence" items={r.evidenceAgainst} tone="against" />
      <EvidenceList title="Inspect next" items={r.inspectNext} />
      <EvidenceList title="Safe, reversible actions" items={r.safeActions} />
      <EvidenceList title="Do NOT" items={r.doNot} tone="do-not" />
      <div style={{ marginTop: 10 }}>
        <div className="eyebrow">When to get help</div>
        <div className="small" style={{ marginTop: 4 }}>{r.whenToGetHelp}</div>
      </div>
    </div>
  );
}

export function Diagnose() {
  const grows = useGrows();
  const grow = grows.data?.[0];
  const plants = usePlants(grow?.id);
  const activePlants = useMemo(() => (plants.data ?? []).filter((p) => !p.archived), [plants.data]);

  const [input, setInput] = useState<DiagnoseInput>({});
  const [results, setResults] = useState<Explanation[] | null>(null);
  const [plantId, setPlantId] = useState('');
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  const saveDiagnosis = useSaveDiagnosis();
  const past = useDiagnoses(plantId || undefined);

  function setField(key: keyof DiagnoseInput, value: string) {
    setResults(null);
    setSaved(false);
    setInput((p) => ({ ...p, [key]: value === '' ? undefined : value }) as DiagnoseInput);
  }

  function run() {
    setResults(diagnose(input));
    setSaved(false);
  }
  function reset() {
    setInput({});
    setResults(null);
    setSaved(false);
  }

  async function save() {
    if (!results || results.length === 0) return;
    try {
      await saveDiagnosis.mutateAsync({
        inputs: input,
        results,
        meta: {
          growId: grow?.id ?? null,
          plantId: plantId || null,
          topResult: results[0]?.label ?? null,
          notes: notes.trim() || null,
        },
      });
      setSaved(true);
    } catch {
      alert('Could not save this session. Try again.');
    }
  }

  if (grows.isLoading) return <div className="content muted">Loading…</div>;
  if (grows.error) return <div className="content error-state">Couldn't load your grows. Retry in a moment.</div>;

  return (
    <div className="content" style={{ maxWidth: 900 }}>
      <div className="page-head"><h2>Diagnostics</h2></div>
      <div className="page-sub">Answer what you can — every question is skippable. Thin input means lower confidence, by design.</div>

      <Disclaimer />

      {/* Questionnaire */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        {GROUPS.map((g) => (
          <div key={g.title} style={{ marginBottom: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>{g.title}</div>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
              {g.questions.map((q) => (
                <label key={q.key} className="field" style={{ margin: 0 }}>
                  <span className="lab">{q.label}</span>
                  <select value={(input[q.key] as string) ?? ''} onChange={(e) => setField(q.key, e.target.value)}>
                    <option value="">— skip —</option>
                    {q.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button className="btn primary" onClick={run}>See possible explanations</button>
          <button className="btn ghost" onClick={reset}>Reset</button>
        </div>
      </div>

      {/* Results */}
      {results && (
        <>
          <div className="page-head" style={{ marginTop: 8 }}>
            <h2 style={{ fontSize: 16 }}>Possible explanations</h2>
            <span className="count num">{results.length}</span>
          </div>
          <div className="page-sub">Ranked by how well the evidence fits — not a ranking of certainty. Read the conflicting evidence on each.</div>
          <div style={{ display: 'grid', gap: 14 }}>
            {results.map((r) => <ResultCard key={r.label} r={r} />)}
          </div>

          {/* Attach + save */}
          <div className="card" style={{ padding: 16, marginTop: 16 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Save this session</div>
            {!grow && <div className="small muted" style={{ marginBottom: 8 }}>No active grow — the session will be saved without a plant link.</div>}
            <div className="grid2">
              <label className="field">
                <span className="lab">Attach to plant (optional)</span>
                <select value={plantId} onChange={(e) => setPlantId(e.target.value)} disabled={activePlants.length === 0}>
                  <option value="">Whole grow / unlinked</option>
                  {activePlants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span className="lab">Notes (optional)</span>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything to remember about this check" />
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {saved && <span className="small" style={{ color: 'var(--green)' }}>Saved.</span>}
              <span className="spacer" />
              <button className="btn primary" onClick={save} disabled={saveDiagnosis.isPending || saved}>
                {saveDiagnosis.isPending ? 'Saving…' : saved ? 'Saved' : 'Save session'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Past sessions */}
      <div className="page-head" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16 }}>Past sessions</h2>
        {plantId && <span className="pill gray">this plant</span>}
      </div>
      <div className="card">
        {past.isLoading && <div className="empty muted">Loading…</div>}
        {past.error && <div className="error-state">Couldn't load past sessions.</div>}
        {!past.isLoading && !past.error && (past.data ?? []).length === 0 && (
          <div className="empty"><p>No saved sessions yet.</p></div>
        )}
        {!past.isLoading && !past.error && (past.data ?? []).length > 0 && (
          <ul className="list">
            {(past.data ?? []).map((s) => {
              const plant = activePlants.find((p) => p.id === s.plant_id);
              const count = Array.isArray(s.results) ? s.results.length : 0;
              return (
                <li key={s.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontWeight: 600 }}>{s.top_result ?? 'Session'}</div>
                    <span className="small muted">{d.fmtDateTime(s.created_at)}</span>
                  </div>
                  <div className="small muted">
                    {plant ? plant.name : 'Whole grow'} · {count} possibilit{count === 1 ? 'y' : 'ies'} considered
                    {s.notes ? ` · ${s.notes}` : ''}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
