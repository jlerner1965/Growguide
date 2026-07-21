// screens/Journal.tsx
// hooks -> derive -> render, following screens/Dashboard.tsx. Fast mobile-first
// logging: pick a plant (or "whole grow"), tap tags, fill in whatever quick
// fields apply, save. Filter the list by plant and tag.
import { useState } from 'react';
import { useGrows, usePlants, useJournal, useCreateEntry, useDeleteEntry, useProfile } from '../db/hooks';
import * as d from '../lib/derive';
import type { JournalInput } from '../db/types';

const TAGS = [
  'Watered', 'Fed', 'Pruned', 'Topped', 'Trained', 'Sprayed',
  'Pest found', 'Damage', 'Flowering observed', 'Photograph', 'Harvest activity',
];

interface DraftState {
  plantId: string;
  occurredAt: string;
  tags: string[];
  waterVolGal: string;
  height: string;
  nutrients: string;
  ph: string;
  ec: string;
  tempF: string;
  rhPct: string;
  symptoms: string;
  notes: string;
}

const EMPTY_DRAFT: DraftState = {
  plantId: '', occurredAt: '', tags: [], waterVolGal: '', height: '',
  nutrients: '', ph: '', ec: '', tempF: '', rhPct: '', symptoms: '', notes: '',
};

export function Journal() {
  const grows = useGrows();
  const grow = grows.data?.[0];
  const profile = useProfile();
  const plants = usePlants(grow?.id);
  const [filterPlantId, setFilterPlantId] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const journal = useJournal(grow?.id, { plantId: filterPlantId || undefined, tag: filterTag || undefined });
  const createEntry = useCreateEntry();
  const deleteEntry = useDeleteEntry(grow?.id);
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [formError, setFormError] = useState<string | null>(null);

  if (grows.isLoading) return <div className="content muted">Loading…</div>;
  if (grows.error) return <div className="content error-state">Couldn't load your grows. Retry in a moment.</div>;
  if (!grow) {
    return (
      <div className="content">
        <div className="card empty">
          <h4>No grow yet</h4>
          <p>Set up your first grow before you can log journal entries.</p>
        </div>
      </div>
    );
  }

  const units = profile.data?.units ?? 'imperial';
  const activePlants = (plants.data ?? []).filter((p) => !p.archived);
  const entries = journal.data ?? [];
  const loading = plants.isLoading || journal.isLoading;

  function toggleTag(tag: string) {
    setDraft((s) => ({ ...s, tags: s.tags.includes(tag) ? s.tags.filter((t) => t !== tag) : [...s.tags, tag] }));
  }

  async function saveDraft() {
    setFormError(null);
    const heightNum = draft.height.trim() ? Number(draft.height) : null;
    if (draft.height.trim() && !Number.isFinite(heightNum)) { setFormError('Height must be a number.'); return; }
    const input: JournalInput = {
      grow_id: grow!.id,
      plant_id: draft.plantId || null,
      occurred_at: draft.occurredAt ? new Date(draft.occurredAt).toISOString() : undefined,
      tags: draft.tags,
      water_vol_gal: draft.waterVolGal.trim() ? Number(draft.waterVolGal) : null,
      height_cm: heightNum != null ? d.heightInputToCm(heightNum, units) : null,
      nutrients: draft.nutrients.trim() || null,
      ph: draft.ph.trim() ? Number(draft.ph) : null,
      ec: draft.ec.trim() ? Number(draft.ec) : null,
      temp_f: draft.tempF.trim() ? Number(draft.tempF) : null,
      rh_pct: draft.rhPct.trim() ? Number(draft.rhPct) : null,
      symptoms: draft.symptoms.trim() || null,
      notes: draft.notes.trim() || null,
    };
    try {
      await createEntry.mutateAsync(input);
      setDraft(EMPTY_DRAFT);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not save this entry.');
    }
  }

  async function removeEntry(id: string) {
    if (!confirm('Delete this journal entry? This cannot be undone.')) return;
    try {
      await deleteEntry.mutateAsync(id);
    } catch {
      alert('Could not delete this entry. Try again.');
    }
  }

  return (
    <div className="content">
      <div className="page-head"><h2>Daily Journal</h2><span className="count num">{entries.length}</span></div>
      <div className="page-sub">Log what happened today. Newest entries first — filter by plant or tag below.</div>

      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>New entry</div>

        <label className="field">
          <span className="lab">Plant</span>
          <select value={draft.plantId} onChange={(e) => setDraft((s) => ({ ...s, plantId: e.target.value }))}>
            <option value="">Whole grow</option>
            {activePlants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>

        <div className="field">
          <span className="lab">Tags</span>
          <div className="seg">
            {TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`tag${draft.tags.includes(tag) ? ' on' : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="grid2">
          <label className="field">
            <span className="lab">When</span>
            <input type="datetime-local" value={draft.occurredAt} onChange={(e) => setDraft((s) => ({ ...s, occurredAt: e.target.value }))} placeholder="Now" />
          </label>
          <label className="field">
            <span className="lab">Water (gal)</span>
            <input inputMode="decimal" value={draft.waterVolGal} onChange={(e) => setDraft((s) => ({ ...s, waterVolGal: e.target.value }))} />
          </label>
        </div>
        <div className="grid2">
          <label className="field">
            <span className="lab">Height ({units === 'imperial' ? 'in' : 'cm'})</span>
            <input inputMode="decimal" value={draft.height} onChange={(e) => setDraft((s) => ({ ...s, height: e.target.value }))} />
          </label>
          <label className="field">
            <span className="lab">Nutrients</span>
            <input value={draft.nutrients} onChange={(e) => setDraft((s) => ({ ...s, nutrients: e.target.value }))} placeholder="e.g. Fish emulsion 1x" />
          </label>
        </div>
        <div className="grid2">
          <label className="field">
            <span className="lab">pH</span>
            <input inputMode="decimal" value={draft.ph} onChange={(e) => setDraft((s) => ({ ...s, ph: e.target.value }))} />
          </label>
          <label className="field">
            <span className="lab">EC</span>
            <input inputMode="decimal" value={draft.ec} onChange={(e) => setDraft((s) => ({ ...s, ec: e.target.value }))} />
          </label>
        </div>
        <div className="grid2">
          <label className="field">
            <span className="lab">Temp (°F)</span>
            <input inputMode="decimal" value={draft.tempF} onChange={(e) => setDraft((s) => ({ ...s, tempF: e.target.value }))} />
          </label>
          <label className="field">
            <span className="lab">RH (%)</span>
            <input inputMode="decimal" value={draft.rhPct} onChange={(e) => setDraft((s) => ({ ...s, rhPct: e.target.value }))} />
          </label>
        </div>
        <label className="field">
          <span className="lab">Symptoms</span>
          <textarea value={draft.symptoms} onChange={(e) => setDraft((s) => ({ ...s, symptoms: e.target.value }))} placeholder="Anything unusual — leaf color, curling, spots…" />
        </label>
        <label className="field">
          <span className="lab">Notes</span>
          <textarea value={draft.notes} onChange={(e) => setDraft((s) => ({ ...s, notes: e.target.value }))} />
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {formError && <span className="small" style={{ color: 'var(--red)' }}>{formError}</span>}
          <span className="spacer" />
          <button className="btn primary" onClick={saveDraft} disabled={createEntry.isPending}>
            {createEntry.isPending ? 'Saving…' : 'Save entry'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <select value={filterPlantId} onChange={(e) => setFilterPlantId(e.target.value)}>
            <option value="">All plants</option>
            {activePlants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
            <option value="">All tags</option>
            {TAGS.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
          </select>
        </div>

        {journal.error && <div className="error-state">Couldn't load journal entries. Retry in a moment.</div>}
        {loading && !journal.error && <div className="empty muted">Loading…</div>}
        {!loading && !journal.error && entries.length === 0 && (
          <div className="empty">
            <h4>No entries {filterPlantId || filterTag ? 'match these filters' : 'yet'}</h4>
            <p>{filterPlantId || filterTag ? 'Try clearing a filter.' : 'Log your first observation above.'}</p>
          </div>
        )}
        {!loading && !journal.error && entries.length > 0 && (
          <ul className="list">
            {entries.map((e) => {
              const plant = activePlants.find((p) => p.id === e.plant_id);
              const stats = [
                e.water_vol_gal != null ? `${e.water_vol_gal} gal` : null,
                e.height_cm != null ? d.fmtHeight(e.height_cm, units) : null,
                e.ph != null ? `pH ${e.ph}` : null,
                e.ec != null ? `EC ${e.ec}` : null,
                e.temp_f != null ? `${e.temp_f}°F` : null,
                e.rh_pct != null ? `${e.rh_pct}% RH` : null,
              ].filter(Boolean).join(' · ');
              return (
                <li key={e.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>
                        {plant ? plant.name : 'Whole grow'} <span className="muted small" style={{ fontWeight: 400 }}>· {d.fmtDateTime(e.occurred_at)}</span>
                      </div>
                      {e.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '6px 0' }}>
                          {e.tags.map((t) => <span key={t} className="pill blue">{t}</span>)}
                        </div>
                      )}
                      {stats && <div className="small muted">{stats}</div>}
                      {e.symptoms && <div className="small" style={{ color: 'var(--amber)' }}>Symptoms: {e.symptoms}</div>}
                      {e.notes && <div className="small muted" style={{ marginTop: 4 }}>{e.notes}</div>}
                    </div>
                    <button className="btn ghost sm" onClick={() => removeEntry(e.id)} disabled={deleteEntry.isPending}>Delete</button>
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
