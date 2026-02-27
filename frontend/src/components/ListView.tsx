import { useState } from 'react';
import { useStore } from '../store/useStore';
import { STATUS_LABELS, CONDITION_LABELS, STATUS_COLORS, CONDITION_COLORS, DISTRICTS, StopStatus, ConditionLevel, BusStop } from '../types';
import { Calendar, Zap, ZapOff, ChevronRight, Filter, X, Search, Building, Layers, Activity, Bus, MapPin, Camera, Trash2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { CustomSelect, SelectOption } from './CustomSelect';
import { DeleteConfirmModal } from './DeleteConfirmModal';

export function ListView() {
  const { getFilteredStops, selectStop, filters, setFilters, resetFilters, darkMode, currentUser, removeStop } = useStore();
  const stops = getFilteredStops();
  const dm = darkMode;
  const canDelete = currentUser?.role === 'admin';

  const [deleteTarget, setDeleteTarget] = useState<BusStop | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const hasFilters = filters.district || filters.status || filters.condition || filters.search;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    await removeStop(String(deleteTarget.id));
    setIsDeleting(false);
    setDeleteTarget(null);
  };

  return (
    <div className={cn('flex h-full relative overflow-hidden', dm ? 'bg-gray-950' : 'bg-gray-50')}>
      {/* Left Sidebar - Filters */}
      <div className={cn(
        'w-72 border-r flex flex-col flex-shrink-0 hidden md:flex h-full',
        dm ? 'bg-gray-900 border-gray-700/50' : 'bg-white border-gray-100'
      )}>
        <div className={cn(
          'p-5 border-b',
          dm ? 'border-gray-700/50 bg-gray-800/50' : 'border-gray-100 bg-gradient-to-r from-slate-50 to-blue-50'
        )}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Filter className="w-4 h-4 text-white" />
              </div>
              <span className={cn('font-bold', dm ? 'text-white' : 'text-gray-900')}>Фильтры</span>
            </div>
            {hasFilters && (
              <button
                onClick={resetFilters}
                className={cn(
                  'flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-semibold px-2 py-1 rounded-lg',
                  dm ? 'bg-red-500/10' : 'bg-red-50'
                )}
              >
                <X className="w-3 h-3" />
                Сбросить
              </button>
            )}
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по ID, адресу..."
              value={filters.search}
              onChange={e => setFilters({ search: e.target.value })}
              className={cn(
                'w-full pl-11 pr-4 py-3 text-sm border-2 rounded-xl outline-none transition-all',
                dm
                  ? 'bg-gray-700/60 border-gray-600/60 text-white placeholder-gray-500 focus:border-blue-500'
                  : 'bg-white border-gray-200 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
              )}
            />
          </div>
        </div>

        <div className="p-5 space-y-5 flex-1 overflow-y-auto pb-[62px]">
          {/* District */}
          <div>
            <label className={cn('text-sm font-semibold mb-2 flex items-center gap-2', dm ? 'text-gray-300' : 'text-gray-700')}>
              <Building className="w-4 h-4 text-gray-400" />
              Район
            </label>
            <CustomSelect
              value={filters.district}
              onChange={v => setFilters({ district: v })}
              options={[
                { value: '', label: 'Все районы' },
                ...DISTRICTS.map(d => ({ value: d, label: d }))
              ] as SelectOption[]}
              placeholder="Все районы"
            />
          </div>

          {/* Status */}
          <div>
            <label className={cn('text-sm font-semibold mb-2 flex items-center gap-2', dm ? 'text-gray-300' : 'text-gray-700')}>
              <Layers className="w-4 h-4 text-gray-400" />
              Статус
            </label>
            <div className="space-y-2">
              <button
                onClick={() => setFilters({ status: '' })}
                className={cn(
                  'w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2',
                  !filters.status
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                    : dm
                      ? 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                )}
              >
                Все статусы
              </button>
              {(Object.entries(STATUS_LABELS) as [StopStatus, string][]).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setFilters({ status: filters.status === k ? '' : k })}
                  className={cn(
                    'w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2',
                    filters.status === k
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                      : dm
                        ? 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <span className={cn('w-2 h-2 rounded-full', k === 'active' ? 'bg-green-500' : k === 'repair' ? 'bg-yellow-500' : k === 'dismantled' ? 'bg-gray-500' : 'bg-red-500')} />
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Condition */}
          <div>
            <label className={cn('text-sm font-semibold mb-2 flex items-center gap-2', dm ? 'text-gray-300' : 'text-gray-700')}>
              <Activity className="w-4 h-4 text-gray-400" />
              Состояние
            </label>
            <div className="space-y-2">
              <button
                onClick={() => setFilters({ condition: '' })}
                className={cn(
                  'w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2',
                  !filters.condition
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                    : dm
                      ? 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                )}
              >
                Все состояния
              </button>
              {(Object.entries(CONDITION_LABELS) as [ConditionLevel, string][]).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setFilters({ condition: filters.condition === k ? '' : k })}
                  className={cn(
                    'w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2',
                    filters.condition === k
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                      : dm
                        ? 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/60'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <span className={cn('w-2 h-2 rounded-full', k === 'excellent' ? 'bg-green-500' : k === 'satisfactory' ? 'bg-blue-500' : k === 'needs_repair' ? 'bg-orange-500' : 'bg-red-500')} />
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Main Content */}
      <div className={cn('flex-1 flex flex-col relative', dm ? 'bg-gray-950' : 'bg-gray-50')}>
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4 pb-[60px]">
          {stops.map(stop => {
            const mainPhoto = (stop.photos || []).find(p => p.is_main) || (stop.photos || [])[0];
            const photoUrl = mainPhoto ? `/${mainPhoto.file_path.replace(/\\/g, '/')}` : null;
            return (
              <div
                key={stop.id}
                onClick={() => selectStop(String(stop.id))}
                style={{ height: '120px' }}
                className={cn(
                  'rounded-2xl border transition-all cursor-pointer overflow-hidden flex group',
                  dm
                    ? 'bg-gray-800/60 border-gray-700/40 hover:bg-gray-700/50 hover:border-gray-600/60'
                    : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-md'
                )}
              >
                <div className={cn(
                  'w-28 md:w-36 flex-shrink-0 relative overflow-hidden',
                  dm ? 'bg-gray-700/60' : 'bg-gradient-to-br from-gray-100 to-gray-200'
                )} style={{ height: '120px' }}>
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={stop.stop_id}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.style.display = 'none';
                        if (img.nextElementSibling) (img.nextElementSibling as HTMLElement).style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className={cn(
                    'absolute inset-0 flex flex-col items-center justify-center gap-1',
                    photoUrl ? 'hidden' : 'flex'
                  )}>
                    <Camera className={cn('w-8 h-8', dm ? 'text-gray-500' : 'text-gray-300')} />
                    <span className={cn('text-xs font-medium', dm ? 'text-gray-600' : 'text-gray-400')}>Нет фото</span>
                  </div>
                </div>
                <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={cn('font-mono font-bold text-sm', dm ? 'text-white' : 'text-gray-900')}>{stop.stop_id}</span>
                      <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', STATUS_COLORS[stop.status])}>
                        {STATUS_LABELS[stop.status]}
                      </span>
                      <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', CONDITION_COLORS[stop.condition])}>
                        {CONDITION_LABELS[stop.condition]}
                      </span>
                    </div>
                    <div className={cn('flex items-center gap-2 text-sm mb-1', dm ? 'text-gray-300' : 'text-gray-700')}>
                      <Bus className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="truncate font-medium">{stop.address}</span>
                    </div>
                    <div className={cn('text-sm', dm ? 'text-gray-500' : 'text-gray-500')}>{stop.district}</div>
                  </div>
                  <div className={cn('flex items-center gap-3 mt-4 text-xs flex-wrap', dm ? 'text-gray-400' : 'text-gray-500')}>
                    <span className={cn('flex items-center gap-1.5 px-2 py-1 rounded-lg', dm ? 'bg-gray-700/60' : 'bg-gray-50')}>
                      <Calendar className="w-3.5 h-3.5" />
                      {stop.last_inspection_date ? new Date(stop.last_inspection_date).toLocaleDateString('ru-RU') : 'Не проверялась'}
                    </span>
                    <span className={cn('flex items-center gap-1.5 px-2 py-1 rounded-lg', dm ? 'bg-gray-700/60' : 'bg-gray-50')}>
                      {stop.has_electricity ? <Zap className="w-3.5 h-3.5 text-yellow-500" /> : <ZapOff className="w-3.5 h-3.5 text-gray-400" />}
                      {stop.has_electricity ? 'Электр.' : 'Нет'}
                    </span>
                    <span className={cn('px-2 py-1 rounded-lg', dm ? 'bg-gray-700/60' : 'bg-gray-50')}>Тип: {stop.stop_type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-3">
                  {canDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(stop); }}
                      className={cn(
                        'p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100',
                        dm
                          ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/15'
                          : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
                      )}
                      title="Удалить остановку"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <div className={cn('transition-colors', dm ? 'text-gray-600 group-hover:text-blue-400' : 'text-gray-300 group-hover:text-blue-500')}>
                    <ChevronRight className="w-6 h-6" />
                  </div>
                </div>
              </div>
            );
          })}
          {stops.length === 0 && (
            <div className={cn('text-center py-12', dm ? 'text-gray-600' : 'text-gray-400')}>
              <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className={cn('text-base font-semibold', dm ? 'text-gray-400' : 'text-gray-600')}>Остановки не найдены</p>
              <p className="text-sm mt-1">Попробуйте изменить параметры фильтров</p>
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <DeleteConfirmModal
          stopId={deleteTarget.stop_id}
          stopAddress={deleteTarget.address}
          darkMode={dm}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isDeleting}
        />
      )}

      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 z-[400] px-4 py-2.5 border-t flex flex-wrap items-center justify-between gap-3',
          dm
            ? 'bg-gray-900 border-gray-700/40 text-gray-300'
            : 'bg-slate-800 border-slate-700 text-white'
        )}
        style={{ height: '52px' }}
      >
        <div className="flex items-center gap-2.5">
          <div className={cn('p-1.5 rounded-lg', dm ? 'bg-blue-500/20' : 'bg-blue-500/30')}>
            <Bus size={14} className="text-blue-400" />
          </div>
          <span className="text-sm font-medium">
            Всего остановок: <span className={cn('font-bold', dm ? 'text-blue-300' : 'text-blue-200')}>{stops.length}</span>
          </span>
          <span className={cn('text-xs px-2 py-0.5 rounded-full', dm ? 'bg-gray-800 text-gray-400' : 'bg-white/10 text-white/70')}>
            найдено: {stops.length}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {[
            { cond: 'excellent', label: 'Отлично', color: '#22c55e' },
            { cond: 'satisfactory', label: 'Удовл.', color: '#3b82f6' },
            { cond: 'needs_repair', label: 'Ремонт', color: '#f97316' },
            { cond: 'critical', label: 'Критич.', color: '#ef4444' },
          ].map(({ cond, label, color }) => (
            <div key={cond}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold"
              style={{ background: color + '22', color }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
              <span>{stops.filter(s => s.condition === (cond as any)).length} {label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
