// db/hooks.ts
// TanStack Query v5 hooks — how the tracker plugs into Compass.
// Queries are keyed so mutations can invalidate exactly what changed.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { GrowInput, PlantInput, JournalInput, JournalFilter } from './types';

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

// ---- mutations ----
export function useCreateGrow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GrowInput) => api.createGrow(input),
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
