// screens/Photos.tsx
// hooks -> render, following the existing screen pattern with explicit
// loading / empty / error states. A MANUAL photo log: the grower uploads
// images and sets the date, stage, and tags themselves. There is no image
// analysis of any kind — nothing here inspects or interprets the pixels.
import { useMemo, useState } from 'react';
import {
  useGrows, usePlants, usePhotos, usePhotoUrls,
  useUploadPhoto, useDeletePhoto, useSetProfilePhoto,
} from '../db/hooks';
import * as d from '../lib/derive';
import type { Photo } from '../db/types';

// User-set observation tags — plain labels, not a diagnosis.
const PHOTO_TAGS = ['Healthy', 'Pest', 'Damage', 'Deficiency', 'Disease', 'Mildew', 'Flowering', 'Trichomes'];

function nowLocalInput() {
  const dt = new Date();
  dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
  return dt.toISOString().slice(0, 16);
}

interface UploadDraft {
  file: File | null;
  takenAt: string;
  stage: string;
  notes: string;
  tags: string[];
}
const EMPTY_UPLOAD: UploadDraft = { file: null, takenAt: '', stage: '', notes: '', tags: [] };

export function Photos() {
  const grows = useGrows();
  const grow = grows.data?.[0];
  const plants = usePlants(grow?.id);
  const [plantId, setPlantId] = useState('');
  const activePlants = useMemo(() => (plants.data ?? []).filter((p) => !p.archived), [plants.data]);
  // default the picker to the first active plant once plants load
  const selectedPlantId = plantId || activePlants[0]?.id || '';

  const photos = usePhotos(selectedPlantId || undefined);
  const allPhotos = photos.data ?? [];
  const urls = usePhotoUrls(allPhotos.map((p) => p.storage_path));
  const urlMap = urls.data ?? {};

  const upload = useUploadPhoto(selectedPlantId || undefined);
  const del = useDeletePhoto(selectedPlantId || undefined);
  const setProfile = useSetProfilePhoto(selectedPlantId || undefined);

  const [draft, setDraft] = useState<UploadDraft>(EMPTY_UPLOAD);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  if (grows.isLoading) return <div className="content muted">Loading…</div>;
  if (grows.error) return <div className="content error-state">Couldn't load your grows. Retry in a moment.</div>;
  if (!grow) {
    return (
      <div className="content">
        <div className="card empty"><h4>No grow yet</h4><p>Set up your grow and add a plant before logging photos.</p></div>
      </div>
    );
  }

  const shown = filterTag ? allPhotos.filter((p) => p.tags.includes(filterTag)) : allPhotos;

  function toggleTag(tag: string) {
    setDraft((s) => ({ ...s, tags: s.tags.includes(tag) ? s.tags.filter((t) => t !== tag) : [...s.tags, tag] }));
  }

  async function submitUpload() {
    setUploadError(null);
    if (!draft.file) { setUploadError('Choose an image first.'); return; }
    if (!selectedPlantId) { setUploadError('Select a plant first.'); return; }
    try {
      await upload.mutateAsync({
        file: draft.file,
        meta: {
          growId: grow!.id,
          plantId: selectedPlantId,
          takenAt: draft.takenAt ? new Date(draft.takenAt).toISOString() : new Date().toISOString(),
          stage: draft.stage || undefined,
          notes: draft.notes.trim() || undefined,
          tags: draft.tags,
        },
      });
      setDraft(EMPTY_UPLOAD);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Could not upload this photo.');
    }
  }

  async function removePhoto(p: Photo) {
    if (!confirm('Delete this photo? The image file and its record are removed permanently.')) return;
    try {
      await del.mutateAsync({ id: p.id, storage_path: p.storage_path });
      setCompareIds((ids) => ids.filter((id) => id !== p.id));
    } catch {
      alert('Could not delete this photo. Try again.');
    }
  }

  async function makeProfile(p: Photo) {
    try {
      await setProfile.mutateAsync({ plantId: selectedPlantId, photoId: p.id });
    } catch {
      alert('Could not set the profile photo. Try again.');
    }
  }

  function toggleCompareSelect(id: string) {
    setCompareIds((ids) => {
      if (ids.includes(id)) return ids.filter((x) => x !== id);
      if (ids.length >= 2) return [ids[1], id]; // keep the last two picked
      return [...ids, id];
    });
  }

  const comparePhotos = compareIds.map((id) => allPhotos.find((p) => p.id === id)).filter(Boolean) as Photo[];

  return (
    <div className="content">
      <div className="page-head">
        <h2>Photo Timeline</h2>
        <span className="count num">{allPhotos.length}</span>
        <span className="spacer" />
        <button
          className={`btn sm${compareMode ? ' primary' : ''}`}
          onClick={() => { setCompareMode((m) => !m); setCompareIds([]); }}
          disabled={allPhotos.length < 2}
        >
          {compareMode ? 'Exit compare' : 'Compare'}
        </button>
      </div>
      <div className="page-sub">A manual photo log — you set the date, stage, and tags. Nothing here analyzes your images.</div>

      <label className="field" style={{ maxWidth: 320 }}>
        <span className="lab">Plant</span>
        <select value={selectedPlantId} onChange={(e) => { setPlantId(e.target.value); setCompareIds([]); }}>
          {activePlants.length === 0 && <option value="">No plants yet</option>}
          {activePlants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>

      {activePlants.length === 0 ? (
        <div className="card empty"><h4>No plants yet</h4><p>Add a plant on the Plants screen before logging photos.</p></div>
      ) : (
        <>
          {/* Upload */}
          <div className="card" style={{ padding: 16, margin: '8px 0 20px' }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Add photo</div>
            <label className="field">
              <span className="lab">Image</span>
              <input type="file" accept="image/*" onChange={(e) => setDraft((s) => ({ ...s, file: e.target.files?.[0] ?? null }))} />
            </label>
            <div className="grid2">
              <label className="field">
                <span className="lab">Taken</span>
                <input type="datetime-local" value={draft.takenAt || nowLocalInput()} onChange={(e) => setDraft((s) => ({ ...s, takenAt: e.target.value }))} />
              </label>
              <label className="field">
                <span className="lab">Growth stage</span>
                <select value={draft.stage} onChange={(e) => setDraft((s) => ({ ...s, stage: e.target.value }))}>
                  <option value="">Unset</option>
                  {d.STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
            <div className="field">
              <span className="lab">Tags (what you see — your call)</span>
              <div className="seg">
                {PHOTO_TAGS.map((tag) => (
                  <button key={tag} type="button" className={`tag${draft.tags.includes(tag) ? ' on' : ''}`} onClick={() => toggleTag(tag)}>{tag}</button>
                ))}
              </div>
            </div>
            <label className="field">
              <span className="lab">Notes</span>
              <textarea value={draft.notes} onChange={(e) => setDraft((s) => ({ ...s, notes: e.target.value }))} />
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {uploadError && <span className="small" style={{ color: 'var(--red)' }}>{uploadError}</span>}
              <span className="spacer" />
              <button className="btn primary" onClick={submitUpload} disabled={upload.isPending || !draft.file}>
                {upload.isPending ? 'Uploading…' : 'Upload photo'}
              </button>
            </div>
          </div>

          {/* Filter + compare bar */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="toolbar">
              <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
                <option value="">All tags</option>
                {PHOTO_TAGS.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
              </select>
              {compareMode && (
                <>
                  <span className="small muted">Pick 2 to compare · {compareIds.length}/2</span>
                  <span className="spacer" />
                  <button className="btn sm primary" disabled={comparePhotos.length !== 2} onClick={() => setShowCompare(true)}>Compare selected</button>
                </>
              )}
            </div>

            {photos.error && <div className="error-state">Couldn't load photos. Retry in a moment.</div>}
            {photos.isLoading && !photos.error && <div className="empty muted">Loading photos…</div>}
            {!photos.isLoading && !photos.error && shown.length === 0 && (
              <div className="empty">
                <h4>{allPhotos.length === 0 ? 'No photos yet' : 'No photos match this tag'}</h4>
                <p>{allPhotos.length === 0 ? 'Upload your first photo above to start this plant’s timeline.' : 'Try clearing the tag filter.'}</p>
              </div>
            )}
            {!photos.isLoading && !photos.error && shown.length > 0 && (
              <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', padding: 16 }}>
                {shown.map((p) => {
                  const url = urlMap[p.storage_path];
                  const selected = compareIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      className="card"
                      style={{ padding: 10, border: selected ? '2px solid var(--forest)' : undefined, cursor: compareMode ? 'pointer' : 'default' }}
                      onClick={compareMode ? () => toggleCompareSelect(p.id) : undefined}
                    >
                      <div style={{ position: 'relative', aspectRatio: '4 / 3', background: 'var(--sage-100)', borderRadius: 8, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {url ? (
                          <img src={url} alt={`${p.stage ?? 'Photo'} — ${d.fmtShort(p.taken_at)}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span className="small muted">{urls.isLoading ? 'Loading image…' : 'Image unavailable'}</span>
                        )}
                        {p.is_profile && <span className="pill green" style={{ position: 'absolute', top: 6, left: 6 }}>Profile</span>}
                        {compareMode && selected && <span className="pill blue" style={{ position: 'absolute', top: 6, right: 6 }}>Selected</span>}
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <div className="small" style={{ fontWeight: 600 }}>{d.fmtDateTime(p.taken_at)}</div>
                        {p.stage && <span className="pill blue" style={{ marginRight: 4 }}>{p.stage}</span>}
                        {p.tags.map((t) => <span key={t} className="pill gray" style={{ marginRight: 4 }}>{t}</span>)}
                        {p.notes && <div className="small muted" style={{ marginTop: 4 }}>{p.notes}</div>}
                      </div>
                      {!compareMode && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                          <button className="btn sm" onClick={() => makeProfile(p)} disabled={p.is_profile || setProfile.isPending}>
                            {p.is_profile ? 'Profile photo' : 'Set as profile'}
                          </button>
                          <button className="btn danger sm" onClick={() => removePhoto(p)} disabled={del.isPending}>Delete</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {showCompare && comparePhotos.length === 2 && (
        <div className="overlay" onClick={() => setShowCompare(false)}>
          <div className="modal" style={{ maxWidth: 760 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Compare photos</h3>
              <button className="close" onClick={() => setShowCompare(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="grid2">
                {comparePhotos.map((p) => {
                  const url = urlMap[p.storage_path];
                  return (
                    <div key={p.id}>
                      <div style={{ aspectRatio: '4 / 3', background: 'var(--sage-100)', borderRadius: 8, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {url ? <img src={url} alt={d.fmtShort(p.taken_at)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span className="small muted">Image unavailable</span>}
                      </div>
                      <div className="small" style={{ fontWeight: 600, marginTop: 6 }}>{d.fmtDateTime(p.taken_at)}</div>
                      {p.stage && <span className="pill blue">{p.stage}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
