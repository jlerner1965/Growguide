// screens/Settings.tsx
// hooks -> derive -> render. Preferences (units/theme/profile) + data
// (export a native backup, restore a Phase-1 backup via importBackup,
// delete sample data). Every destructive action confirms first.
import { useRef, useState } from 'react';
import { useProfile, useUpdateProfile, useGrows, useDeleteGrow } from '../db/hooks';
import * as api from '../db/api';
import { importBackup, type Phase1Backup } from '../db/importBackup';
import type { Units, Theme } from '../db/types';

export function Settings() {
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const grows = useGrows();
  const deleteGrow = useDeleteGrow();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [units, setUnits] = useState<Units | null>(null);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [experience, setExperience] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  if (profile.isLoading) return <div className="content muted">Loading…</div>;
  if (profile.error || !profile.data) return <div className="content error-state">Couldn't load your profile. Retry in a moment.</div>;

  const p = profile.data;
  const draftUnits = units ?? p.units;
  const draftTheme = theme ?? p.theme;
  const draftName = displayName ?? p.display_name ?? '';
  const draftExperience = experience ?? p.experience ?? '';
  const dirty = draftUnits !== p.units || draftTheme !== p.theme || draftName !== (p.display_name ?? '') || draftExperience !== (p.experience ?? '');

  async function savePreferences() {
    try {
      await updateProfile.mutateAsync({
        units: draftUnits, theme: draftTheme,
        display_name: draftName.trim() || null,
        experience: draftExperience || null,
      });
      setDisplayName(null); setUnits(null); setTheme(null); setExperience(null);
    } catch {
      alert('Could not save preferences. Try again.');
    }
  }

  async function exportBackup() {
    setExporting(true);
    try {
      const growList = await api.listGrows();
      const growsFull = await Promise.all(growList.map(async (g) => {
        const plants = await api.listPlants(g.id, { includeArchived: true });
        const journal = await api.listJournal(g.id);
        const photoLists = await Promise.all(plants.map((pl) => api.listPhotos(pl.id)));
        return { grow: g, plants, journal, photos: photoLists.flat() };
      }));
      const backup = { app: 'grow-tracker', version: 1, exported: new Date().toISOString(), grows: growsFull };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `grow-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      alert('Could not export a backup. Try again.');
    } finally {
      setExporting(false);
    }
  }

  function pickRestoreFile() { fileInputRef.current?.click(); }

  async function restoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!confirm('Import this Phase-1 backup as a new grow? This adds data — it does not overwrite anything.')) return;
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Phase1Backup;
      const summary = await importBackup(parsed);
      alert(`Imported: ${summary.plants} plants, ${summary.entries} journal entries.`);
    } catch (err) {
      alert(err instanceof Error ? `Could not import: ${err.message}` : 'Could not import this file.');
    } finally {
      setImporting(false);
    }
  }

  const sampleGrow = (grows.data ?? []).find((g) => g.is_sample);

  async function deleteSample() {
    if (!sampleGrow) return;
    if (!confirm(`Delete the sample grow "${sampleGrow.name}" and everything in it? This cannot be undone.`)) return;
    try {
      await deleteGrow.mutateAsync(sampleGrow.id);
    } catch {
      alert('Could not delete sample data. Try again.');
    }
  }

  return (
    <div className="content" style={{ maxWidth: 640 }}>
      <div className="page-head"><h2>Settings</h2></div>

      <div className="eyebrow" style={{ marginBottom: 8 }}>Preferences</div>
      <div className="card" style={{ padding: 16, marginBottom: 24 }}>
        <label className="field">
          <span className="lab">Display name</span>
          <input value={draftName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        <div className="grid2">
          <label className="field">
            <span className="lab">Units</span>
            <select value={draftUnits} onChange={(e) => setUnits(e.target.value as Units)}>
              <option value="imperial">Imperial (in, °F)</option>
              <option value="metric">Metric (cm, °C shown as °F still for RH/temp fields)</option>
            </select>
          </label>
          <label className="field">
            <span className="lab">Theme</span>
            <select value={draftTheme} onChange={(e) => setTheme(e.target.value as Theme)}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        </div>
        <label className="field">
          <span className="lab">Experience</span>
          <select value={draftExperience} onChange={(e) => setExperience(e.target.value)}>
            <option value="">Unset</option>
            <option>New</option>
            <option>Some seasons</option>
            <option>Experienced</option>
          </select>
        </label>
        <button className="btn primary" onClick={savePreferences} disabled={!dirty || updateProfile.isPending}>
          {updateProfile.isPending ? 'Saving…' : 'Save preferences'}
        </button>
      </div>

      <div className="eyebrow" style={{ marginBottom: 8 }}>Data</div>
      <div className="card" style={{ padding: 16, marginBottom: 24 }}>
        <p className="small muted">Your data lives in Supabase under your account. Export a backup regularly — that's the only copy you control directly.</p>
        <button className="btn block" style={{ marginBottom: 10 }} onClick={exportBackup} disabled={exporting}>
          {exporting ? 'Exporting…' : 'Export backup (.json)'}
        </button>
        <button className="btn block" onClick={pickRestoreFile} disabled={importing}>
          {importing ? 'Importing…' : 'Import Phase-1 backup (.json)'}
        </button>
        <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={restoreFile} />
        <p className="small muted" style={{ marginTop: 8 }}>Phase-1 import is for the older standalone app's export file — it adds a new grow, it never overwrites existing data.</p>
      </div>

      <div className="eyebrow" style={{ marginBottom: 8 }}>Sample data</div>
      <div className="card" style={{ padding: 16 }}>
        {grows.isLoading && <p className="small muted">Checking for sample data…</p>}
        {!grows.isLoading && !sampleGrow && <p className="small muted">No sample data found.</p>}
        {sampleGrow && (
          <>
            <p className="small muted">"{sampleGrow.name}" is marked as sample data.</p>
            <button className="btn danger" onClick={deleteSample} disabled={deleteGrow.isPending}>
              {deleteGrow.isPending ? 'Deleting…' : 'Delete sample data'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
