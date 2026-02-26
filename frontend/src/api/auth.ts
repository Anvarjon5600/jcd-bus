/**
 * Auth API
 * FIX: исправлен logout (backend требует RefreshTokenRequest, сделан опциональным)
 * FIX: LoginResponse включает user объект
 */
import { api, saveTokens, clearTokens, apiPost } from './client';
import { getRefreshToken } from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: {          // FIX: backend теперь возвращает user объект
    id: number;
    email: string;
    name: string;
    role: 'admin' | 'inspector' | 'viewer';
  };
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'inspector' | 'viewer';
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

/**
 * Вход в систему
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', credentials);

  saveTokens({
    access_token: response.data.access_token,
    refresh_token: response.data.refresh_token,
    token_type: response.data.token_type,
    expires_in: response.data.expires_in,
  });

  return response.data;
}

/**
 * Выход из системы
 * FIX: отправляем refresh_token если есть, но не падаем если нет
 */
export async function logout(): Promise<void> {
  try {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      await api.post('/auth/logout', { refresh_token: refreshToken });
    } else {
      await api.post('/auth/logout');
    }
  } catch {
    // logout должен работать даже при ошибке сети
  } finally {
    clearTokens();
  }
}

/**
 * Получение текущего пользователя
 */
export async function getCurrentUser(): Promise<User> {
  const response = await api.get<User>('/auth/me');
  return response.data;
}

/**
 * Выход из всех сессий
 */
export async function logoutAll(): Promise<void> {
  try {
    await api.post('/auth/logout-all');
  } finally {
    clearTokens();
  }
}

/**
 * Обновление профиля
 */
export async function updateProfile(data: { name?: string; email?: string }): Promise<User> {
  const response = await api.patch<User>('/auth/profile', data);
  return response.data;
}
