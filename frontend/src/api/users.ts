/**
 * Users API
 * Управление пользователями (только для админа)
 */
import { apiGet, apiPost, apiPut, apiDelete } from './client';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'inspector' | 'viewer';
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  role: 'admin' | 'inspector' | 'viewer';
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
  password?: string;
  role?: 'admin' | 'inspector' | 'viewer';
  is_active?: boolean;
}

export interface UsersListResponse {
  users: User[];
  total: number;
}

/**
 * Получение списка пользователей
 */
export async function getUsers(): Promise<UsersListResponse> {
  return apiGet<UsersListResponse>('/users');
}

/**
 * Получение пользователя по ID
 */
export async function getUser(id: string): Promise<User> {
  return apiGet<User>(`/users/${id}`);
}

/**
 * Создание пользователя
 */
export async function createUser(data: CreateUserRequest): Promise<User> {
  return apiPost<User>('/users', data);
}

/**
 * Обновление пользователя
 */
export async function updateUser(id: string, data: UpdateUserRequest): Promise<User> {
  return apiPut<User>(`/users/${id}`, data);
}

/**
 * Удаление пользователя
 */
export async function deleteUser(id: string): Promise<void> {
  return apiDelete(`/users/${id}`);
}

/**
 * Сброс пароля пользователя (генерирует временный пароль)
 */
export async function resetUserPassword(id: string): Promise<{ temporary_password: string }> {
  return apiPost(`/users/${id}/reset-password`);
}
