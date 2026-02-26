import { useStore } from '../store/useStore';
import { Menu, ChevronDown, Plus, LogOut, Settings, Bell, HelpCircle, Moon, Sun } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '../utils/cn';

const pageTitles: Record<string, string> = {
  dashboard: 'Дашборд',
  map: 'Карта остановок',
  list: 'Список остановок',
  'stop-detail': 'Карточка остановки',
  admin: 'Администрирование',
  reports: 'Отчёты',
};

const roleLabels: Record<string, string> = {
  admin: 'Администратор',
  inspector: 'Инспектор',
  viewer: 'Просмотр',
};

const roleColors: Record<string, string> = {
  admin: 'from-purple-500 to-indigo-600',
  inspector: 'from-blue-500 to-cyan-600',
  viewer: 'from-gray-400 to-gray-600',
};

const roleBadgeColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  inspector: 'bg-blue-100 text-blue-700 border-blue-200',
  viewer: 'bg-gray-100 text-gray-700 border-gray-200',
};

interface HeaderProps {
  onAddStop?: () => void;
}

export function Header({ onAddStop }: HeaderProps) {
  const { currentPage, toggleSidebar, currentUser, logout, setPage, darkMode, toggleDarkMode } = useStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const canAddStop = currentUser?.role === 'admin' || currentUser?.role === 'inspector';
  const role = currentUser?.role || 'viewer';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = currentUser?.name
    ? currentUser.name.split(' ').map(w => w[0]).slice(0, 2).join('')
    : '??';

  const dm = darkMode;

  return (
    <header className={cn(
      'h-16 border-b flex items-center justify-between px-4 gap-4 shadow-lg flex-shrink-0 transition-colors duration-300',
      dm
        ? 'bg-gray-900 border-gray-700/50'
        : 'bg-gradient-to-r from-slate-800 via-slate-800 to-slate-900 border-slate-700/50'
    )}>
      {/* Left: burger + title */}
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={toggleSidebar}
          className="lg:hidden text-slate-300 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-all"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="min-w-0">
          <h1 className="text-sm lg:text-base font-bold text-white truncate">
            {pageTitles[currentPage] || 'Система'}
          </h1>
          <p className="text-xs text-slate-400 hidden sm:block leading-none">
            Инвентаризация остановок г. Ташкент
          </p>
        </div>
      </div>

      {/* Right: actions + user */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Add Stop */}
        {canAddStop && onAddStop && (
          <button
            onClick={onAddStop}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold text-sm hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/20 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Добавить</span>
          </button>
        )}

        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-white/10 transition-all"
          >
            <div className={`w-9 h-9 bg-gradient-to-br ${roleColors[role]} rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg flex-shrink-0`}>
              {initials}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-sm font-semibold text-white leading-tight">{currentUser?.name}</div>
              <div className="text-xs text-slate-400">{roleLabels[role]}</div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className={cn(
              'absolute right-0 top-full mt-2 w-72 rounded-2xl border overflow-hidden z-50 animate-fadeIn',
              dm 
                ? 'bg-gray-800 border-gray-700/60' 
                : 'bg-white border-gray-100 shadow-2xl'
            )}>

              {/* Profile Header */}
              <div className={cn(
                'px-5 py-4 text-white',
                dm ? 'bg-gray-900' : 'bg-gradient-to-br from-slate-800 to-slate-900'
              )}>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 bg-gradient-to-br ${roleColors[role]} rounded-2xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0`}>
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-base truncate">{currentUser?.name}</div>
                    <div className="text-slate-400 text-xs truncate mt-0.5">{currentUser?.email}</div>
                    <span className={cn(
                      'inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border',
                      dm 
                        ? role === 'admin' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' 
                          : role === 'inspector' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          : 'bg-gray-600/40 text-gray-300 border-gray-500/30'
                        : roleBadgeColors[role]
                    )}>
                      {roleLabels[role]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                <div className="px-3 py-1">
                  <p className={cn('text-xs font-semibold uppercase tracking-wider px-2', dm ? 'text-gray-500' : 'text-gray-400')}>Быстрые действия</p>
                </div>

                {currentUser?.role === 'admin' && (
                  <button
                    onClick={() => { setDropdownOpen(false); setPage('admin'); }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors group',
                      dm ? 'text-gray-200 hover:bg-purple-500/10' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                      dm ? 'bg-purple-500/20 group-hover:bg-purple-500/30' : 'bg-purple-100 group-hover:bg-purple-200'
                    )}>
                      <Settings className={cn('w-4 h-4', dm ? 'text-purple-400' : 'text-purple-600')} />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">Администрирование</div>
                      <div className={cn('text-xs', dm ? 'text-gray-500' : 'text-gray-400')}>Пользователи и настройки</div>
                    </div>
                  </button>
                )}

                <button
                  onClick={() => { setDropdownOpen(false); setPage('reports'); }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors group',
                    dm ? 'text-gray-200 hover:bg-orange-500/10' : 'text-gray-700 hover:bg-orange-50 hover:text-orange-700'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                    dm ? 'bg-orange-500/20 group-hover:bg-orange-500/30' : 'bg-orange-100 group-hover:bg-orange-200'
                  )}>
                    <Bell className={cn('w-4 h-4', dm ? 'text-orange-400' : 'text-orange-600')} />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Отчёты</div>
                    <div className={cn('text-xs', dm ? 'text-gray-500' : 'text-gray-400')}>Аналитика и экспорт</div>
                  </div>
                </button>

                <button
                  onClick={() => { toggleDarkMode(); }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors group',
                    dm ? 'text-gray-200 hover:bg-gray-700/50' : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                    dm ? 'bg-indigo-500/20 group-hover:bg-indigo-500/30' : 'bg-indigo-100 group-hover:bg-indigo-200'
                  )}>
                    {dm ? <Sun className={cn('w-4 h-4', dm ? 'text-yellow-300' : 'text-yellow-600')} /> : <Moon className={cn('w-4 h-4', dm ? 'text-indigo-300' : 'text-indigo-600')} />}
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Тема</div>
                    <div className={cn('text-xs', dm ? 'text-gray-500' : 'text-gray-400')}>{dm ? 'Светлая тема' : 'Тёмная тема'}</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    alert('📞 Служба поддержки JCDecaux Uzbekistan\n\nEmail: support@jcdecaux.uz\nТел: +998 71 123-45-67\n\nРабочие часы: Пн-Пт 9:00–18:00');
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors group',
                    dm ? 'text-gray-200 hover:bg-gray-700/50' : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                    dm ? 'bg-gray-700 group-hover:bg-gray-600' : 'bg-gray-100 group-hover:bg-gray-200'
                  )}>
                    <HelpCircle className={cn('w-4 h-4', dm ? 'text-gray-400' : 'text-gray-600')} />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Помощь</div>
                    <div className={cn('text-xs', dm ? 'text-gray-500' : 'text-gray-400')}>Документация и поддержка</div>
                  </div>
                </button>
              </div>

              {/* Divider */}
              <div className={cn('border-t mx-4', dm ? 'border-gray-700/60' : 'border-gray-100')} />

              {/* Logout */}
              <div className="p-2">
                <button
                  onClick={() => { setDropdownOpen(false); logout(); }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-colors group',
                    dm ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                    dm ? 'bg-red-500/20 group-hover:bg-red-500/30' : 'bg-red-100 group-hover:bg-red-200'
                  )}>
                    <LogOut className={cn('w-4 h-4', dm ? 'text-red-400' : 'text-red-600')} />
                  </div>
                  Выйти из системы
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
