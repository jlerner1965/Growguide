// db/types.ts
// Row types mirror the Supabase schema (snake_case) so the data layer needs
// no translation. The Phase-1 backup importer (importBackup.ts) is the only
// place camelCase -> snake_case mapping happens.

export type Units = 'imperial' | 'metric';
export type Theme = 'light' | 'dark';
export type Stage =
  | 'Seedling' | 'Vegetative' | 'Pre-flower'
  | 'Flowering' | 'Late flower' | 'Harvest';

export interface Profile {
  id: string;
  display_name: string | null;
  units: Units;
  theme: Theme;
  experience: string | null;
  created_at: string;
  updated_at: string;
}

export interface Grow {
  id: string;
  user_id: string;
  name: string;
  location: string | null;
  lat: number | null;
  lng: number | null;
  elevation_ft: number | null;
  indoor_start: string | null;        // date (ISO yyyy-mm-dd)
  outdoor_transplant: string | null;
  plant_count: number | null;
  cultivars: string[];
  photo_type: 'Photoperiod' | 'Autoflower' | null;
  container: string | null;
  medium: string | null;
  irrigation: string | null;
  sun_exposure: string | null;
  protection: string | null;
  nutrition_approach: string | null;
  experience: string | null;
  concerns: string | null;
  is_sample: boolean;
  archived: boolean;
  created_at: string;
  updated_at: string;
}
export type GrowInput =
  { name: string } &
  Partial<Omit<Grow, 'id' | 'user_id' | 'name' | 'created_at' | 'updated_at'>>;

export interface Plant {
  id: string;
  grow_id: string;
  user_id: string;
  name: string;
  cultivar: string | null;
  source: string | null;
  start_date: string | null;
  transplant_date: string | null;
  medium: string | null;
  location: string | null;
  stage: Stage | null;
  health: number | null;              // 1..10
  archived: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
export type PlantInput =
  { grow_id: string; name: string } &
  Partial<Omit<Plant, 'id' | 'grow_id' | 'user_id' | 'name' | 'created_at' | 'updated_at'>>;

export interface JournalEntry {
  id: string;
  grow_id: string;
  plant_id: string | null;            // null = whole-grow entry
  user_id: string;
  occurred_at: string;                // timestamptz
  tags: string[];
  water_vol_gal: number | null;
  height_cm: number | null;           // canonical: centimetres
  width_cm: number | null;
  nutrients: string | null;
  ph: number | null;
  ec: number | null;
  temp_f: number | null;
  rh_pct: number | null;
  soil_moisture: string | null;
  symptoms: string | null;
  notes: string | null;
  created_at: string;
}
export type JournalInput =
  { grow_id: string } &
  Partial<Omit<JournalEntry, 'id' | 'grow_id' | 'user_id' | 'created_at'>>;

export interface JournalFilter {
  plantId?: string | null;
  tag?: string | null;
}

export interface Photo {
  id: string;
  user_id: string;
  grow_id: string | null;
  plant_id: string | null;
  journal_entry_id: string | null;
  storage_path: string;
  taken_at: string;
  stage: string | null;
  tags: string[];
  notes: string | null;
  is_profile: boolean;
  created_at: string;
}
