import { useState } from 'react';
import { useStore } from './store/useStore';
import { LoginPage } from './components/LoginPage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { MapView } from './components/MapView';
import { ListView } from './components/ListView';
import { StopDetail } from './components/StopDetail';
import { AdminPanel } from './components/AdminPanel';
import { ReportsPage } from './components/ReportsPage';
import { HelpCenter } from './components/HelpCenter';
import { AddStopModal } from './components/AddStopModal';
import { MapPin, CheckCircle, AlertTriangle, Wrench, Sparkles } from 'lucide-react';
import { cn } from './utils/cn';

export function App() {
  const { currentUser, currentPage, stops, darkMode: dm, error, setPage } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);

  if (!currentUser) return <LoginPage />;

  const total = stops.length;
  const excellent = stops.filter(s => s.condition === 'excellent').length;
  const satisfactory = stops.filter(s => s.condition === 'satisfactory').length;
  const needsRepair = stops.filter(s => s.condition === 'needs_repair').length;
  const critical = stops.filter(s => s.condition === 'critical').length;

  // const isMap = currentPage === 'map';

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'map': return <MapView />;
      case 'list': return <ListView />;
      case 'stop-detail': return <StopDetail />;
      case 'admin': return <AdminPanel />;
      case 'reports': return <ReportsPage />;
      case 'help': return <HelpCenter />;
      default: return <Dashboard />;
    }
  };

  // Footer height = 52px (py-3 + content)
  const FOOTER_H = 'h-[52px]';
  const showGlobalFooter = currentPage !== 'map' && currentPage !== 'list';
  const mainHeight = showGlobalFooter ? 'h-[calc(100vh-4rem-52px)]' : 'h-[calc(100vh-4rem)]';

  return (
    <>
      <div className={cn(
        'flex h-screen overflow-hidden transition-colors duration-300',
        dm ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'
      )}>
        {/* Sidebar */}
        <Sidebar />

        {/* Right side */}
        <div className="flex flex-col flex-1 overflow-hidden lg:ml-64">
          {/* Header — фиксированный */}
          <Header onAddStop={() => setShowAddModal(true)} />

          {/* Global error banner */}
          {error && (
            <div className={cn(
              'px-4 py-2 text-sm flex items-center justify-between',
              dm ? 'bg-red-900/40 text-red-200 border-b border-red-700/60' : 'bg-red-50 text-red-700 border-b border-red-200'
            )}>
              <span>{error}</span>
              <button
                className="text-xs underline"
                onClick={() => useStore.getState().setError(null)}
              >
                Закрыть
              </button>
            </div>
          )}

          {/* Main — между header и footer, без скролла */}
          <main className={cn(
            'overflow-hidden',
            dm ? 'bg-gray-950' : 'bg-gray-50',
            mainHeight
          )}>
            {renderPage()}
          </main>

          {/* Footer — fixed внизу, отдельно (кроме Карты и Списка) */}
          {showGlobalFooter && (
            <footer className={cn(
              'fixed bottom-0 right-0 left-0 lg:left-64 z-40',
              FOOTER_H,
              'px-4 flex items-center justify-between gap-3 border-t transition-colors duration-300',
              dm
                ? 'bg-gray-900 border-gray-700/60'
                : 'bg-slate-800 border-slate-700'
            )}>
              {/* Левая часть */}
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 leading-none mb-0.5">Остановок в системе</div>
                  <div className="text-sm font-bold text-white leading-none">{total}</div>
                </div>
              </div>

              {/* Центр — статистика (скрыта на мобильных) */}
              <div className="hidden md:flex items-center gap-2 text-xs flex-wrap">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                  <Sparkles className="w-3 h-3 text-green-400" />
                  <span className="text-green-300 font-medium">{excellent} отлично</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/20 border border-blue-500/30">
                  <CheckCircle className="w-3 h-3 text-blue-400" />
                  <span className="text-blue-300 font-medium">{satisfactory} удовл.</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-orange-500/20 border border-orange-500/30">
                  <Wrench className="w-3 h-3 text-orange-400" />
                  <span className="text-orange-300 font-medium">{needsRepair} ремонт</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/20 border border-red-500/30">
                  <AlertTriangle className="w-3 h-3 text-red-400" />
                  <span className="text-red-300 font-medium">{critical} критич.</span>
                </div>
              </div>

              {/* Мобильная статистика — компактная */}
              <div className="flex md:hidden items-center gap-1.5 text-[10px]">
                <span className="text-green-400 font-medium">{excellent}</span>
                <span className="text-slate-600">/</span>
                <span className="text-blue-400 font-medium">{satisfactory}</span>
                <span className="text-slate-600">/</span>
                <span className="text-orange-400 font-medium">{needsRepair}</span>
                <span className="text-slate-600">/</span>
                <span className="text-red-400 font-medium">{critical}</span>
              </div>

              {/* Правая часть */}
              <div className="text-xs text-slate-500 hidden lg:block">
                © 2026 JCDecaux Uzbekistan
              </div>
            </footer>
          )}
        </div>
      </div>

      {showAddModal && <AddStopModal onClose={() => setShowAddModal(false)} />}
    </>
  );
}
