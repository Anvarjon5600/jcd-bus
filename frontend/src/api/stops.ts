/**
 * Stops API
 * FIX: синхронизировано с backend endpoints
 */
import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from './client';
import type { BusStop, ChangeLogEntry } from '../types';

export interface StopsFilter {
  search?: string;
  district?: string;
  status?: string;
  condition?: string;
  page?: number;
  per_page?: number;   // FIX: было limit → per_page
  sort_by?: string;
  sort_order?: string;
}

export interface StopsResponse {
  stops: BusStop[];  // FIX: было items — backend возвращает 'stops'
  total: number;
  page: number;
  per_page: number;  // FIX: было limit
  pages: number;
}

export interface StopStats {
  total_stops: number;        // FIX: было total
  active_stops: number;       // FIX: было active
  repair_stops: number;       // FIX: было repair
  dismantled_stops: number;   // FIX: было dismantled
  inactive_stops: number;     // FIX: было unavailable → inactive_stops
  excellent_condition: number;
  satisfactory_condition: number;
  needs_repair_condition: number;
  critical_condition: number;
  inspected_this_month: number;
  by_district: Record<string, number>;
}

export interface PhotoResponse {
  id: number;
  filename: string;
  file_path: string;
  is_main: boolean;
  uploaded_at: string;
  uploader_name?: string;
}

export interface MultipleUploadResult {
  uploaded: string[];
  errors: { filename: string; error: string }[];
  total_uploaded: number;
  total_errors: number;
}

/**
 * Получение списка остановок с фильтрами и пагинацией
 */
export async function getStops(filters?: StopsFilter): Promise<StopsResponse> {
  return apiGet<StopsResponse>('/stops', filters as Record<string, unknown>);
}

/**
 * FIX: Реализован /stops/all — backend endpoint добавлен
 * Используется для карты (все остановки без пагинации)
 */
export async function getAllStops(): Promise<BusStop[]> {
  return apiGet<BusStop[]>('/stops/all');
}

/**
 * Получение одной остановки по stop_id или числовому id
 */
export async function getStop(id: string): Promise<BusStop> {
  return apiGet<BusStop>(`/stops/${id}`);
}

/**
 * Создание остановки (admin или inspector)
 */
export async function createStop(data: Partial<BusStop>): Promise<BusStop> {
  return apiPost<BusStop>('/stops', data);
}

/**
 * Обновление остановки
 */
export async function updateStop(id: string, data: Partial<BusStop>): Promise<BusStop> {
  return apiPut<BusStop>(`/stops/${id}`, data);
}

export async function updateCustomFieldValues(stopId: string, values: { field_id: number; value: string | null }[]): Promise<void> {
  return apiPut<void>(`/stops/${stopId}/custom-fields`, values);
}

/**
 * Удаление остановки (только admin)
 */
export async function deleteStop(id: string): Promise<void> {
  return apiDelete(`/stops/${id}`);
}

/**
 * Статистика по остановкам
 */
export async function getStopStats(): Promise<StopStats> {
  return apiGet<StopStats>('/stops/stats');
}

/**
 * FIX: История изменений — backend endpoint /{stop_id}/history добавлен
 */
export async function getStopHistory(id: string): Promise<ChangeLogEntry[]> {
  return apiGet<ChangeLogEntry[]>(`/stops/${id}/history`);
}

/**
 * Фиксация инспекции
 */
export async function recordInspection(
  stopId: string,
  nextInspectionDate?: string
): Promise<void> {
  return apiPost(`/stops/${stopId}/inspection`, { next_inspection_date: nextInspectionDate });
}

/**
 * Загрузка фото остановки
 */
export async function uploadStopPhoto(
  stopId: string,
  file: File,
  isMain = false,
  onProgress?: (percent: number) => void
): Promise<PhotoResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('is_main', String(isMain));
  return apiUpload<PhotoResponse>(`/photos/upload/${stopId}`, formData, onProgress);
}

/**
 * Массовая загрузка фото для остановки (ТЗ 2.2.2)
 * Использует backend endpoint POST /photos/upload/{stop_id}/multiple
 */
export async function uploadMultipleStopPhotos(
  stopId: string,
  files: File[],
  onProgress?: (percent: number) => void
): Promise<MultipleUploadResult> {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  return apiUpload<MultipleUploadResult>(`/photos/upload/${stopId}/multiple`, formData, onProgress);
}

/**
 * Удаление фото
 */
export async function deleteStopPhoto(photoId: number): Promise<void> {
  return apiDelete(`/photos/${photoId}`);
}

/**
 * FIX: Установка главного фото через правильный backend endpoint
 * Backend: PUT /photos/{photo_id}/set-main (не POST /stops/{id}/main-photo)
 */
export async function setMainPhoto(photoId: number): Promise<void> {
  return apiPut(`/photos/${photoId}/set-main`, {});
}

/**
 * Импорт остановок из Excel/CSV (ТЗ 6)
 */
export async function importStops(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ imported: number; errors: string[] }> {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload('/stops/import', formData, onProgress);
}

/**
 * Получить районы
 */
export async function getDistricts(): Promise<string[]> {
  const result = await apiGet<{ districts: string[] }>('/stops/districts');
  return result.districts;
}
