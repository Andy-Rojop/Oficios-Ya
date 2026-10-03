'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './api-client';

export interface ZoneDto {
  id: string;
  name: string;
  type: string;
}

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
}

export function fetchZones(): Promise<ZoneDto[]> {
  return apiFetch<ZoneDto[]>('/catalog/zones');
}

export function fetchCategories(): Promise<CategoryDto[]> {
  return apiFetch<CategoryDto[]>('/catalog/categories');
}

export function useCategories() {
  return useQuery<CategoryDto[], Error>({
    queryKey: ['catalog', 'categories'],
    queryFn: fetchCategories,
    staleTime: 10 * 60_000,
  });
}

export function useZones() {
  return useQuery<ZoneDto[], Error>({
    queryKey: ['catalog', 'zones'],
    queryFn: fetchZones,
    staleTime: 10 * 60_000,
  });
}
