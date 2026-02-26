/**
 * Reports API
 * Отчёты и аналитика
 */
import { api, apiGet } from './client';

export interface DashboardStats {
  total_stops: number;
  active: number;
  repair: number;
  dismantled: number;
  unavailable: number;
  condition_excellent: number;
  condition_satisfactory: number;
  condition_needs_repair: number;
  condition_critical: number;
  inspected_this_month: number;
  by_district: { name: string; count: number }[];
  recent_changes: {
    id: string;
    stop_id: string;
    stop_address: string;
    action: string;
    user_name: string;
    timestamp: string;
  }[];
  needs_attention: {
    id: string;
    address: string;
    condition: string;
    last_inspection: string;
  }[];
}

export interface ReportFilter {
  type: 'status' | 'condition' | 'district' | 'repair';
  district?: string;
  status?: string;
  condition?: string;
  date_from?: string;
  date_to?: string;
}

/**
 * Получение данных для дашборда
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  return apiGet<DashboardStats>('/reports/dashboard');
}

/**
 * Экспорт в Excel
 */
export async function exportToExcel(filters?: ReportFilter): Promise<Blob> {
  const response = await api.get('/reports/export', {
    params: { ...filters, format: 'xlsx' },
    responseType: 'blob',
  });
  return response.data;
}

/**
 * Экспорт в PDF
 */
export async function exportToPdf(filters?: ReportFilter): Promise<Blob> {
  const response = await api.get('/reports/export', {
    params: { ...filters, format: 'pdf' },
    responseType: 'blob',
  });
  return response.data;
}

/**
 * Скачивание файла
 */
export function downloadFile(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Экспорт и скачивание Excel
 */
export async function downloadExcelReport(filters?: ReportFilter) {
  const blob = await exportToExcel(filters);
  const date = new Date().toISOString().split('T')[0];
  downloadFile(blob, `bus_stops_report_${date}.xlsx`);
}

/**
 * Экспорт и скачивание PDF
 */
export async function downloadPdfReport(filters?: ReportFilter) {
  const blob = await exportToPdf(filters);
  const date = new Date().toISOString().split('T')[0];
  downloadFile(blob, `bus_stops_report_${date}.pdf`);
}
