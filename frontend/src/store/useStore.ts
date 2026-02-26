/**
 * Zustand Store
 * FIX: Подключён к реальному backend API (убран mockData)
 */
import { create } from 'zustand';
import { BusStop, User, StopStatus, ConditionLevel } from '../types';
import { login as apiLogin, logout as apiLogout, getCurrentUser } from '../api/auth';
import { getAllStops, deleteStop as apiDeleteStop } from '../api/stops';
import { isAuthenticated, clearTokens } from '../api/client';
import {
  getUsers as apiGetUsers,
  createUser as apiCreateUser,
  updateUser as apiUpdateUser,
  deleteUser as apiDeleteUser,
  type CreateUserRequest,
  type UpdateUserRequest,
} from '../api/users';

interface Filters {
  search: string;
  district: string;
  status: StopStatus | '';
  condition: ConditionLevel | '';
}

type Page = 'map' | 'list' | 'dashboard' | 'stop-detail' | 'login' | 'admin' | 'reports' | 'help';

interface AppState {
  currentUser: User | null;
  stops: BusStop[];
  users: User[];
  usersTotal: number;
  filters: Filters;
  currentPage: Page;
  selectedStopId: string | null;
  sidebarOpen: boolean;
  darkMode: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;

  setFilters: (f: Partial<Filters>) => void;
  resetFilters: () => void;
  setPage: (page: Page) => void;
  selectStop: (id: string | null) => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  toggleDarkMode: () => void;

  loadStops: () => Promise<void>;
  updateStop: (id: string, updates: Partial<BusStop>) => void;
  removeStop: (id: string) => Promise<void>;
  getFilteredStops: () => BusStop[];
  setError: (message: string | null) => void;

  loadUsers: () => Promise<void>;
  addUser: (payload: CreateUserRequest) => Promise<void>;
  updateUser: (id: string, updates: UpdateUserRequest) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

const defaultFilters: Filters = { search: '', district: '', status: '', condition: '' };

export const useStore = create<AppState>((set, get) => ({
  currentUser: null,
  stops: [],
  users: [],
  usersTotal: 0,
  filters: defaultFilters,
  currentPage: 'login',
  selectedStopId: null,
  sidebarOpen: false,
  darkMode: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiLogin({ email, password });
      const user: User = {
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
        role: response.user.role,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      set({ currentUser: user, currentPage: 'dashboard', isLoading: false });
      get().loadStops();
      return true;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      set({ error: e?.response?.data?.detail || 'Ошибка входа', isLoading: false });
      return false;
    }
  },

  logout: async () => {
    try { await apiLogout(); } finally {
      clearTokens();
      set({ currentUser: null, currentPage: 'login', selectedStopId: null, stops: [] });
    }
  },

  checkAuth: async () => {
    if (!isAuthenticated()) { set({ currentPage: 'login' }); return; }
    try {
      const user = await getCurrentUser();
      set({ currentUser: user as unknown as User, currentPage: 'dashboard' });
      get().loadStops();
    } catch {
      clearTokens();
      set({ currentPage: 'login' });
    }
  },

  loadStops: async () => {
    set({ isLoading: true });
    try {
      const stops = await getAllStops();
      set({ stops, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setFilters: (f) => set(state => ({ filters: { ...state.filters, ...f } })),
  resetFilters: () => set({ filters: defaultFilters }),

  setPage: (page) => set(state => {
    // Guard: только admin имеет доступ к admin-панели
    if (page === 'admin' && state.currentUser?.role !== 'admin') {
      return { error: 'У вас нет прав для доступа к разделу Администрирование' };
    }
    return { currentPage: page, error: null };
  }),
  selectStop: (id) => set({ selectedStopId: id, currentPage: id ? 'stop-detail' : get().currentPage }),

  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),
  toggleDarkMode: () => set(state => ({ darkMode: !state.darkMode })),

  updateStop: (id, updates) => set(state => ({
    stops: state.stops.map(s => (s.stop_id === id || String(s.id) === id) ? { ...s, ...updates } : s),
  })),

  removeStop: async (id) => {
    try {
      await apiDeleteStop(id);
      set(state => ({
        stops: state.stops.filter(s => s.stop_id !== id && String(s.id) !== id),
        selectedStopId: null,
      }));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      set({ error: e?.response?.data?.detail || 'Не удалось удалить остановку' });
    }
  },

  getFilteredStops: () => {
    const { stops, filters } = get();
    return stops.filter(s => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!s.stop_id?.toLowerCase().includes(q) &&
            !s.address?.toLowerCase().includes(q) &&
            !s.district?.toLowerCase().includes(q) &&
            !s.landmark?.toLowerCase().includes(q)) return false;
      }
      if (filters.district && s.district !== filters.district) return false;
      if (filters.status && s.status !== filters.status) return false;
      if (filters.condition && s.condition !== filters.condition) return false;
      return true;
    });
  },

  setError: (message) => set({ error: message }),

  loadUsers: async () => {
    set({ isLoading: true });
    try {
      const res = await apiGetUsers();
      set({
        users: res.users as unknown as User[],
        usersTotal: res.total,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  addUser: async (payload) => {
    set({ isLoading: true });
    try {
      const created = await apiCreateUser(payload);
      set(state => ({
        users: [created as unknown as User, ...state.users],
        usersTotal: state.usersTotal + 1,
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false });
    }
  },

  updateUser: async (id, updates) => {
    set({ isLoading: true });
    try {
      const updated = await apiUpdateUser(id, updates);
      set(state => ({
        users: state.users.map(u => (String(u.id) === String(id) ? (updated as unknown as User) : u)),
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false });
    }
  },

  deleteUser: async (id) => {
    set({ isLoading: true });
    try {
      await apiDeleteUser(id);
      set(state => ({
        users: state.users.filter(u => String(u.id) !== String(id)),
        usersTotal: Math.max(0, state.usersTotal - 1),
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false });
    }
  },
}));
