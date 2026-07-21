// screens/Plants.tsx
// hooks -> derive -> render, following screens/Dashboard.tsx.
import { useState } from 'react';
import {
  useGrows, usePlants, useJournal, useProfile,
  useCreatePlant, useUpdatePlant, useDeletePlant, useDuplicatePlant,
} from '../db/hooks';
import * as d from '../lib/derive';
import { Sparkline } from '../components/Sparkline';
import type { Plant, PlantInput, Stage } from '../db/types';

interface PlantDraft {
  name: string; cultivar: string; source: string; start_date: string; transplant_date: string;
  medium: string; location: string; stage: Stage | ''; health: string; notes: string;
}
const EMPTY_DRAFT: PlantDraft = {
  name: '', cultivar: '', source: '', start_date: '', transplant_date: '',
  medium: '', location: '', stage: '', health: '', notes: '',
};
function draftFromPlant(p: Plant): PlantDraft {
  return {
    name: p.name, cultivar: p.cultivar ?? '', source: p.source ?? '',
    start_date: p.start_date ?? '', transplant_date: p.transplant_date ?? '',
    medium: p.medium ?? '', location: p.location ?? '', stage: p.stage ?? '',
    health: p.health != null ? String(p.health) : '', notes: p.notes ?? '',
  };
}

function healthPill(health: number | null) {
  if (health == null) return <span className="pill gray">No health set</span>;
  const cls = health >= 7 ? 'green' : health >= 4 ? 'amber' : 'red';
  return <span className={`pill ${cls}`}>Health {health}/10</span>;
}

type View = { mode: 'list' } | { mode: 'detail'; id: string } | { mode: 'compare' };

export function Plants() {
  const grows = useGrows();
  const grow = grows.data?.[0];
  const profile = useProfile();
  const [includeArchived, setIncludeArchived] = useState(false);
  const plants = usePlants(grow?.id, { includeArchived });
  const journal = useJournal(grow?.id);
  const createPlant = useCreatePlant();
  const updatePlant = useUpdatePlant(grow?.id);
  const deletePlant = useDeletePlant(grow?.id);
  const duplicatePlant = useDuplicatePlant(grow?.id);

  const [view, setView] = useState<View>({ mode: 'list' });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PlantDraft>(EMPTY_DRAFT);
  const [formError, setFormError] = useState<string | null>(null);
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');

  if (grows.isLoading) return <div className="content muted">Loading…</div>;
  if (grows.error) return <div className="content error-state">Couldn't load your grows. Retry in a moment.</div>;
  if (!grow) {
    return (
      <div className="content">
        <div className="card empty"><h4>No grow yet</h4><p>Set up your first grow before adding plants.</p></div>
      </div>
    );
  }

  const units = profile.data?.units ?? 'imperial';
  const all = plants.data ?? [];
  const entries = journal.data ?? [];
  const loading = plants.isLoading || journal.isLoading;

  function openAdd() {
    setEditingId(null); setDraft(EMPTY_DRAFT); setFormError(null); setShowForm(true);
  }
  function openEdit(p: Plant) {
    setEditingId(p.id); setDraft(draftFromPlant(p)); setFormError(null); setShowForm(true);
  }
  async function saveForm() {
    if (!draft.name.trim()) { setFormError('Name is required.'); return; }
    const health = draft.health.trim() ? Number(draft.health) : null;
    if (draft.health.trim() && (!Number.isFinite(health) || health! < 1 || health! > 10)) {
      setFormError('Health must be 1–10.'); return;
    }
    const patch: Partial<PlantInput> = {
      name: draft.name.trim(),
      cultivar: draft.cultivar.trim() || null,
      source: draft.source.trim() || null,
      start_date: draft.start_date || null,
      transplant_date: draft.transplant_date || null,
      medium: draft.medium.trim() || null,
      location: draft.location.trim() || null,
      stage: draft.stage || null,
      health,
      notes: draft.notes.trim() || null,
    };
    try {
      if (editingId) {
        await updatePlant.mutateAsync({ id: editingId, patch });
      } else {
        await createPlant.mutateAsync({ grow_id: grow!.id, name: draft.name.trim(), ...patch } as PlantInput);
      }
      setShowForm(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not save this plant.');
    }
  }

  async function toggleArchive(p: Plant) {
    try {
      await updatePlant.mutateAsync({ id: p.id, patch: { archived: !p.archived } });
    } catch {
      alert('Could not update this plant. Try again.');
    }
  }
  async function removePlant(p: Plant) {
    if (!confirm(`Delete "${p.name}" permanently? This also deletes its journal entries and cannot be undone.`)) return;
    try {
      await deletePlant.mutateAsync(p.id);
      if (view.mode === 'detail' && view.id === p.id) setView({ mode: 'list' });
    } catch {
      alert('Could not delete this plant. Try again.');
    }
  }
  async function duplicate(p: Plant) {
    try {
      await duplicatePlant.mutateAsync(p.id);
    } catch {
      alert('Could not duplicate this plant. Try again.');
    }
  }

  if (view.mode === 'detail') {
    const plant = all.find((p) => p.id === view.id);
    if (!plant) {
      return (
        <div className="content">
          <button className="btn ghost sm" onClick={() => setView({ mode: 'list' })}>← Back to Plants</button>
          <div className="card empty" style={{ marginTop: 12 }}><h4>Plant not found</h4></div>
        </div>
      );
    }
    const timeline = d.plantEntries(entries, plant.id).slice().reverse();
    const heightPts = d.heightSeries(entries, plant.id);
    return (
      <div className="content">
        <button className="btn ghost sm" onClick={() => setView({ mode: 'list' })}>← Back to Plants</button>
        <div className="page-head" style={{ marginTop: 10 }}>
          <h2>{plant.name}</h2>
          {plant.stage && <span className="pill blue">{plant.stage}</span>}
          {healthPill(plant.health)}
        </div>
        <div className="page-sub">{plant.cultivar || 'No cultivar set'} · {timeline.length} journal {timeline.length === 1 ? 'entry' : 'entries'}</div>

        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div className="eyebrow">Height trend</div>
          <Sparkline points={heightPts.map((p) => ({ x: p.x, y: units === 'imperial' ? d.cmToIn(p.y) : p.y }))} />
          <div className="small muted" style={{ marginTop: 6 }}>Height ({units === 'imperial' ? 'in' : 'cm'}) · latest {d.fmtHeight(d.latestHeightCm(entries, plant.id), units)}</div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Timeline</div>
          {timeline.length === 0 && <div className="muted small">No journal entries for this plant yet.</div>}
          <ul className="list">
            {timeline.map((e) => (
              <li key={e.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                <div style={{ fontWeight: 600 }}>{d.fmtDateTime(e.occurred_at)}</div>
                {e.tags.length > 0 && <div className="small muted">{e.tags.join(', ')}</div>}
                {e.notes && <div className="small">{e.notes}</div>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (view.mode === 'compare') {
    const pa = all.find((p) => p.id === compareA);
    const pb = all.find((p) => p.id === compareB);
    return (
      <div className="content">
        <button className="btn ghost sm" onClick={() => setView({ mode: 'list' })}>← Back to Plants</button>
        <div className="page-head" style={{ marginTop: 10 }}><h2>Compare plants</h2></div>
        <div className="grid2" style={{ marginBottom: 16 }}>
          <label className="field">
            <span className="lab">Plant A</span>
            <select value={compareA} onChange={(e) => setCompareA(e.target.value)}>
              <option value="">Select…</option>
              {all.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="lab">Plant B</span>
            <select value={compareB} onChange={(e) => setCompareB(e.target.value)}>
              <option value="">Select…</option>
              {all.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        </div>
        {pa && pb ? (
          <div className="grid2">
            {[pa, pb].map((p) => (
              <div key={p.id} className="card" style={{ padding: 16 }}>
                <div className="eyebrow">{p.name}</div>
                <div style={{ margin: '8px 0' }}>
                  {p.stage && <span className="pill blue" style={{ marginRight: 6 }}>{p.stage}</span>}
                  {healthPill(p.health)}
                </div>
                <div className="small muted">Cultivar: {p.cultivar || '—'}</div>
                <div className="small muted">Latest height: {d.fmtHeight(d.latestHeightCm(entries, p.id), units)}</div>
                <div className="small muted">Journal entries: {d.plantEntries(entries, p.id).length}</div>
                <div style={{ marginTop: 10 }}>
                  <Sparkline points={d.heightSeries(entries, p.id).map((pt) => ({ x: pt.x, y: units === 'imperial' ? d.cmToIn(pt.y) : pt.y }))} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card empty"><p>Pick two plants to compare.</p></div>
        )}
      </div>
    );
  }

  return (
    <div className="content">
      <div className="page-head">
        <h2>Plants</h2>
        <span className="count num">{all.length}</span>
        <span className="spacer" />
        <button className="btn ghost sm" onClick={() => setView({ mode: 'compare' })} disabled={all.length < 2}>Compare</button>
        <button className="btn primary sm" onClick={openAdd}>+ Add plant</button>
      </div>
      <div className="page-sub">
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />
          Show archived
        </label>
      </div>

      {grows.error && <div className="error-state">Couldn't load your grows.</div>}
      {plants.error && <div className="error-state">Couldn't load your plants. Retry in a moment.</div>}
      {loading && !plants.error && <div className="card empty muted">Loading…</div>}
      {!loading && !plants.error && all.length === 0 && (
        <div className="card empty">
          <h4>No plants yet</h4>
          <p>Add your first plant to start tracking height, health, and journal entries.</p>
          <button className="btn primary" onClick={openAdd}>+ Add plant</button>
        </div>
      )}
      {!loading && !plants.error && all.length > 0 && (
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))' }}>
          {all.map((p) => (
            <div key={p.id} className="card" style={{ padding: 16, opacity: p.archived ? 0.6 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ fontWeight: 700, cursor: 'pointer' }} onClick={() => setView({ mode: 'detail', id: p.id })}>{p.name}</div>
                {p.archived && <span className="pill gray">Archived</span>}
              </div>
              <div className="small muted" style={{ margin: '4px 0 8px' }}>{p.cultivar || 'No cultivar set'}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {p.stage && <span className="pill blue">{p.stage}</span>}
                {healthPill(p.health)}
              </div>
              <div className="small muted">Latest height: {d.fmtHeight(d.latestHeightCm(entries, p.id), units)}</div>
              <div className="small muted" style={{ marginBottom: 10 }}>{d.plantEntries(entries, p.id).length} journal entries</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="btn sm" onClick={() => setView({ mode: 'detail', id: p.id })}>View</button>
                <button className="btn sm" onClick={() => openEdit(p)}>Edit</button>
                <button className="btn sm" onClick={() => duplicate(p)} disabled={duplicatePlant.isPending}>Duplicate</button>
                <button className="btn sm" onClick={() => toggleArchive(p)} disabled={updatePlant.isPending}>{p.archived ? 'Restore' : 'Archive'}</button>
                <button className="btn danger sm" onClick={() => removePlant(p)} disabled={deletePlant.isPending}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{editingId ? 'Edit plant' : 'Add plant'}</h3>
              <button className="close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="modal-body">
              <label className="field">
                <span className="lab req">Name</span>
                <input value={draft.name} onChange={(e) => setDraft((s) => ({ ...s, name: e.target.value }))} />
              </label>
              <div className="grid2">
                <label className="field">
                  <span className="lab">Cultivar</span>
                  <input value={draft.cultivar} onChange={(e) => setDraft((s) => ({ ...s, cultivar: e.target.value }))} />
                </label>
                <label className="field">
                  <span className="lab">Source</span>
                  <input value={draft.source} onChange={(e) => setDraft((s) => ({ ...s, source: e.target.value }))} placeholder="Seed, clone, nursery…" />
                </label>
              </div>
              <div className="grid2">
                <label className="field">
                  <span className="lab">Start date</span>
                  <input type="date" value={draft.start_date} onChange={(e) => setDraft((s) => ({ ...s, start_date: e.target.value }))} />
                </label>
                <label className="field">
                  <span className="lab">Transplant date</span>
                  <input type="date" value={draft.transplant_date} onChange={(e) => setDraft((s) => ({ ...s, transplant_date: e.target.value }))} />
                </label>
              </div>
              <div className="grid2">
                <label className="field">
                  <span className="lab">Medium</span>
                  <input value={draft.medium} onChange={(e) => setDraft((s) => ({ ...s, medium: e.target.value }))} />
                </label>
                <label className="field">
                  <span className="lab">Location</span>
                  <input value={draft.location} onChange={(e) => setDraft((s) => ({ ...s, location: e.target.value }))} placeholder="Row 2, left bed…" />
                </label>
              </div>
              <div className="grid2">
                <label className="field">
                  <span className="lab">Stage</span>
                  <select value={draft.stage} onChange={(e) => setDraft((s) => ({ ...s, stage: e.target.value as Stage | '' }))}>
                    <option value="">Unset</option>
                    {d.STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span className="lab">Health (1–10)</span>
                  <input inputMode="numeric" value={draft.health} onChange={(e) => setDraft((s) => ({ ...s, health: e.target.value }))} />
                </label>
              </div>
              <label className="field">
                <span className="lab">Notes</span>
                <textarea value={draft.notes} onChange={(e) => setDraft((s) => ({ ...s, notes: e.target.value }))} />
              </label>
            </div>
            <div className="modal-foot">
              {formError && <span className="small" style={{ color: 'var(--red)' }}>{formError}</span>}
              <span className="spacer" />
              <button className="btn" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn primary" onClick={saveForm} disabled={createPlant.isPending || updatePlant.isPending}>
                {createPlant.isPending || updatePlant.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
