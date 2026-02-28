import { apiGet, apiPost, apiPut, apiDelete } from './client';

export interface DistrictDto {
  id: number;
  name: string;
  is_active: boolean;
}

export interface RouteDto {
  id: number;
  number: string;
  name?: string | null;
  is_active: boolean;
}

export async function getDistrictsDirectory(): Promise<DistrictDto[]> {
  return apiGet<DistrictDto[]>('/directories/districts');
}

export async function getDistrictsPublic(): Promise<DistrictDto[]> {
  return apiGet<DistrictDto[]>('/directories/districts/public');
}

export async function createDistrict(data: { name: string; is_active?: boolean }): Promise<DistrictDto> {
  return apiPost<DistrictDto>('/directories/districts', data);
}

export async function updateDistrict(id: number, data: Partial<{ name: string; is_active: boolean }>): Promise<DistrictDto> {
  return apiPut<DistrictDto>(`/directories/districts/${id}`, data);
}

export async function deleteDistrict(id: number): Promise<void> {
  return apiDelete<void>(`/directories/districts/${id}`);
}

export async function getRoutesDirectory(): Promise<RouteDto[]> {
  return apiGet<RouteDto[]>('/directories/routes');
}

export async function createRoute(data: { number: string; name?: string; is_active?: boolean }): Promise<RouteDto> {
  return apiPost<RouteDto>('/directories/routes', data);
}

export async function updateRoute(id: number, data: Partial<{ number: string; name: string; is_active: boolean }>): Promise<RouteDto> {
  return apiPut<RouteDto>(`/directories/routes/${id}`, data);
}

export async function deleteRoute(id: number): Promise<void> {
  return apiDelete<void>(`/directories/routes/${id}`);
}

// ============== CUSTOM FIELDS (Характеристики) ==============

export interface CustomFieldDto {
  id: number;
  name: string;
  field_type: 'text' | 'number' | 'boolean' | 'select';
  options?: string[] | null;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
}

export async function getCustomFieldsPublic(): Promise<CustomFieldDto[]> {
  return apiGet<CustomFieldDto[]>('/directories/custom-fields/public');
}

export async function getCustomFieldsDirectory(): Promise<CustomFieldDto[]> {
  return apiGet<CustomFieldDto[]>('/directories/custom-fields');
}

export async function createCustomField(data: {
  name: string; field_type?: string; options?: string[];
  is_required?: boolean; is_active?: boolean; sort_order?: number;
}): Promise<CustomFieldDto> {
  return apiPost<CustomFieldDto>('/directories/custom-fields', data);
}

export async function updateCustomField(id: number, data: Partial<CustomFieldDto>): Promise<CustomFieldDto> {
  return apiPut<CustomFieldDto>(`/directories/custom-fields/${id}`, data);
}

export async function deleteCustomField(id: number): Promise<void> {
  return apiDelete<void>(`/directories/custom-fields/${id}`);
}

