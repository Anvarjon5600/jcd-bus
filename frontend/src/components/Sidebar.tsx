import { useStore } from '../store/useStore';
import { Map, List, BarChart3, Bus, X, Settings, FileText, BookOpen } from 'lucide-react';
import { cn } from '../utils/cn';

const navItems = [
  { id: 'dashboard' as const, label: 'Дашборд', icon: BarChart3, color: 'from-blue-500 to-indigo-600' },
  { id: 'map' as const, label: 'Карта', icon: Map, color: 'from-green-500 to-emerald-600' },
  { id: 'list' as const, label: 'Список', icon: List, color: 'from-purple-500 to-pink-600' },
  { id: 'reports' as const, label: 'Отчёты', icon: FileText, color: 'from-orange-500 to-red-600' },
  { id: 'help' as const, label: 'Справочник', icon: BookOpen, color: 'from-sky-500 to-cyan-600' },
];

export function Sidebar() {
  const { currentUser, currentPage, setPage, sidebarOpen, closeSidebar, darkMode } = useStore();
  const isAdmin = currentUser?.role === 'admin';

  const dm = darkMode;

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={closeSidebar} />
      )}
      <aside className={cn(
        'fixed top-0 left-0 h-full w-64 z-50 flex flex-col transition-transform duration-300 shadow-2xl',
        dm
          ? 'bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 text-white'
          : 'bg-gradient-to-b from-slate-800 via-slate-800 to-slate-900 text-white',
        'lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>

        {/* Logo */}
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm leading-tight">JCDecaux</div>
              <div className="text-xs text-slate-400">Ташкент</div>
            </div>
          </div>
          <button onClick={closeSidebar} className="lg:hidden text-slate-400 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">
            Навигация
          </div>
          {navItems.map(item => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setPage(item.id); closeSidebar(); }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all',
                  active
                    ? `bg-gradient-to-r ${item.color} text-white shadow-md`
                    : 'text-slate-300 hover:bg-white/8 hover:text-white'
                )}
              >
                <div className={cn(
                  'w-7 h-7 rounded-md flex items-center justify-center transition-all',
                  active ? 'bg-white/20' : 'bg-slate-700/60'
                )}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                {item.label}
              </button>
            );
          })}

          {isAdmin && (
            <>
              <div className="h-px bg-white/10 my-2" />
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">
                Администрирование
              </div>
              <button
                onClick={() => { setPage('admin'); closeSidebar(); }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all',
                  currentPage === 'admin'
                    ? 'bg-gradient-to-r from-gray-600 to-slate-700 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                )}
              >
                <div className={cn(
                  'w-7 h-7 rounded-md flex items-center justify-center',
                  currentPage === 'admin' ? 'bg-white/20' : 'bg-slate-700/60'
                )}>
                  <Settings className="w-3.5 h-3.5" />
                </div>
                Настройки
              </button>
            </>
          )}
        </nav>

        

      </aside>
    </>
  );
}
