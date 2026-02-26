import { useEffect, useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { UserRole } from '../types';
import {
  Users, Settings, Shield, Plus, Edit3, Trash2,
  Save, Eye, Wrench as WrenchIcon, X
} from 'lucide-react';
import { cn } from '../utils/cn';
import { CustomSelect, SelectOption } from './CustomSelect';
import { importStops } from '../api/stops';
import {
  getDistrictsDirectory,
  createDistrict,
  updateDistrict,
  deleteDistrict,
  getRoutesDirectory,
  createRoute,
  updateRoute,
  deleteRoute,
  type DistrictDto,
  type RouteDto,
} from '../api/directories';

type Tab = 'users' | 'directories' | 'permissions' | 'data';

const roleLabels: Record<UserRole, string> = {
  admin: 'Администратор',
  inspector: 'Инспектор',
  viewer: 'Просмотр',
};

const roleIcons: Record<UserRole, React.ElementType> = {
  admin: Shield,
  inspector: WrenchIcon,
  viewer: Eye,
};

const roleColors: Record<UserRole, { bg: string; text: string; badge: string; darkBg: string; darkText: string; darkBadge: string }> = {
  admin: { bg: 'bg-purple-100', text: 'text-purple-600', badge: 'bg-purple-100 text-purple-700', darkBg: 'bg-purple-500/20', darkText: 'text-purple-400', darkBadge: 'bg-purple-500/20 text-purple-300' },
  inspector: { bg: 'bg-blue-100', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', darkBg: 'bg-blue-500/20', darkText: 'text-blue-400', darkBadge: 'bg-blue-500/20 text-blue-300' },
  viewer: { bg: 'bg-gray-100', text: 'text-gray-600', badge: 'bg-gray-100 text-gray-700', darkBg: 'bg-gray-600/40', darkText: 'text-gray-400', darkBadge: 'bg-gray-600/40 text-gray-300' },
};

function ImportStopsBlock() {
  const dm = useStore(s => s.darkMode);
  const setError = useStore(s => s.setError);
  const [fileName, setFileName] = useState<string>('');
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sub = dm ? 'text-gray-400' : 'text-gray-500';

  const handleSelectFile = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setProgress(0);
    setResult(null);
    try {
      const res = await importStops(file, p => setProgress(p));
      setResult(res);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Не удалось импортировать остановки. Проверьте формат файла.');
    } finally {
      setProgress(null);
      e.target.value = '';
    }
  };

  return (
    <div>
      <div
        className={cn(
          'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors',
          dm ? 'border-gray-600/60 hover:border-blue-500/60' : 'border-gray-300 hover:border-blue-400'
        )}
        onClick={handleSelectFile}
      >
        <Settings className={cn('w-10 h-10 mx-auto mb-3', sub)} />
        <p className={cn('text-sm mb-2', sub)}>
          {fileName || 'Перетащите файл сюда или нажмите, чтобы выбрать'}
        </p>
        {progress !== null && (
          <p className={cn('text-xs mb-2', sub)}>Загрузка: {progress}%</p>
        )}
        <button
          type="button"
          className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all"
        >
          Выбрать файл
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      <p className={cn('text-xs mt-3', sub)}>Поддерживается: .xlsx, .csv</p>
      {result && (
        <div className={cn('mt-3 rounded-xl border px-3 py-2 text-xs', dm ? 'border-green-500/40 text-green-300' : 'border-green-200 text-green-700')}>
          <div>Импортировано остановок: {result.imported}</div>
          {result.errors.length > 0 && (
            <div className="mt-1">
              Ошибки (первые 3):
              <ul className="list-disc list-inside">
                {result.errors.slice(0, 3).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminPanel() {
  const { users, addUser, updateUser, deleteUser, currentUser, darkMode, loadUsers } = useStore();
  const dm = darkMode;

  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'viewer' as UserRole, password: '' });
  const [editForm, setEditForm] = useState<{ name: string; email: string; password: string; role: UserRole } | null>(null);
  const [directoriesLoading, setDirectoriesLoading] = useState(false);
  const [dirError, setDirError] = useState<string | null>(null);
  const [districts, setDistricts] = useState<DistrictDto[]>([]);
  const [routes, setRoutes] = useState<RouteDto[]>([]);
  const [newDistrict, setNewDistrict] = useState<{ name: string; is_active: boolean }>({ name: '', is_active: true });
  const [newRoute, setNewRoute] = useState<{ number: string; name: string; is_active: boolean }>({ number: '', name: '', is_active: true });
  const tabs: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: 'users', label: 'Пользователи', icon: Users },
    { id: 'directories', label: 'Справочники', icon: Settings },
    { id: 'permissions', label: 'Права доступа', icon: Shield },
    { id: 'data', label: 'Данные', icon: Settings },
  ];


  console.log(routes)

  useEffect(() => {
    if (activeTab !== 'users') return;
    loadUsers();
  }, [activeTab, loadUsers]);

  useEffect(() => {
    if (activeTab !== 'directories') return;
    const load = async () => {
      setDirectoriesLoading(true);
      setDirError(null);
      try {
        const [d, r] = await Promise.all([
          getDistrictsDirectory(),
          getRoutesDirectory(),
        ]);
        setDistricts(d);
        setRoutes(r);
      } catch (e) {
        console.error(e);
        setDirError('Не удалось загрузить справочники');
      } finally {
        setDirectoriesLoading(false);
      }
    };
    load();
  }, [activeTab]);

  const startEdit = (userId: string) => {
    const u = users.find(x => x.id === userId);
    if (!u) return;
    setEditForm({ name: u.name, email: u.email, password: '', role: u.role });
    setEditingUserId(userId);
  };

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email || !newUser.password) { alert('Заполните все поля'); return; }
    if (newUser.password.length < 6) { alert('Пароль минимум 6 символов'); return; }
    addUser(newUser);
    setNewUser({ name: '', email: '', role: 'viewer', password: '' });
    setShowAddUser(false);
  };

  const handleSaveEdit = (userId: string) => {
    if (!editForm) return;
    if (editForm.password && editForm.password.length < 6) { alert('Пароль минимум 6 символов'); return; }
    const updates: Parameters<typeof updateUser>[1] = {
      name: editForm.name,
      email: editForm.email,
      role: editForm.role,
    };
    if (editForm.password) updates.password = editForm.password;
    updateUser(userId, updates);
    setEditingUserId(null);
    setEditForm(null);
  };

  const handleDelete = (userId: string) => {
    if (userId === currentUser?.id) { alert('Нельзя удалить себя'); return; }
    if (confirm('Удалить пользователя?')) deleteUser(userId);
  };

  // ── theme shortcuts ──
  const page = dm ? 'bg-gray-950' : 'bg-gray-50';
  const card = dm ? 'bg-gray-800/80 border-gray-700/60' : 'bg-white border-gray-200';
  const head = dm ? 'text-gray-100' : 'text-gray-900';
  const sub = dm ? 'text-gray-400' : 'text-gray-500';
  const tabBar = dm ? 'bg-gray-900 border-gray-700/60' : 'bg-white border-gray-200';
  const inp = cn(
    'w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-all',
    dm
      ? 'bg-gray-700/80 border-gray-600/60 text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
      : 'bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
  );
  const cancelBtn = cn(
    'px-4 py-2.5 border rounded-xl text-sm font-semibold transition-colors',
    dm ? 'border-gray-600/60 text-gray-300 hover:bg-gray-700/50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
  );

  return (
    <div className={cn('h-full flex flex-col overflow-hidden transition-colors duration-300', page)}>

      {/* ── Tabs ── */}
      <div className={cn('border-b flex-shrink-0 overflow-x-auto', tabBar)}>
        <div className="flex gap-0 min-w-max px-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-all',
                  active
                    ? 'border-blue-500 text-blue-600'
                    : dm
                      ? 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-6">

        {/* ── USERS ── */}
        {activeTab === 'users' && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className={cn('text-xl font-bold', head)}>Управление пользователями</h2>
                <p className={cn('text-sm mt-1', sub)}>Всего: {(users ?? []).length} пользователей</p>
              </div>
              <button
                onClick={() => setShowAddUser(v => !v)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all text-sm"
              >
                <Plus className="w-4 h-4" /> Добавить
              </button>
            </div>

            {/* Add User Form */}
            {showAddUser && (
              <div className={cn('rounded-2xl border p-5 mb-6 relative z-30 overflow-visible', card)}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={cn('font-bold', head)}>Новый пользователь</h3>
                  <button onClick={() => setShowAddUser(false)} className={cn('p-1.5 rounded-lg transition-colors', dm ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100')}>
                    <X className={cn('w-4 h-4', sub)} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className={cn('block text-xs font-semibold mb-1.5', sub)}>ФИО *</label>
                    <input type="text" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} placeholder="Иван Иванов" className={inp} />
                  </div>
                  <div>
                    <label className={cn('block text-xs font-semibold mb-1.5', sub)}>Email / Логин *</label>
                    <input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="user@jcdecaux.uz" className={inp} />
                  </div>
                  <div>
                    <label className={cn('block text-xs font-semibold mb-1.5', sub)}>Пароль * <span className={cn('font-normal', sub)}>(мин. 6 символов)</span></label>
                    <input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder="••••••" className={inp} />
                  </div>
                  <div>
                    <label className={cn('block text-xs font-semibold mb-1.5', sub)}>Роль *</label>
                    <CustomSelect
                      value={newUser.role}
                      onChange={v => setNewUser({ ...newUser, role: v as UserRole })}
                      options={Object.entries(roleLabels).map(([k, v]) => ({ value: k, label: v })) as SelectOption[]}
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowAddUser(false)} className={cancelBtn}>Отмена</button>
                  <button onClick={handleAddUser} className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:from-green-600 hover:to-emerald-700 transition-all">
                    Создать пользователя
                  </button>
                </div>
              </div>
            )}

            {/* Users List */}
            <div className="space-y-3">
              {(users ?? []).map(user => {
                const Icon = roleIcons[user.role];
                const colors = roleColors[user.role];
                const isEditing = editingUserId === user.id;

                return (
                  <div key={user.id} className={cn('rounded-2xl border overflow-visible transition-all', card)}>
                    {isEditing && editForm ? (
                      <div className="p-5 relative z-20">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', dm ? colors.darkBg : colors.bg)}>
                              <Icon className={cn('w-5 h-5', dm ? colors.darkText : colors.text)} />
                            </div>
                            <h3 className={cn('font-bold', head)}>Редактирование</h3>
                          </div>
                          <button onClick={() => { setEditingUserId(null); setEditForm(null); }} className={cn('p-1.5 rounded-lg transition-colors', dm ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100')}>
                            <X className={cn('w-4 h-4', sub)} />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className={cn('block text-xs font-semibold mb-1.5', sub)}>ФИО</label>
                            <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className={inp} />
                          </div>
                          <div>
                            <label className={cn('block text-xs font-semibold mb-1.5', sub)}>Email / Логин</label>
                            <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className={inp} />
                          </div>
                          <div>
                            <label className={cn('block text-xs font-semibold mb-1.5', sub)}>
                              Новый пароль <span className={cn('font-normal', sub)}>(пусто = не менять)</span>
                            </label>
                            <input type="password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} placeholder="Введите новый пароль" className={inp} />
                          </div>
                          <div>
                            <label className={cn('block text-xs font-semibold mb-1.5', sub)}>Роль</label>
                            <CustomSelect
                              value={editForm.role}
                              onChange={v => setEditForm({ ...editForm, role: v as UserRole })}
                              options={Object.entries(roleLabels).map(([k, v]) => ({ value: k, label: v })) as SelectOption[]}
                            />
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => { setEditingUserId(null); setEditForm(null); }} className={cancelBtn}>Отмена</button>
                          <button onClick={() => handleSaveEdit(user.id)} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:from-green-600 hover:to-emerald-700 transition-all">
                            <Save className="w-4 h-4" /> Сохранить
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', dm ? colors.darkBg : colors.bg)}>
                            <Icon className={cn('w-6 h-6', dm ? colors.darkText : colors.text)} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn('font-bold truncate', head)}>{user.name}</span>
                              {user.id === currentUser?.id && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">Вы</span>
                              )}
                            </div>
                            <div className={cn('text-sm truncate mt-0.5', sub)}>{user.email}</div>
                            <span className={cn('inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold', dm ? colors.darkBadge : colors.badge)}>
                              {roleLabels[user.role]}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => startEdit(user.id)}
                            className={cn('p-2.5 rounded-xl transition-colors', dm ? 'text-gray-500 hover:text-blue-400 hover:bg-blue-500/10' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50')}
                            title="Редактировать"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            disabled={user.id === currentUser?.id}
                            className={cn(
                              'p-2.5 rounded-xl transition-colors',
                              user.id === currentUser?.id
                                ? dm ? 'text-gray-700 cursor-not-allowed' : 'text-gray-300 cursor-not-allowed'
                                : dm ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                            )}
                            title={user.id === currentUser?.id ? 'Нельзя удалить себя' : 'Удалить'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── DIRECTORIES ── */}
        {activeTab === 'directories' && (
          <div className="max-w-5xl mx-auto space-y-7 mb-6">
            {dirError && (
              <div className={cn('rounded-2xl border px-4 py-3 text-sm', dm ? 'bg-red-500/10 border-red-500/40 text-red-300' : 'bg-red-50 border-red-200 text-red-700')}>
                {dirError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Districts */}
              <div className={cn('rounded-2xl border p-5 space-y-4', card)}>
                <div className="flex items-center justify-between">
                  <h3 className={cn('font-bold text-lg', head)}>Районы</h3>
                  <span className={cn('text-xs px-2.5 py-1 rounded-full', dm ? 'bg-gray-700/60 text-gray-300' : 'bg-gray-100 text-gray-600')}>
                    {districts.length} шт.
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Новый район..."
                      value={newDistrict.name}
                      onChange={e => setNewDistrict({ ...newDistrict, name: e.target.value })}
                      className={inp}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newDistrict.name.trim()) return;
                        try {
                          const created = await createDistrict({ name: newDistrict.name.trim(), is_active: newDistrict.is_active });
                          setDistricts(prev => [...prev, created]);
                          setNewDistrict({ name: '', is_active: true });
                        } catch (e) {
                          console.error(e);
                          setDirError('Не удалось создать район');
                        }
                      }}
                      className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all"
                    >
                      Добавить
                    </button>
                  </div>
                  <label className={cn('flex items-center gap-2 text-xs cursor-pointer', sub)}>
                    <input
                      type="checkbox"
                      checked={newDistrict.is_active}
                      onChange={e => setNewDistrict(prev => ({ ...prev, is_active: e.target.checked }))}
                    />
                    Активен по умолчанию
                  </label>
                </div>

                <div className="mt-4 space-y-2 max-h-72 overflow-y-auto">
                  {districts.map(d => (
                    <div
                      key={d.id}
                      className={cn(
                        'flex items-center justify-between gap-3 px-3 py-2 rounded-xl border text-sm',
                        d.is_active
                          ? dm ? 'border-green-500/30 bg-green-500/5 text-gray-100' : 'border-green-200 bg-green-50 text-gray-800'
                          : dm ? 'border-gray-700/60 bg-gray-800/60 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'
                      )}
                    >
                      <input
                        type="text"
                        value={d.name}
                        onChange={e => {
                          const name = e.target.value;
                          setDistricts(prev => prev.map(x => x.id === d.id ? { ...x, name } : x));
                        }}
                        onBlur={async e => {
                          const name = e.target.value.trim();
                          if (!name || name === d.name) return;
                          try {
                            const updated = await updateDistrict(d.id, { name });
                            setDistricts(prev => prev.map(x => x.id === d.id ? updated : x));
                          } catch (err) {
                            console.error(err);
                            setDirError('Не удалось обновить район');
                          }
                        }}
                        className={cn(
                          'flex-1 bg-transparent border-none outline-none text-sm',
                          dm ? 'text-gray-100 placeholder-gray-500' : 'text-gray-800 placeholder-gray-400'
                        )}
                      />
                      <label className="flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={d.is_active}
                          onChange={async e => {
                            const is_active = e.target.checked;
                            try {
                              const updated = await updateDistrict(d.id, { is_active });
                              setDistricts(prev => prev.map(x => x.id === d.id ? updated : x));
                            } catch (err) {
                              console.error(err);
                              setDirError('Не удалось обновить статус района');
                            }
                          }}
                        />
                        <span>{d.is_active ? 'Активен' : 'Скрыт'}</span>
                      </label>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm('Удалить район?')) return;
                          try {
                            await deleteDistrict(d.id);
                            setDistricts(prev => prev.filter(x => x.id !== d.id));
                          } catch (err) {
                            console.error(err);
                            setDirError('Не удалось удалить район');
                          }
                        }}
                        className={cn(
                          'p-1.5 rounded-lg',
                          dm ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                        )}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {districts.length === 0 && !directoriesLoading && (
                    <p className={cn('text-xs text-center py-4', sub)}>Пока нет ни одного района</p>
                  )}
                </div>
              </div>

              {/* Routes */}
              <div className={cn('rounded-2xl border p-5 space-y-4', card)}>
                <div className="flex items-center justify-between">
                  <h3 className={cn('font-bold text-lg', head)}>Маршруты</h3>
                  <span className={cn('text-xs px-2.5 py-1 rounded-full', dm ? 'bg-gray-700/60 text-gray-300' : 'bg-gray-100 text-gray-600')}>
                    {routes.length} шт.
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_auto] gap-2">
                    <input
                      type="text"
                      placeholder="Номер"
                      value={newRoute.number}
                      onChange={e => setNewRoute(prev => ({ ...prev, number: e.target.value }))}
                      className={inp}
                    />
                    <input
                      type="text"
                      placeholder="Название (опционально)"
                      value={newRoute.name}
                      onChange={e => setNewRoute(prev => ({ ...prev, name: e.target.value }))}
                      className={inp}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newRoute.number.trim()) return;
                        try {
                          const created = await createRoute({
                            number: newRoute.number.trim(),
                            name: newRoute.name.trim() || undefined,
                            is_active: newRoute.is_active,
                          });
                          setRoutes(prev => [...prev, created]);
                          setNewRoute({ number: '', name: '', is_active: true });
                        } catch (err) {
                          console.error(err);
                          setDirError('Не удалось создать маршрут');
                        }
                      }}
                      className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all"
                    >
                      Добавить
                    </button>
                  </div>
                  <label className={cn('flex items-center gap-2 text-xs cursor-pointer', sub)}>
                    <input
                      type="checkbox"
                      checked={newRoute.is_active}
                      onChange={e => setNewRoute(prev => ({ ...prev, is_active: e.target.checked }))}
                    />
                    Активен по умолчанию
                  </label>
                </div>

                <div className="mt-4 space-y-2 max-h-72 overflow-y-auto">
                  {routes.map(r => (
                    <div
                      key={r.id}
                      className={cn(
                        'flex items-center justify-between gap-3 px-3 py-2 rounded-xl border text-sm',
                        r.is_active
                          ? dm ? 'border-blue-500/30 bg-blue-500/5 text-gray-100' : 'border-blue-200 bg-blue-50 text-gray-800'
                          : dm ? 'border-gray-700/60 bg-gray-800/60 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'
                      )}
                    >
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={r.number}
                          onChange={e => {
                            const number = e.target.value;
                            setRoutes(prev => prev.map(x => x.id === r.id ? { ...x, number } : x));
                          }}
                          onBlur={async e => {
                            const number = e.target.value.trim();
                            if (!number || number === r.number) return;
                            try {
                              const updated = await updateRoute(r.id, { number });
                              setRoutes(prev => prev.map(x => x.id === r.id ? updated : x));
                            } catch (err) {
                              console.error(err);
                              setDirError('Не удалось обновить маршрут');
                            }
                          }}
                          className={cn(
                            'w-20 bg-transparent border-none outline-none text-sm font-mono',
                            dm ? 'text-gray-100 placeholder-gray-500' : 'text-gray-800 placeholder-gray-400'
                          )}
                        />
                        <input
                          type="text"
                          value={r.name || ''}
                          onChange={e => {
                            const name = e.target.value;
                            setRoutes(prev => prev.map(x => x.id === r.id ? { ...x, name } : x));
                          }}
                          onBlur={async e => {
                            const name = e.target.value.trim();
                            if (name === (r.name || '')) return;
                            try {
                              const updated = await updateRoute(r.id, { name: name || null });
                              setRoutes(prev => prev.map(x => x.id === r.id ? updated : x));
                            } catch (err) {
                              console.error(err);
                              setDirError('Не удалось обновить маршрут');
                            }
                          }}
                          className={cn(
                            'flex-1 bg-transparent border-none outline-none text-sm',
                            dm ? 'text-gray-100 placeholder-gray-500' : 'text-gray-800 placeholder-gray-400'
                          )}
                          placeholder="Название"
                        />
                      </div>
                      <label className="flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={r.is_active}
                          onChange={async e => {
                            const is_active = e.target.checked;
                            try {
                              const updated = await updateRoute(r.id, { is_active });
                              setRoutes(prev => prev.map(x => x.id === r.id ? updated : x));
                            } catch (err) {
                              console.error(err);
                              setDirError('Не удалось обновить статус маршрута');
                            }
                          }}
                        />
                        <span>{r.is_active ? 'Активен' : 'Скрыт'}</span>
                      </label>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm('Удалить маршрут?')) return;
                          try {
                            await deleteRoute(r.id);
                            setRoutes(prev => prev.filter(x => x.id !== r.id));
                          } catch (err) {
                            console.error(err);
                            setDirError('Не удалось удалить маршрут');
                          }
                        }}
                        className={cn(
                          'p-1.5 rounded-lg',
                          dm ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                        )}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {routes.length === 0 && !directoriesLoading && (
                    <p className={cn('text-xs text-center py-4', sub)}>Пока нет ни одного маршрута</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* ── PERMISSIONS ── */}
        {activeTab === 'permissions' && (
          <div className="max-w-4xl mx-auto">
            <h2 className={cn('text-xl font-bold mb-6', head)}>Права доступа по ролям</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  role: 'admin' as UserRole,
                  subtitle: 'Полный доступ',
                  perms: [
                    { label: 'Управление пользователями', ok: true },
                    { label: 'Настройка справочников', ok: true },
                    { label: 'Управление правами', ok: true },
                    { label: 'Все данные системы', ok: true },
                    { label: 'Редактирование карточек', ok: true },
                    { label: 'Загрузка фото', ok: true },
                    { label: 'Формирование отчётов', ok: true },
                  ],
                },
                {
                  role: 'inspector' as UserRole,
                  subtitle: 'Полевая работа',
                  perms: [
                    { label: 'Просмотр карты', ok: true },
                    { label: 'Редактирование карточек', ok: true },
                    { label: 'Загрузка фото', ok: true },
                    { label: 'Обновление состояния', ok: true },
                    { label: 'Управление пользователями', ok: false },
                    { label: 'Настройка справочников', ok: false },
                    { label: 'Управление системой', ok: false },
                  ],
                },
                {
                  role: 'viewer' as UserRole,
                  subtitle: 'Только чтение',
                  perms: [
                    { label: 'Просмотр карты', ok: true },
                    { label: 'Просмотр карточек', ok: true },
                    { label: 'Формирование отчётов', ok: true },
                    { label: 'Редактирование', ok: false },
                    { label: 'Загрузка фото', ok: false },
                    { label: 'Добавление остановок', ok: false },
                    { label: 'Управление системой', ok: false },
                  ],
                },
              ].map(({ role, subtitle, perms }) => {
                const Icon = roleIcons[role];
                const colors = roleColors[role];
                return (
                  <div key={role} className={cn('rounded-2xl border p-5', card)}>
                    <div className="flex items-center gap-3 mb-5">
                      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', dm ? colors.darkBg : colors.bg)}>
                        <Icon className={cn('w-6 h-6', dm ? colors.darkText : colors.text)} />
                      </div>
                      <div>
                        <h3 className={cn('font-bold', head)}>{roleLabels[role]}</h3>
                        <p className={cn('text-xs', sub)}>{subtitle}</p>
                      </div>
                    </div>
                    <ul className="space-y-2.5">
                      {perms.map((p, i) => (
                        <li key={i} className={cn(
                          'flex items-center gap-2.5 text-sm',
                          p.ok ? 'text-green-500' : dm ? 'text-gray-600' : 'text-gray-400'
                        )}>
                          <div className={cn('w-2 h-2 rounded-full flex-shrink-0', p.ok ? 'bg-green-500' : dm ? 'bg-gray-600' : 'bg-gray-300')} />
                          {p.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── DATA ── */}
        {activeTab === 'data' && (
          <div className="max-w-4xl mx-auto">
            <h2 className={cn('text-xl font-bold mb-6', head)}>Управление данными</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div className={cn('rounded-2xl border p-6', card)}>
                <h3 className={cn('font-bold mb-2', head)}>Импорт данных</h3>
                <p className={cn('text-sm mb-5', sub)}>Загрузите файл Excel/CSV для импорта остановок (ID, адрес, координаты, район и т.д.)</p>
                <ImportStopsBlock />
              </div>

              <div className={cn('rounded-2xl border p-6', card)}>
                <h3 className={cn('font-bold mb-2', head)}>Резервное копирование</h3>
                <p className={cn('text-sm mb-5', sub)}>Последнее копирование: сегодня, 03:00</p>
                <div className="space-y-3">
                  <button className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:from-green-600 hover:to-emerald-700 transition-all">
                    Создать резервную копию
                  </button>
                  <button className={cn(
                    'w-full px-4 py-3 border rounded-xl text-sm font-semibold transition-colors',
                    dm ? 'border-gray-600/60 text-gray-300 hover:bg-gray-700/50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  )}>
                    Восстановить из копии
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}



      </div>
    </div>
  );
}
