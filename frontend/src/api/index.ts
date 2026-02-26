/**
 * API Module
 * Экспорт всех API функций
 */

// Client
export { 
  api as default,
  api,
  apiGet, 
  apiPost, 
  apiPut, 
  apiPatch, 
  apiDelete,
  apiUpload,
  saveTokens,
  getAccessToken,
  getRefreshToken,
  clearTokens,
  isAuthenticated,
  isTokenExpired,
} from './client';

// Auth
export {
  login,
  logout,
  getCurrentUser,
  changePassword,
  updateProfile,
} from './auth';

// Stops
export {
  getStops,
  getAllStops,
  getStop,
  createStop,
  updateStop,
  deleteStop,
  getStopStats,
  getStopHistory,
  uploadStopPhoto,
  deleteStopPhoto,
  setMainPhoto,
  importStops,
} from './stops';

// Users
export {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
} from './users';

// Reports
export {
  getDashboardStats,
  exportToExcel,
  exportToPdf,
  downloadFile,
  downloadExcelReport,
  downloadPdfReport,
} from './reports';

// Types
export type { LoginRequest, LoginResponse, User } from './auth';
export type { StopsFilter, StopsResponse, StopStats } from './stops';
export type { CreateUserRequest, UpdateUserRequest } from './users';
export type { DashboardStats, ReportFilter } from './reports';
