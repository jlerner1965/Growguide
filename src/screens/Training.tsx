// screens/Training.tsx
// hooks -> pure logic (lib/training, lib/trellis, lib/derive) -> render.
// Technique library (searchable/filterable, stage-aware cautions), one-tap
// logging into the journal, an ephemeral trellis planner, and a short history
// of logged training for the selected plant.
import { useMemo, useState } from 'react';
import { useGrows, usePlants, useJournal, useCreateEntry } from '../db/hooks';
import { TECHNIQUES, TRAINING_TAGS, type TechniqueCard } from '../lib/training';
import { planTrellis, type TrellisInput } from '../lib/trellis';
import * as d from '../lib/derive';
import type { Stage } from '../db/types';

function stageCaution(card: TechniqueCard, current: Stage | null): { level: 'red' | 'amber'; text: string } | null {
  if (!current) return null;
  if (card.stages.includes(current)) return null;
  const flowering = current === 'Flowering' || current === 'Late flower' || current === 'Harvest';
  if (card.highStress && flowering) {
    return { level: 'red', text: `High-stress technique during ${current}. This can cost finished flower and stress the plant — most growers avoid it now.` };
  }
  return { level: 'amber', text: `Not typically appropriate during ${current} (suited to: ${card.stages.join(', ')}). Treat as a caution, not a rule.` };
}

function Card({ card, current, onLog, logging }: {
  card: TechniqueCard; current: Stage | null; onLog: (c: TechniqueCard) => void; logging: boolean;
}) {
  const [open, setOpen] = useState(false);
  const caution = stageCaution(card, current);
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{card.name}</div>
        {card.highStress && <span className="pill amber">High-stress</span>}
      </div>
      <div className="small muted" style={{ margin: '4px 0 8px' }}>{card.purpose}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {card.stages.map((s) => (
          <span key={s} className={`pill ${current === s ? 'green' : 'gray'}`}>{s}</span>
        ))}
      </div>
      {caution && (
        <div style={{ borderLeft: `3px solid var(--${caution.level === 'red' ? 'red' : 'amber'})`, padding: '4px 0 4px 10px', marginBottom: 8 }}>
          <div className="small" style={{ color: `var(--${caution.level === 'red' ? 'red' : 'amber'})`, fontWeight: 600 }}>⚠ {caution.text}</div>
        </div>
      )}

      {open && (
        <div style={{ marginTop: 8 }}>
          <Field label="Benefits" items={card.benefits} />
          <Field label="Risks" items={card.risks} tone="amber" />
          <Field label="When to avoid it" items={card.avoidWhen} tone="red" />
          <Line label="Typical recovery" value={card.recoveryTime} />
          <Line label="Weather" value={card.weather} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button className="btn sm" onClick={() => setOpen((o) => !o)}>{open ? 'Less' : 'Details'}</button>
        <button className="btn primary sm" onClick={() => onLog(card)} disabled={logging}>Log this technique</button>
      </div>
    </div>
  );
}

function Field({ label, items, tone }: { label: string; items: string[]; tone?: 'amber' | 'red' }) {
  const color = tone === 'amber' ? 'var(--amber)' : tone === 'red' ? 'var(--red)' : 'var(--slate)';
  return (
    <div style={{ marginTop: 8 }}>
      <div className="eyebrow" style={{ color }}>{label}</div>
      <ul className="list" style={{ marginTop: 4 }}>
        {items.map((it, i) => <li key={i} className="small" style={{ padding: '2px 0' }}>• {it}</li>)}
      </ul>
    </div>
  );
}
function Line({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginTop: 8 }}>
      <div className="eyebrow">{label}</div>
      <div className="small" style={{ marginTop: 2 }}>{value}</div>
    </div>
  );
}

const DEFAULT_TRELLIS: TrellisInput = {
  plantCount: 3, plantHeightCm: 120, plantWidthCm: 60, expectedExpansionPct: 50,
  postSpacingCm: 120, availablePostHeightCm: 180, netWidthCm: 120, netHeightCm: 150, rowLengthCm: 300,
};

export function Training() {
  const grows = useGrows();
  const grow = grows.data?.[0];
  const plants = usePlants(grow?.id);
  const journal = useJournal(grow?.id);
  const createEntry = useCreateEntry();

  const activePlants = useMemo(() => (plants.data ?? []).filter((p) => !p.archived), [plants.data]);
  const [plantId, setPlantId] = useState('');
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<Stage | ''>('');
  const [trellis, setTrellis] = useState<TrellisInput>(() => ({ ...DEFAULT_TRELLIS, plantCount: 3 }));

  const entries = journal.data ?? [];
  const currentStage = grow ? d.estimateStage(grow, entries).stage : null;
  const plan = useMemo(() => planTrellis(trellis), [trellis]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TECHNIQUES.filter((t) => {
      if (stageFilter && !t.stages.includes(stageFilter)) return false;
      if (q && !(`${t.name} ${t.purpose}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [query, stageFilter]);

  const history = useMemo(() => {
    return entries
      .filter((e) => (plantId ? e.plant_id === plantId : true))
      .filter((e) => e.tags?.some((t) => TRAINING_TAGS.includes(t)))
      .slice()
      .sort((a, b) => +new Date(b.occurred_at) - +new Date(a.occurred_at));
  }, [entries, plantId]);

  if (grows.isLoading) return <div className="content muted">Loading…</div>;
  if (grows.error) return <div className="content error-state">Couldn't load your grows. Retry in a moment.</div>;
  if (!grow) {
    return <div className="content"><div className="card empty"><h4>No grow yet</h4><p>Set up your grow to use training tools.</p></div></div>;
  }

  async function log(card: TechniqueCard) {
    try {
      await createEntry.mutateAsync({
        grow_id: grow!.id,
        plant_id: plantId || null,
        tags: card.journalTags,
        notes: card.name,
      });
    } catch {
      alert('Could not log this technique. Try again.');
    }
  }

  return (
    <div className="content" style={{ maxWidth: 980 }}>
      <div className="page-head">
        <h2>Training &amp; Structural Support</h2>
        {currentStage && <span className="pill blue">Current stage: {currentStage}</span>}
      </div>
      <div className="page-sub">Techniques are flagged against your grow's current stage — a caution, not a hard block. Log what you do so it shows up in the plant's history.</div>

      <label className="field" style={{ maxWidth: 320 }}>
        <span className="lab">Log / view history for</span>
        <select value={plantId} onChange={(e) => setPlantId(e.target.value)}>
          <option value="">Whole grow</option>
          {activePlants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>

      {/* Library */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="toolbar">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search techniques…" style={{ flex: 1, minWidth: 160, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface)', color: 'var(--ink)' }} />
          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value as Stage | '')}>
            <option value="">All stages</option>
            {d.STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {(plants.isLoading || journal.isLoading) && <div className="empty muted">Loading…</div>}
        {filtered.length === 0 ? (
          <div className="empty"><h4>No techniques match</h4><p>Try clearing the search or stage filter.</p></div>
        ) : (
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', padding: 16 }}>
            {filtered.map((card) => (
              <Card key={card.id} card={card} current={currentStage} onLog={log} logging={createEntry.isPending} />
            ))}
          </div>
        )}
      </div>

      {/* Trellis planner */}
      <div className="eyebrow" style={{ marginBottom: 8 }}>Trellis / structural planner</div>
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
          <TrellisNum label="Plants in the row" v={trellis.plantCount} on={(n) => setTrellis((s) => ({ ...s, plantCount: n }))} />
          <TrellisNum label="Plant height (cm)" v={trellis.plantHeightCm} on={(n) => setTrellis((s) => ({ ...s, plantHeightCm: n }))} />
          <TrellisNum label="Plant width (cm)" v={trellis.plantWidthCm} on={(n) => setTrellis((s) => ({ ...s, plantWidthCm: n }))} />
          <TrellisNum label="Expected expansion (%)" v={trellis.expectedExpansionPct} on={(n) => setTrellis((s) => ({ ...s, expectedExpansionPct: n }))} />
          <TrellisNum label="Post spacing (cm)" v={trellis.postSpacingCm} on={(n) => setTrellis((s) => ({ ...s, postSpacingCm: n }))} />
          <TrellisNum label="Usable post height (cm)" v={trellis.availablePostHeightCm} on={(n) => setTrellis((s) => ({ ...s, availablePostHeightCm: n }))} />
          <TrellisNum label="Net panel width (cm)" v={trellis.netWidthCm} on={(n) => setTrellis((s) => ({ ...s, netWidthCm: n }))} />
          <TrellisNum label="Net panel height (cm)" v={trellis.netHeightCm} on={(n) => setTrellis((s) => ({ ...s, netHeightCm: n }))} />
          <TrellisNum label="Row length (cm)" v={trellis.rowLengthCm} on={(n) => setTrellis((s) => ({ ...s, rowLengthCm: n }))} />
        </div>

        <div className="grid2" style={{ marginTop: 16 }}>
          <div>
            <div className="eyebrow">Layout</div>
            <ul className="list" style={{ marginTop: 4 }}>
              <li className="small" style={{ padding: '2px 0' }}>• Total run: <strong>{plan.layout.totalRowLengthCm} cm</strong> ({(plan.layout.totalRowLengthCm / 100).toFixed(1)} m)</li>
              <li className="small" style={{ padding: '2px 0' }}>• Posts: <strong>{plan.layout.postCount}</strong> at ~{plan.layout.postSpacingCm} cm spacing</li>
              <li className="small" style={{ padding: '2px 0' }}>• Net panels: <strong>{plan.layout.netPanelCount}</strong> (one horizontal layer)</li>
              <li className="small" style={{ padding: '2px 0' }}>• Suggested net height off ground: <strong>{plan.layout.recommendedNetHeightOffGroundCm} cm</strong></li>
              <li className="small" style={{ padding: '2px 0' }}>• Future canopy per plant: {plan.layout.futureCanopyWidthCm} cm wide × {plan.layout.futureCanopyHeightCm} cm tall</li>
            </ul>
          </div>
          <div>
            <div className="eyebrow">Materials</div>
            <table style={{ marginTop: 4 }}>
              <tbody>
                {plan.materials.map((m) => (
                  <tr key={m.item}>
                    <td className="small">{m.item}{m.note ? <div className="small muted">{m.note}</div> : null}</td>
                    <td className="small num" style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600 }}>{m.quantity} {m.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div className="eyebrow">Assumptions</div>
          <ul className="list" style={{ marginTop: 4 }}>
            {plan.assumptions.map((a, i) => <li key={i} className="small muted" style={{ padding: '2px 0' }}>• {a}</li>)}
          </ul>
        </div>
        <div className="card" style={{ padding: '10px 14px', marginTop: 12, borderLeft: '3px solid var(--amber)' }}>
          <div className="eyebrow" style={{ color: 'var(--amber)' }}>Planning guidance, not an engineering certification</div>
          <ul className="list" style={{ marginTop: 4 }}>
            {plan.caveats.map((c, i) => <li key={i} className="small" style={{ padding: '2px 0' }}>• {c}</li>)}
          </ul>
        </div>
      </div>

      {/* History */}
      <div className="eyebrow" style={{ marginBottom: 8 }}>Logged training {plantId ? 'for this plant' : '(whole grow)'}</div>
      <div className="card">
        {history.length === 0 ? (
          <div className="empty"><p>No training logged yet. Use “Log this technique” on a card above.</p></div>
        ) : (
          <ul className="list">
            {history.slice(0, 20).map((e) => (
              <li key={e.id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{e.notes || e.tags.filter((t) => TRAINING_TAGS.includes(t)).join(', ')}</span>
                  <span className="small muted">{d.fmtDateTime(e.occurred_at)}</span>
                </div>
                <div className="small muted">{e.tags.join(' · ')}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TrellisNum({ label, v, on }: { label: string; v: number; on: (n: number) => void }) {
  return (
    <label className="field" style={{ margin: 0 }}>
      <span className="lab">{label}</span>
      <input inputMode="numeric" value={String(v)} onChange={(e) => on(e.target.value === '' ? 0 : Number(e.target.value))} />
    </label>
  );
}
