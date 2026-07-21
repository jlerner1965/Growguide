// db/hooks.ts
// TanStack Query v5 hooks — how the tracker plugs into Compass.
// Queries are keyed so mutations can invalidate exactly what changed.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { GrowInput, PlantInput, JournalInput, JournalFilter, Profile } from './types';
import type { DiagnoseInput, Explanation } from '../lib/diagnose';

// ---- queries ----
export function useProfile() {
  return useQuery({ queryKey: ['profile'], queryFn: api.getProfile });
}
export function useGrows() {
  return useQuery({ queryKey: ['grows'], queryFn: api.listGrows });
}
export function useGrow(id?: string) {
  return useQuery({ queryKey: ['grow', id], queryFn: () => api.getGrow(id as string), enabled: !!id });
}
export function usePlants(growId?: string, opts?: { includeArchived?: boolean }) {
  return useQuery({
    queryKey: ['plants', growId, opts?.includeArchived ?? false],
    queryFn: () => api.listPlants(growId as string, opts),
    enabled: !!growId,
  });
}
export function useJournal(growId?: string, filter?: JournalFilter) {
  return useQuery({
    queryKey: ['journal', growId, filter ?? null],
    queryFn: () => api.listJournal(growId as string, filter),
    enabled: !!growId,
  });
}
export function usePhotos(plantId?: string) {
  return useQuery({ queryKey: ['photos', plantId], queryFn: () => api.listPhotos(plantId as string), enabled: !!plantId });
}
export function usePhotoUrls(storagePaths: string[]) {
  const key = [...storagePaths].sort();
  return useQuery({
    queryKey: ['photo-urls', key],
    queryFn: () => api.photoUrls(storagePaths),
    enabled: storagePaths.length > 0,
    // Signed URLs expire after 1h; refetch well before that so images never break.
    staleTime: 45 * 60_000,
    refetchInterval: 45 * 60_000,
  });
}

// ---- mutations ----
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Pick<Profile, 'display_name' | 'units' | 'theme' | 'experience'>>) => api.updateProfile(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });
}
export function useCreateGrow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GrowInput) => api.createGrow(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grows'] }),
  });
}
export function useDeleteGrow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteGrow(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grows'] }),
  });
}
export function useUpdateGrow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; patch: Partial<GrowInput> & { archived?: boolean } }) => api.updateGrow(v.id, v.patch),
    onSuccess: (g) => { qc.invalidateQueries({ queryKey: ['grows'] }); qc.invalidateQueries({ queryKey: ['grow', g.id] }); },
  });
}
export function useCreatePlant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PlantInput) => api.createPlant(input),
    onSuccess: (_p, v) => qc.invalidateQueries({ queryKey: ['plants', v.grow_id] }),
  });
}
export function useUpdatePlant(growId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; patch: Partial<PlantInput> & { archived?: boolean } }) => api.updatePlant(v.id, v.patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plants', growId] }),
  });
}
export function useDeletePlant(growId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePlant(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plants', growId] }),
  });
}
export function useDuplicatePlant(growId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.duplicatePlant(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plants', growId] }),
  });
}
export function useCreateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: JournalInput) => api.createEntry(input),
    onSuccess: (_e, v) => qc.invalidateQueries({ queryKey: ['journal', v.grow_id] }),
  });
}
export function useDeleteEntry(growId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteEntry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journal', growId] }),
  });
}
export function useUploadPhoto(plantId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { file: File; meta: Parameters<typeof api.uploadPhoto>[1] }) => api.uploadPhoto(v.file, v.meta),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['photos', plantId] }),
  });
}
export function useDeletePhoto(plantId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (photo: Parameters<typeof api.deletePhoto>[0]) => api.deletePhoto(photo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['photos', plantId] }),
  });
}
export function useSetProfilePhoto(plantId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { plantId: string; photoId: string }) => api.setProfilePhoto(v.plantId, v.photoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['photos', plantId] }),
  });
}
export function useDiagnoses(plantId?: string) {
  return useQuery({
    queryKey: ['diagnoses', plantId ?? null],
    queryFn: () => api.listDiagnoses(plantId),
  });
}
export function useSaveDiagnosis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: {
      inputs: DiagnoseInput;
      results: Explanation[];
      meta: { growId?: string | null; plantId?: string | null; topResult?: string | null; notes?: string | null };
    }) => api.saveDiagnosis(v.inputs, v.results, v.meta),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diagnoses'] }),
  });
}
