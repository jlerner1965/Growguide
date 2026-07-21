// db/importBackup.ts
// One-time migration of a Phase-1 JSON backup (the file the standalone app's
// "Export backup" produced) into Supabase. The Phase-1 model used camelCase
// and short local ids; this maps fields to snake_case and rebuilds id links so
// journal entries still point at the right grow/plant after import.
//
// Usage:
//   const summary = await importBackup(JSON.parse(fileText));
//   // -> { growId, plants, entries }

import { supabase, currentUserId } from './client';

export interface Phase1Backup {
  app?: string;
  version?: number;
  grow: Record<string, any> | null;
  plants?: Record<string, any>[];
  journal?: Record<string, any>[];
  settings?: Record<string, any>;
}

const toInt = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = parseInt(v, 10); return Number.isFinite(n) ? n : null;
};
const toNum = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(v); return Number.isFinite(n) ? n : null;
};
const clampHealth = (v: any): number | null => {
  const n = toInt(v); if (n === null) return null;
  return Math.min(10, Math.max(1, n));
};

export async function importBackup(backup: Phase1Backup): Promise<{ growId: string; plants: number; entries: number }> {
  const userId = await currentUserId();
  if (!backup?.grow) throw new Error('Backup has no grow to import.');

  const g = backup.grow;
  const growRow = {
    name: g.name || 'Imported grow',
    location: g.location ?? null,
    lat: toNum(g.lat), lng: toNum(g.lng),
    elevation_ft: toInt(g.elevation),
    indoor_start: g.indoorStart ?? null,
    outdoor_transplant: g.outdoorTransplant ?? null,
    plant_count: toInt(g.plantCount),
    cultivars: Array.isArray(g.cultivars) ? g.cultivars : [],
    photo_type: g.photoType ?? null,
    container: g.container ?? null,
    medium: g.medium ?? null,
    irrigation: g.irrigation ?? null,
    sun_exposure: g.sunExposure ?? null,
    protection: g.protection ?? null,
    nutrition_approach: g.nutritionApproach ?? null,
    experience: g.experience ?? null,
    concerns: g.concerns ?? null,
    is_sample: false, // imported data is real, not the demo
  };
  const grow = await supabase.from('grows').insert(growRow).select('id').single();
  if (grow.error) throw grow.error;
  const growId = grow.data.id as string;

  // plants: build local-id -> new-uuid map so entries can be relinked
  const plantIdMap: Record<string, string> = {};
  for (const p of backup.plants ?? []) {
    const row = {
      grow_id: growId,
      name: p.name || 'Plant',
      cultivar: p.cultivar ?? null,
      source: p.source ?? null,
      start_date: p.startDate ?? null,
      transplant_date: p.transplantDate ?? null,
      medium: p.medium ?? null,
      location: p.location ?? null,
      stage: p.stage ?? null,
      health: clampHealth(p.health),
      archived: !!p.archived,
      notes: p.notes ?? null,
    };
    const np = await supabase.from('plants').insert(row).select('id').single();
    if (np.error) throw np.error;
    if (p.id) plantIdMap[p.id] = np.data.id as string;
  }

  // journal: relink plant_id, fold the Phase-1 free-text `weather` into notes
  const entryRows = (backup.journal ?? []).map((e) => {
    const notes = [e.notes, e.weather ? `Weather: ${e.weather}` : null].filter(Boolean).join(' \u00b7 ') || null;
    return {
      grow_id: growId,
      plant_id: e.plantId ? (plantIdMap[e.plantId] ?? null) : null,
      occurred_at: e.datetime || new Date().toISOString(),
      tags: Array.isArray(e.tags) ? e.tags : [],
      water_vol_gal: toNum(e.waterVol),
      height_cm: toNum(e.height),   // Phase-1 already stores height in cm
      width_cm: toNum(e.width),
      nutrients: e.nutrients ?? null,
      ph: toNum(e.pH),
      ec: toNum(e.ec),
      temp_f: toNum(e.temp),
      rh_pct: toNum(e.rh),
      soil_moisture: e.soilMoisture ?? null,
      symptoms: e.symptoms ?? null,
      notes,
    };
  });
  if (entryRows.length) {
    const je = await supabase.from('journal_entries').insert(entryRows);
    if (je.error) throw je.error;
  }

  // carry over unit/theme prefs
  if (backup.settings) {
    await supabase.from('profiles').update({
      units: backup.settings.units === 'metric' ? 'metric' : 'imperial',
      theme: backup.settings.theme === 'dark' ? 'dark' : 'light',
    }).eq('id', userId);
  }

  return { growId, plants: Object.keys(plantIdMap).length, entries: entryRows.length };
}
