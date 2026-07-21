// db/api.ts
// Typed CRUD against the migration-001 tables. Every function throws on error
// (so callers / TanStack mutations can catch). user_id is filled by the column
// default auth.uid(); RLS enforces ownership — callers never pass user_id.

import { supabase, currentUserId } from './client';
import type {
  Grow, GrowInput, Plant, PlantInput,
  JournalEntry, JournalInput, JournalFilter, Photo, Profile,
} from './types';

// ---------- profile ----------
export async function getProfile(): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').single();
  if (error) throw error;
  return data as Profile;
}

export async function updateProfile(
  patch: Partial<Pick<Profile, 'display_name' | 'units' | 'theme' | 'experience'>>,
): Promise<Profile> {
  const id = await currentUserId();
  const { data, error } = await supabase
    .from('profiles').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Profile;
}

// ---------- grows ----------
export async function listGrows(): Promise<Grow[]> {
  const { data, error } = await supabase
    .from('grows').select('*').eq('archived', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Grow[];
}

export async function getGrow(id: string): Promise<Grow> {
  const { data, error } = await supabase.from('grows').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Grow;
}

export async function createGrow(input: GrowInput): Promise<Grow> {
  const { data, error } = await supabase.from('grows').insert(input).select('*').single();
  if (error) throw error;
  return data as Grow;
}

export async function updateGrow(id: string, patch: Partial<GrowInput> & { archived?: boolean }): Promise<Grow> {
  const { data, error } = await supabase
    .from('grows').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Grow;
}

export function archiveGrow(id: string) { return updateGrow(id, { archived: true }); }

export async function deleteGrow(id: string): Promise<void> {
  const { error } = await supabase.from('grows').delete().eq('id', id);
  if (error) throw error; // plants + entries cascade
}

// ---------- plants ----------
export async function listPlants(growId: string, opts?: { includeArchived?: boolean }): Promise<Plant[]> {
  let q = supabase.from('plants').select('*').eq('grow_id', growId);
  if (!opts?.includeArchived) q = q.eq('archived', false);
  const { data, error } = await q.order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Plant[];
}

export async function createPlant(input: PlantInput): Promise<Plant> {
  const { data, error } = await supabase.from('plants').insert(input).select('*').single();
  if (error) throw error;
  return data as Plant;
}

export async function updatePlant(id: string, patch: Partial<PlantInput> & { archived?: boolean }): Promise<Plant> {
  const { data, error } = await supabase
    .from('plants').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Plant;
}

export function archivePlant(id: string) { return updatePlant(id, { archived: true }); }

export async function duplicatePlant(id: string): Promise<Plant> {
  const src = await supabase.from('plants').select('*').eq('id', id).single();
  if (src.error) throw src.error;
  const p = src.data as Plant;
  return createPlant({
    grow_id: p.grow_id, name: `${p.name} (copy)`,
    cultivar: p.cultivar, source: p.source, start_date: p.start_date,
    transplant_date: p.transplant_date, medium: p.medium, location: p.location,
    stage: p.stage, health: p.health, notes: p.notes,
  });
}

export async function deletePlant(id: string): Promise<void> {
  const { error } = await supabase.from('plants').delete().eq('id', id);
  if (error) throw error; // plant-specific entries cascade
}

// ---------- journal ----------
export async function listJournal(growId: string, filter?: JournalFilter): Promise<JournalEntry[]> {
  let q = supabase.from('journal_entries').select('*').eq('grow_id', growId);
  if (filter?.plantId) q = q.eq('plant_id', filter.plantId);
  if (filter?.tag) q = q.contains('tags', [filter.tag]);
  const { data, error } = await q.order('occurred_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as JournalEntry[];
}

export async function createEntry(input: JournalInput): Promise<JournalEntry> {
  const { data, error } = await supabase
    .from('journal_entries').insert(input).select('*').single();
  if (error) throw error;
  return data as JournalEntry;
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase.from('journal_entries').delete().eq('id', id);
  if (error) throw error;
}

// ---------- photos ----------
export async function listPhotos(plantId: string): Promise<Photo[]> {
  const { data, error } = await supabase
    .from('photos').select('*').eq('plant_id', plantId)
    .order('taken_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Photo[];
}

export async function uploadPhoto(
  file: File,
  meta: { growId?: string; plantId?: string; takenAt?: string; stage?: string; notes?: string; tags?: string[] },
): Promise<Photo> {
  const uid = await currentUserId();
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  // Path MUST start with {user_id}/ — the Storage RLS policy checks the first folder.
  const key = `${uid}/${meta.plantId || meta.growId || 'misc'}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from('grow-photos').upload(key, file, { upsert: false });
  if (up.error) throw up.error;
  const { data, error } = await supabase.from('photos').insert({
    grow_id: meta.growId ?? null,
    plant_id: meta.plantId ?? null,
    storage_path: key,
    taken_at: meta.takenAt ?? new Date().toISOString(),
    stage: meta.stage ?? null,
    notes: meta.notes ?? null,
    tags: meta.tags ?? [],
  }).select('*').single();
  if (error) throw error;
  return data as Photo;
}

/** Signed URL for a private photo (bucket is not public). Valid for `expiresIn` seconds. */
export async function photoUrl(storagePath: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from('grow-photos').createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
