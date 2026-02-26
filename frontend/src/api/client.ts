/**
 * API Client с полной поддержкой JWT + Refresh Token
 * Автоматическое обновление токенов и обработка ошибок
 */
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse, AxiosProgressEvent } from 'axios';

// Типы
interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    status_code: number;
    details?: unknown;
    request_id?: string;
  };
}

// Константы
const API_URL = (import.meta as unknown as { env: { VITE_API_URL?: string } }).env?.VITE_API_URL || '/api';
const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_EXPIRY_KEY = 'token_expiry';

// Флаг для предотвращения множественных refresh запросов
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

/**
 * Добавляет подписчика на обновление токена
 */
function subscribeTokenRefresh(callback: (token: string) => void): void {
  refreshSubscribers.push(callback);
}

/**
 * Уведомляет всех подписчиков о новом токене
 */
function onTokenRefreshed(token: string): void {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
}

/**
 * Сохраняет токены в sessionStorage
 */
export function saveTokens(tokens: TokenPair): void {
  sessionStorage.setItem(TOKEN_KEY, tokens.access_token);
  sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  
  // Сохраняем время истечения (текущее время + expires_in секунд)
  const expiry = Date.now() + (tokens.expires_in * 1000);
  sessionStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
}

/**
 * Получает access token
 */
export function getAccessToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

/**
 * Получает refresh token
 */
export function getRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Проверяет истёк ли токен
 */
export function isTokenExpired(): boolean {
  const expiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!expiry) return true;
  
  // Считаем истёкшим за 60 секунд до реального истечения
  return Date.now() > (parseInt(expiry) - 60000);
}

/**
 * Очищает все токены
 */
export function clearTokens(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
}

/**
 * Проверяет авторизован ли пользователь
 */
export function isAuthenticated(): boolean {
  const token = getAccessToken();
  const refreshToken = getRefreshToken();
  return !!(token || refreshToken);
}

/**
 * Обновляет access token используя refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await axios.post<TokenPair>(`${API_URL}/auth/refresh`, {
    refresh_token: refreshToken,
  });
  
  const tokens: TokenPair = response.data;
  saveTokens(tokens);
  
  return tokens.access_token;
}

/**
 * Создаёт axios instance с interceptors
 */
function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // ============== REQUEST INTERCEPTOR ==============
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      // Пропускаем для refresh и login запросов
      const isAuthEndpoint = config.url?.includes('/auth/login') || 
                             config.url?.includes('/auth/refresh');
      
      if (!isAuthEndpoint) {
        let token = getAccessToken();
        
        // Если токен истёк - пробуем обновить
        if (token && isTokenExpired()) {
          const refreshTokenValue = getRefreshToken();
          if (refreshTokenValue) {
            try {
              token = await refreshAccessToken(refreshTokenValue);
            } catch {
              // Если не удалось обновить - очищаем и редиректим на login
              clearTokens();
              window.location.href = '/login';
              return Promise.reject(new Error('Session expired'));
            }
          }
        }
        
        // Добавляем токен в заголовок
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      
      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );

  // ============== RESPONSE INTERCEPTOR ==============
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      // Успешный ответ - просто возвращаем
      return response;
    },
    async (error: AxiosError<ApiError>) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
      
      // Если ошибка 401 и это не retry запрос
      if (error.response?.status === 401 && !originalRequest._retry) {
        const errorCode = error.response.data?.error?.code;
        
        // Если токен истёк - пробуем обновить
        if (errorCode === 'TOKEN_EXPIRED' || errorCode === 'INVALID_TOKEN') {
          const refreshTokenValue = getRefreshToken();
          
          if (refreshTokenValue) {
            // Если уже идёт refresh - ждём его завершения
            if (isRefreshing) {
              return new Promise((resolve) => {
                subscribeTokenRefresh((token: string) => {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                  resolve(client(originalRequest));
                });
              });
            }
            
            originalRequest._retry = true;
            isRefreshing = true;
            
            try {
              const newToken = await refreshAccessToken(refreshTokenValue);
              onTokenRefreshed(newToken);
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return client(originalRequest);
            } catch {
              clearTokens();
              window.location.href = '/login';
              return Promise.reject(error);
            } finally {
              isRefreshing = false;
            }
          }
        }
        
        // Для других 401 ошибок - редирект на login
        clearTokens();
        window.location.href = '/login';
      }
      
      // Обработка других ошибок
      const errorMessage = error.response?.data?.error?.message || 
                          error.message || 
                          'Произошла ошибка';
      
      // Можно добавить toast уведомление
      console.error('API Error:', errorMessage);
      
      return Promise.reject(error);
    }
  );

  return client;
}

// Экспортируем готовый клиент
export const api = createApiClient();

// Хелперы для типичных запросов
export const apiGet = <T>(url: string, params?: Record<string, unknown>): Promise<T> => 
  api.get<T>(url, { params }).then((res: AxiosResponse<T>) => res.data);

export const apiPost = <T>(url: string, data?: unknown): Promise<T> => 
  api.post<T>(url, data).then((res: AxiosResponse<T>) => res.data);

export const apiPut = <T>(url: string, data?: unknown): Promise<T> => 
  api.put<T>(url, data).then((res: AxiosResponse<T>) => res.data);

export const apiPatch = <T>(url: string, data?: unknown): Promise<T> => 
  api.patch<T>(url, data).then((res: AxiosResponse<T>) => res.data);

export const apiDelete = <T>(url: string): Promise<T> => 
  api.delete<T>(url).then((res: AxiosResponse<T>) => res.data);

// Upload файлов
export const apiUpload = <T>(
  url: string, 
  formData: FormData, 
  onProgress?: (percent: number) => void
): Promise<T> => 
  api.post<T>(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent: AxiosProgressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  }).then((res: AxiosResponse<T>) => res.data);

export default api;
