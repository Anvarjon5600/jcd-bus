import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Filter, MapPin, Bus, X, ChevronRight, Building, Layers, Activity } from 'lucide-react';
import { useStore } from '../store/useStore';
import { STATUS_LABELS, CONDITION_LABELS, DISTRICTS, StopStatus, ConditionLevel } from '../types';
import { CustomSelect } from './CustomSelect';

declare global {
  interface Window {
    L: any;
    openStopCard: (id: string) => void;
  }
}

const STATUS_COLORS_MAP: Record<string, string> = {
  active: '#22c55e',
  repair: '#eab308',
  dismantled: '#6b7280',
  inactive: '#ef4444',
  other: '#a855f7',
};

const CONDITION_COLORS_MAP: Record<string, string> = {
  excellent: '#22c55e',
  satisfactory: '#3b82f6',
  needs_repair: '#f97316',
  critical: '#ef4444',
};

function createIcon(color: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 44" width="32" height="44">
      <defs>
        <filter id="s" x="-30%" y="-20%" width="160%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
        </filter>
      </defs>
      <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 28 16 28S32 28 32 16C32 7.2 24.8 0 16 0z"
        fill="${color}" filter="url(#s)"/>
      <circle cx="16" cy="15" r="8" fill="white" opacity="0.95"/>
      <text x="16" y="19" text-anchor="middle" font-size="11" font-family="Arial">🚌</text>
    </svg>`;
  return window.L.divIcon({
    html: `<div style="width:32px;height:44px">${svg}</div>`,
    iconSize: [32, 44],
    iconAnchor: [16, 44],
    popupAnchor: [0, -44],
    className: '',
  });
}

export function MapView() {
  const { stops, selectStop, darkMode } = useStore();
  const [search, setSearch] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const clusterGroupRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());

  const dm = darkMode;

  const filteredStops = useMemo(() => {
    return stops.filter(stop => {
      const q = search.toLowerCase();
      const matchSearch = !search ||
        stop.stop_id?.toLowerCase().includes(q) ||
        stop.address?.toLowerCase().includes(q) ||
        stop.district?.toLowerCase().includes(q) ||
        (stop.landmark?.toLowerCase().includes(q) ?? false);
      const matchDistrict = !districtFilter || stop.district === districtFilter;
      const matchStatus = !statusFilter || stop.status === statusFilter;
      const matchCondition = !conditionFilter || stop.condition === conditionFilter;
      return matchSearch && matchDistrict && matchStatus && matchCondition;
    });
  }, [stops, search, districtFilter, statusFilter, conditionFilter]);

  // Инициализация Leaflet
  useEffect(() => {
    const tryInit = () => {
      if (!window.L || !mapRef.current || mapInstanceRef.current) return;

      const map = window.L.map(mapRef.current, {
        center: [41.2995, 69.2401],
        zoom: 12,
        zoomControl: true,
      });

      // OpenStreetMap тайлы — бесплатно, без лимитов
      window.L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }
      ).addTo(map);

      // Кластеризация маркеров
      const clusterGroup = window.L.markerClusterGroup({
        maxClusterRadius: 60,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: (cluster: any) => {
          const count = cluster.getChildCount();
          return window.L.divIcon({
            html: `<div style="
              background: linear-gradient(135deg,#3b82f6,#6366f1);
              color:white;font-weight:700;font-size:${count > 99 ? 11 : 13}px;
              width:40px;height:40px;border-radius:50%;
              display:flex;align-items:center;justify-content:center;
              border:3px solid white;
              box-shadow:0 4px 12px rgba(59,130,246,0.4);
            ">${count}</div>`,
            className: '',
            iconSize: [40, 40],
          });
        },
      });
      map.addLayer(clusterGroup);

      mapInstanceRef.current = map;
      clusterGroupRef.current = clusterGroup;

      window.openStopCard = (id: string) => selectStop(id);
      setMapReady(true);
    };

    // Ждём загрузки Leaflet из CDN
    if (window.L) {
      tryInit();
    } else {
      const id = setInterval(() => {
        if (window.L) { clearInterval(id); tryInit(); }
      }, 100);
      setTimeout(() => clearInterval(id), 8000);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        clusterGroupRef.current = null;
      }
    };
  }, []);

  // Обновление маркеров при изменении фильтров
  useEffect(() => {
    if (!mapInstanceRef.current || !clusterGroupRef.current || !mapReady) return;

    clusterGroupRef.current.clearLayers();
    markersRef.current.clear();

    filteredStops.forEach(stop => {
      const color = STATUS_COLORS_MAP[stop.status] || '#3b82f6';
      const condColor = CONDITION_COLORS_MAP[stop.condition] || '#3b82f6';

      const marker = window.L.marker([stop.latitude, stop.longitude], {
        icon: createIcon(color),
      });

      const mainPhoto = (stop.photos || []).find(p => p.is_main) || (stop.photos || [])[0];
      const photoHtml = mainPhoto
        ? `<img src="http://localhost:8000/${mainPhoto.file_path.replace(/\\/g, '/')}" style="width:100%;height:140px;object-fit:cover;border-radius:10px 10px 0 0;display:block;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div style="display:none;width:100%;height:140px;background:#f1f5f9;border-radius:10px 10px 0 0;align-items:center;justify-content:center;flex-direction:column;gap:6px;"><svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' stroke-width='1.5'><rect x='3' y='3' width='18' height='18' rx='2'/><circle cx='8.5' cy='8.5' r='1.5'/><polyline points='21 15 16 10 5 21'/></svg><span style='font-size:11px;color:#94a3b8;'>Фото недоступно</span></div>`
        : `<div style="width:100%;height:140px;background:linear-gradient(135deg,#f1f5f9,#e2e8f0);border-radius:10px 10px 0 0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;"><svg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' stroke-width='1.5'><path d='M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z'/><circle cx='12' cy='13' r='4'/></svg><span style='font-size:11px;color:#94a3b8;font-weight:500;'>Нет фотографий</span></div>`;
      const popupHtml = `
        <div style="min-width:240px;font-family:system-ui,sans-serif;border-radius:10px;overflow:hidden;">
          ${photoHtml}
          <div style="padding:12px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <span style="font-weight:800;font-size:16px;color:#1e293b;">${stop.stop_id}</span>
              <span style="padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;background:${color}22;color:${color};border:1px solid ${color}44;">
                ${STATUS_LABELS[stop.status as StopStatus]}
              </span>
            </div>
            <div style="font-size:13px;color:#475569;margin-bottom:4px;">📍 ${stop.address}</div>
            <div style="font-size:12px;color:#64748b;margin-bottom:4px;">🏘 ${stop.district}</div>
            <div style="font-size:12px;color:#64748b;margin-bottom:8px;">🚌 ${stop.routes || '—'}</div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">
              <div style="width:8px;height:8px;border-radius:50%;background:${condColor};"></div>
              <span style="font-size:12px;color:#64748b;">${CONDITION_LABELS[stop.condition as ConditionLevel]}</span>
            </div>
            <button onclick="window.openStopCard('${stop.id}')"
              style="width:100%;padding:9px;background:linear-gradient(135deg,#3b82f6,#6366f1);color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;transition:opacity 0.2s;"
              onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'"
            >Открыть карточку →</button>
          </div>
        </div>`;

      marker.bindPopup(popupHtml, {
        maxWidth: 280,
        className: 'custom-popup',
      });

      clusterGroupRef.current.addLayer(marker);
      markersRef.current.set(stop.id, marker);
    });
  }, [filteredStops, mapReady, selectStop]);

  const districtOptions = [
    { value: '', label: 'Все районы' },
    ...DISTRICTS.map(d => ({ value: d, label: d })),
  ];
  const statusOptions = [
    { value: '', label: 'Все статусы' },
    { value: 'active', label: 'Активна', color: '#22c55e' },
    { value: 'repair', label: 'В ремонте', color: '#eab308' },
    { value: 'dismantled', label: 'Демонтирована', color: '#6b7280' },
    { value: 'inactive', label: 'Недоступна', color: '#ef4444' },
    { value: 'other', label: 'Иное', color: '#a855f7' },
  ];
  const conditionOptions = [
    { value: '', label: 'Все состояния' },
    { value: 'excellent', label: 'Отличное', color: '#22c55e' },
    { value: 'satisfactory', label: 'Удовлетворительное', color: '#3b82f6' },
    { value: 'needs_repair', label: 'Требует ремонта', color: '#f97316' },
    { value: 'critical', label: 'Критическое', color: '#ef4444' },
  ];

  const hasFilters = search || districtFilter || statusFilter || conditionFilter;

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden relative">

      {/* Боковая панель фильтров */}
      <div className={`
        ${showFilters ? 'translate-x-0' : '-translate-x-full'}
        fixed lg:relative lg:translate-x-0 z-40 lg:z-auto
        w-72 h-full flex flex-col flex-shrink-0
        transition-transform duration-300
        ${dm ? 'bg-gray-900 border-gray-700/40' : 'bg-white border-gray-200'}
        border-r
      `}>
        {/* Шапка */}
        <div className={`p-4 border-b ${dm ? 'border-gray-700/40' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${dm ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                <Filter size={16} className={dm ? 'text-blue-400' : 'text-blue-600'} />
              </div>
              <h3 className={`font-bold text-sm ${dm ? 'text-white' : 'text-gray-800'}`}>Фильтры</h3>
            </div>
            <button
              onClick={() => setShowFilters(false)}
              className={`lg:hidden p-1.5 rounded-lg ${dm ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
            >
              <X size={18} className={dm ? 'text-gray-400' : 'text-gray-500'} />
            </button>
          </div>

          {/* Поиск */}
          <div className="relative">
            <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dm ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="ID, адрес, район..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm outline-none transition-all ${dm
                ? 'bg-gray-800 border-gray-700/60 text-white placeholder-gray-500 focus:border-blue-500'
                : 'bg-gray-50 border-gray-200 focus:border-blue-500 focus:bg-white'
                }`}
            />
          </div>
        </div>

        {/* Фильтры */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-[62px]">

          <div>
            <label className={`text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-2 ${dm ? 'text-gray-400' : 'text-gray-500'}`}>
              <Building className={dm ? 'text-gray-500' : 'text-gray-400'} size={14} />
              Район
            </label>
            <CustomSelect value={districtFilter} onChange={setDistrictFilter} options={districtOptions} placeholder="Все районы" />
          </div>

          <div>
            <label className={`text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-2 ${dm ? 'text-gray-400' : 'text-gray-500'}`}>
              <Layers className={dm ? 'text-gray-500' : 'text-gray-400'} size={14} />
              Статус
            </label>
            <div className="space-y-1.5">
              {statusOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(statusFilter === opt.value ? '' : opt.value)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all text-left ${statusFilter === opt.value
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                    : dm ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  {opt.color && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: opt.color }} />}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={`text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-2 ${dm ? 'text-gray-400' : 'text-gray-500'}`}>
              <Activity className={dm ? 'text-gray-500' : 'text-gray-400'} size={14} />
              Состояние
            </label>
            <div className="space-y-1.5">
              {conditionOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setConditionFilter(conditionFilter === opt.value ? '' : opt.value)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all text-left ${conditionFilter === opt.value
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                    : dm ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  {opt.color && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: opt.color }} />}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Легенда удалена по требованию клиента */}
        </div>

        {/* Сброс фильтров */}
        {hasFilters && (
          <div className={`p-4 border-t ${dm ? 'border-gray-700/40' : 'border-gray-200'}`}>
            <button
              onClick={() => { setSearch(''); setDistrictFilter(''); setStatusFilter(''); setConditionFilter(''); }}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${dm ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              Сбросить фильтры
            </button>
          </div>
        )}
      </div>

      {/* Overlay для мобильных */}
      {showFilters && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setShowFilters(false)} />
      )}

      {/* Карта */}
      <div className="flex-1 relative">
        {/* Leaflet карта */}
        <div ref={mapRef} className="absolute inset-0" />

        {/* Загрузка */}
        {!mapReady && (
          <div className={`absolute inset-0 flex items-center justify-center ${dm ? 'bg-gray-900' : 'bg-gray-100'}`}>
            <div className={`p-8 rounded-2xl text-center ${dm ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className={`font-medium ${dm ? 'text-gray-300' : 'text-gray-700'}`}>Загрузка карты...</p>
              <p className={`text-xs mt-1 ${dm ? 'text-gray-500' : 'text-gray-400'}`}>OpenStreetMap</p>
            </div>
          </div>
        )}

        {/* Счётчик */}
        <div className={`absolute top-3 right-3 z-[400] px-3 py-1.5 rounded-xl text-sm font-medium flex items-center gap-2 ${dm ? 'bg-gray-800/90 text-white border border-gray-700/60' : 'bg-white/90 text-gray-800 border border-gray-200'
          } backdrop-blur-sm`}>
          <MapPin size={14} className="text-blue-500" />
          <span>{filteredStops.length} из {stops.length}</span>
        </div>

        {/* Кнопка показать фильтры */}
        {!showFilters && (
          <button
            onClick={() => setShowFilters(true)}
            className={`absolute top-3 left-3 z-[400] px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${dm ? 'bg-gray-800/90 text-white border border-gray-700/60 hover:bg-gray-700/90' : 'bg-white/90 text-gray-800 border border-gray-200 hover:bg-white'
              } backdrop-blur-sm transition-all`}
          >
            <Filter size={16} />
            <span className="hidden sm:inline">Фильтры</span>
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Footer */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-[400] px-4 py-2.5 border-t flex flex-wrap items-center justify-between gap-3 ${dm
          ? 'bg-gray-900/95 border-gray-700/40 text-gray-300'
          : 'bg-slate-800/95 border-slate-700 text-white'
          } backdrop-blur-sm transition-all duration-300`}
      >
        {/* Левая часть — общее кол-во */}
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${dm ? 'bg-blue-500/20' : 'bg-blue-500/30'}`}>
            <Bus size={14} className="text-blue-400" />
          </div>
          <span className="text-sm font-medium">
            Всего остановок: <span className="font-bold text-blue-400">{stops.length}</span>
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${dm ? 'bg-gray-800 text-gray-400' : 'bg-white/10 text-white/70'}`}>
            найдено: {filteredStops.length}
          </span>
        </div>

        {/* Правая часть — статистика по состоянию */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { cond: 'excellent', label: 'Отлично', color: '#22c55e' },
            { cond: 'satisfactory', label: 'Удовл.', color: '#3b82f6' },
            { cond: 'needs_repair', label: 'Ремонт', color: '#f97316' },
            { cond: 'critical', label: 'Критич.', color: '#ef4444' },
          ].map(({ cond, label, color }) => {
            const count = stops.filter(s => s.condition === cond).length;
            return (
              <div
                key={cond}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: color + '22', color }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                <span>{count} {label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Кнопка фильтров на мобильных */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={`lg:hidden fixed bottom-20 right-4 z-[500] p-3.5 rounded-full shadow-xl transition-all ${dm ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-800 border border-gray-200'
          }`}
      >
        {showFilters ? <X size={22} /> : <Filter size={22} />}
      </button>

      {/* Стили для Leaflet popup */}
      <style>{`
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 14px !important;
          padding: 0 !important;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.15) !important;
          border: 1px solid rgba(0,0,0,0.08);
        }
        .custom-popup .leaflet-popup-content {
          margin: 0 !important;
          width: auto !important;
        }
        .custom-popup .leaflet-popup-tip-container {
          margin-top: -1px;
        }
        .leaflet-control-zoom {
          border: none !important;
          border-radius: 12px !important;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
        }
        .leaflet-control-zoom a {
          background: white !important;
          color: #374151 !important;
          width: 36px !important;
          height: 36px !important;
          line-height: 36px !important;
          font-size: 18px !important;
        }
        .leaflet-control-zoom a:hover { background: #f3f4f6 !important; }
        .marker-cluster { background: transparent !important; border: none !important; }
      `}</style>
    </div>
  );
}
