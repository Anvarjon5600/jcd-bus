import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { DISTRICTS, ConditionLevel, StopStatus } from '../types';

import {
  X, MapPin, Plus, Navigation,
  CheckCircle2, Building2, Wrench, Zap, ChevronRight, ChevronLeft, Crosshair
} from 'lucide-react';
import { cn } from '../utils/cn';
import { CustomSelect, CONDITION_OPTIONS, STOP_TYPE_OPTIONS, ROOF_TYPE_OPTIONS, LEG_COUNT_OPTIONS, SelectOption } from './CustomSelect';
import { createStop, updateCustomFieldValues } from '../api/stops';

declare global {
  interface Window { L: any; }
}

interface AddStopModalProps { onClose: () => void; }

const DISTRICT_OPTIONS: SelectOption[] = DISTRICTS.map(d => ({ value: d, label: d }));

const ROOF_SLEEVE_OPTIONS: SelectOption[] = [
  { value: 'Установлен', label: 'Установлен' },
  { value: 'Не установлен', label: 'Не установлен' },
  { value: 'Требует замены', label: 'Требует замены' },
];

const DISTRICT_MAP: Record<string, string> = {
  'Чиланзар': 'Чиланзарский',
  'Юнусабад': 'Юнусабадский',
  'Мирзо-Улугбек': 'Мирзо-Улугбекский',
  'Мирзо Улугбек': 'Мирзо-Улугбекский',
  'Яккасарай': 'Яккасарайский',
  'Шайхантаур': 'Шайхантахурский',
  'Алмазар': 'Алмазарский',
  'Бектемир': 'Бектемирский',
  'Мирабад': 'Мирабадский',
  'Сергели': 'Сергелийский',
  'Учтепа': 'Учтепинский',
  'Яшнабад': 'Яшнабадский',
};

const extractDistrict = (addressText: string, rawDistrict: string) => {
  let district = '';
  for (const [key, val] of Object.entries(DISTRICT_MAP)) {
    if (rawDistrict?.includes(key)) { district = val; break; }
  }
  if (!district) {
    for (const [key, val] of Object.entries(DISTRICT_MAP)) {
      if (addressText?.includes(key)) { district = val; break; }
    }
  }
  return district;
};

const INITIAL_FORM = {
  address: '', landmark: '', district: DISTRICTS[0],
  lat: 41.2995, lon: 69.2401, status: 'active' as StopStatus, routeNumbers: '',
  stopType: '4m' as '4m' | '7m', yearBuilt: String(new Date().getFullYear()),
  legCount: 2 as 2 | 4 | 6, condition: 'satisfactory' as ConditionLevel,
  seatCondition: 'satisfactory' as ConditionLevel, paintColor: 'Серебристый',
  roofType: 'Арочная', roofCondition: 'satisfactory' as ConditionLevel,
  roofColor: 'Серебристый', roofSleeve: 'Установлен',
  hangingElements: '', fasteners: 'Болтовые',
  electricConnection: false, hasTrashBin: false,
  trashBinCondition: 'satisfactory' as ConditionLevel,
  armoredGlassCondition: 'satisfactory' as ConditionLevel,
  glassReplacementCount: 0, glassFasteningCondition: 'satisfactory' as ConditionLevel,
  normCompliance: true,
};

// Nominatim геокодирование — БЕСПЛАТНО, без лимитов (1 запрос/сек)
async function reverseGeocode(lat: number, lon: number): Promise<{ address: string; district: string }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&accept-language=ru`,
      { headers: { 'User-Agent': 'JCDecaux-Tashkent-Inventory/1.0' } }
    );
    const data = await res.json();

    const addr = data.address || {};
    // Собираем короткий адрес
    const parts = [
      addr.road || addr.pedestrian || addr.footway || '',
      addr.house_number || '',
    ].filter(Boolean);
    const shortAddress = parts.join(', ') || data.display_name?.split(',').slice(0, 2).join(',').trim() || '';

    // Определяем район
    const districtRaw = addr.suburb || addr.city_district || addr.district || addr.county || '';
    const district = extractDistrict(data.display_name || '', districtRaw);

    return { address: shortAddress, district };
  } catch {
    return { address: '', district: '' };
  }
}

export function AddStopModal({ onClose }: AddStopModalProps) {
  const selectStop = useStore(s => s.selectStop);
  const dm = useStore(s => s.darkMode);
  const storeDistricts = useStore(s => s.districts);
  const districtList = storeDistricts.length > 0 ? storeDistricts : DISTRICTS;
  const districtOptions: SelectOption[] = districtList.map(d => ({ value: d, label: d }));
  const customFields = useStore(s => s.customFields);
  const [cfValues, setCfValues] = useState<Record<number, string>>({});

  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({ ...INITIAL_FORM });
  const [gpsLoading, setGpsLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdId, setCreatedId] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = (patch: Partial<typeof INITIAL_FORM>) =>
    setFormData(prev => ({ ...prev, ...patch }));

  // Геокодирование координат через Nominatim
  const geocodeCoords = async (lat: number, lon: number) => {
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    setGeocoding(true);
    set({ lat: parseFloat(lat.toFixed(6)), lon: parseFloat(lon.toFixed(6)) });

    // Задержка 500мс чтобы не слать запросы при каждом пикселе перетаскивания
    geocodeTimer.current = setTimeout(async () => {
      const result = await reverseGeocode(lat, lon);
      set({
        address: result.address || formData.address,
        district: result.district || formData.district,
        lat: parseFloat(lat.toFixed(6)),
        lon: parseFloat(lon.toFixed(6)),
      });
      setGeocoding(false);
    }, 500);
  };



  // Инициализация Leaflet карты
  useEffect(() => {
    const tryInit = () => {
      if (!window.L || !mapRef.current || mapInstanceRef.current) return;

      const map = window.L.map(mapRef.current, {
        center: [formData.lat, formData.lon],
        zoom: 13,
        zoomControl: true,
      });

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      // Начальный маркер
      const marker = window.L.marker([formData.lat, formData.lon], {
        draggable: true,
        icon: window.L.divIcon({
          html: `<div style="
            width:36px;height:36px;background:linear-gradient(135deg,#3b82f6,#6366f1);
            border-radius:50% 50% 50% 0;transform:rotate(-45deg);
            border:3px solid white;box-shadow:0 4px 12px rgba(59,130,246,0.5);
          "></div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          className: '',
        }),
      }).addTo(map);

      // Перетаскивание маркера
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        geocodeCoords(pos.lat, pos.lng);
      });

      // Клик на карту
      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        geocodeCoords(lat, lng);
      });

      markerRef.current = marker;
      mapInstanceRef.current = map;
      setMapReady(true);
    };

    if (window.L) {
      setTimeout(tryInit, 50); // небольшая задержка для рендера div
    } else {
      const id = setInterval(() => {
        if (window.L) { clearInterval(id); setTimeout(tryInit, 50); }
      }, 100);
      setTimeout(() => { clearInterval(id); setMapReady(true); }, 5000);
    }

    return () => {
      if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // GPS
  const handleGetGPS = () => {
    if (!navigator.geolocation) { alert('Геолокация не поддерживается'); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
        if (mapInstanceRef.current) mapInstanceRef.current.setView([lat, lng], 16);
        geocodeCoords(lat, lng);
        setGpsLoading(false);
      },
      () => { alert('Не удалось получить местоположение'); setGpsLoading(false); },
      { timeout: 8000 }
    );
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const goToStep2 = () => {
    if (!formData.address.trim()) { setCreateError('Заполните адрес остановки'); return; }
    setCreateError(null);
    setStep(2);
  };

  const handleCreate = async () => {
    if (creating || success) return;
    if (!formData.address.trim()) {
      setCreateError('Заполните адрес остановки');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      // маппинг полей формы в формат backend BusStopCreate
      const roofTypeMap: Record<string, 'flat' | 'arched' | 'peaked'> = {
        'Арочная': 'arched',
        'Плоская': 'flat',
        'Скатная': 'peaked',
      };

      const payload: any = {
        address: formData.address,
        landmark: formData.landmark || undefined,
        district: formData.district,
        routes: formData.routeNumbers || undefined,
        latitude: formData.lat,
        longitude: formData.lon,
        status: formData.status,
        condition: formData.condition,
        meets_standards: formData.normCompliance,
        stop_type: formData.stopType,
        legs_count: formData.legCount,
        year_built: formData.yearBuilt ? Number(formData.yearBuilt) : undefined,
        paint_color: formData.paintColor || undefined,
        seats_condition: formData.seatCondition,
        roof_type: roofTypeMap[formData.roofType] || 'flat',
        roof_color: formData.roofColor || undefined,
        roof_condition: formData.roofCondition,
        has_roof_slif: formData.roofSleeve === 'Установлен',
        glass_condition: formData.armoredGlassCondition,
        glass_mount_condition: formData.glassFasteningCondition,
        glass_replacement_count: formData.glassReplacementCount,
        has_electricity: formData.electricConnection,
        has_bin: formData.hasTrashBin,
        bin_condition: formData.hasTrashBin ? formData.trashBinCondition : undefined,
        hanging_elements: formData.hangingElements || undefined,
        fasteners: formData.fasteners || undefined,
      };

      const created = await createStop(payload);
      // Save custom field values
      const cfPayload = Object.entries(cfValues)
        .filter(([, v]) => v !== '')
        .map(([fid, val]) => ({ field_id: Number(fid), value: val || null }));
      if (cfPayload.length > 0) {
        await updateCustomFieldValues(created.stop_id, cfPayload);
      }
      // перезагружаем список остановок из backend
      await useStore.getState().loadStops();
      setCreatedId(created.stop_id);
      setSuccess(true);
    } catch (e: unknown) {
      console.error(e);
      const err = e as { response?: { data?: { detail?: string | { msg: string }[] } } };
      const detail = err?.response?.data?.detail;
      let msg = 'Не удалось создать остановку';
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail)) {
        msg = detail.map(d => d.msg).join('; ');
      }
      setCreateError(msg);
      setCreating(false);
    }
  };

  const openCard = () => {
    const allStops = useStore.getState().stops;
    const created = allStops.find(s => s.stop_id === createdId);
    if (created) selectStop(String(created.id));
    onClose();
  };

  const inp = cn(
    'w-full border-2 rounded-xl px-4 py-2.5 text-sm outline-none transition-all',
    dm
      ? 'bg-gray-700/60 border-gray-600/60 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
      : 'bg-white border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-300'
  );
  const lbl = cn('block text-xs font-semibold mb-1.5 uppercase tracking-wide', dm ? 'text-gray-400' : 'text-gray-500');
  const sec = cn('rounded-2xl border', dm ? 'bg-gray-800/60 border-gray-700/40' : 'bg-white border-gray-100');
  const secHeader = (from: string, to: string) =>
    cn('px-4 py-3 border-b flex items-center gap-2 rounded-t-2xl',
      dm ? 'bg-gray-800/80 border-gray-700/40' : `bg-gradient-to-r ${from} ${to} border-gray-100`);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => { if (!creating && !success) onClose(); }}
      />
      <div
        className={cn('relative rounded-3xl w-full flex flex-col overflow-hidden', dm ? 'bg-gray-900' : 'bg-gray-50')}
        style={{ maxWidth: 880, maxHeight: '92vh' }}
      >

        {/* ── SUCCESS ── */}
        {success && (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(18)].map((_, i) => (
                <div key={i} className="absolute w-2.5 h-2.5 rounded-sm" style={{
                  left: `${4 + i * 5.2}%`, top: -20,
                  background: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6'][i % 9],
                  animation: `confettiFall ${1.2 + (i % 4) * 0.2}s ease-in ${i * 0.07}s both`,
                  transform: `rotate(${i * 23}deg)`,
                }} />
              ))}
            </div>
            <div
              className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 flex items-center justify-center mb-6"
              style={{ animation: 'successPop 0.6s cubic-bezier(0.175,0.885,0.32,1.275) both' }}
            >
              <CheckCircle2 style={{ width: 64, height: 64 }} className="text-white" />
            </div>
            <h2 className={cn('text-3xl font-bold mb-2', dm ? 'text-white' : 'text-gray-800')}>Остановка создана!</h2>
            <p className={cn('mb-6 text-lg', dm ? 'text-gray-400' : 'text-gray-500')}>Успешно добавлена в систему</p>
            <div className={cn('border-2 rounded-2xl px-8 py-4 mb-8',
              dm ? 'bg-blue-500/10 border-blue-500/30' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
            )}>
              <p className={cn('font-mono font-bold text-2xl', dm ? 'text-blue-300' : 'text-blue-700')}>{createdId}</p>
              <p className={cn('text-sm mt-1', dm ? 'text-blue-400' : 'text-blue-500')}>
                {formData.address}{formData.district ? `, ${formData.district}` : ''}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
              <button type="button" onClick={openCard}
                className="flex flex-col items-center gap-2.5 p-5 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition-all hover:-translate-y-0.5">
                <MapPin className="w-7 h-7" />
                <span className="font-semibold text-sm">Открыть карточку</span>
              </button>
              <button type="button" onClick={onClose}
                className={cn('flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 transition-all hover:-translate-y-0.5',
                  dm ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                )}>
                <X className="w-7 h-7" />
                <span className="font-semibold text-sm">Закрыть</span>
              </button>
            </div>
          </div>
        )}

        {/* ── FORM ── */}
        {!success && (<>
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Plus className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Новая остановка</h2>
                <p className="text-slate-400 text-xs">
                  {step === 1 ? 'Шаг 1 из 2 — Адрес и расположение' : 'Шаг 2 из 2 — Технические данные'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step === 1 ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'}`}>
                  {step > 1 ? '✓' : '1'}
                </div>
                <div className="flex gap-0.5">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${step > 1 ? 'bg-green-400' : 'bg-white/30'}`} />
                  ))}
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step === 2 ? 'bg-blue-500 text-white' : 'bg-white/20 text-white/50'}`}>2</div>
              </div>
              <button type="button" onClick={() => { if (!creating) onClose(); }}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div ref={scrollRef} className="overflow-y-auto flex-1 p-5 space-y-4 relative">

            {/* ── STEP 1 ── */}
            {step === 1 && (<>


              {/* Карта */}
              <div className={cn('border overflow-hidden rounded-b-2xl rounded-t-none', dm ? 'bg-gray-800/60 border-gray-700/40' : 'bg-white border-gray-100')}>
                {/* Шапка карты */}
                <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-4 py-3 flex items-center justify-between gap-3 flex-wrap rounded-t-2xl">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    <span className="text-white text-sm font-medium">Выберите точку на карте</span>
                    {geocoding && (
                      <span className="text-xs text-blue-300 animate-pulse">● Определяем адрес...</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-white/10 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                      <Crosshair className="w-3.5 h-3.5 text-blue-300" />
                      <span className="text-xs font-mono text-white">
                        {formData.lat.toFixed(5)}, {formData.lon.toFixed(5)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleGetGPS}
                      disabled={gpsLoading}
                      className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
                    >
                      <Navigation className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-pulse' : ''}`} />
                      {gpsLoading ? 'Поиск...' : 'GPS'}
                    </button>
                  </div>
                </div>

                {/* Карта */}
                <div className={cn('relative map-rounded rounded-b-2xl rounded-t-none overflow-hidden', dm ? 'border border-gray-700/50' : 'border border-gray-100')} style={{ height: 300 }}>
                  <div ref={mapRef} className="w-full h-full rounded-b-2xl rounded-t-none" />
                  {!mapReady && (
                    <div className={cn('absolute inset-0 flex items-center justify-center', dm ? 'bg-gray-800' : 'bg-gray-100')}>
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <p className={cn('text-sm', dm ? 'text-gray-400' : 'text-gray-500')}>Загрузка OpenStreetMap...</p>
                      </div>
                    </div>
                  )}
                  {/* Подсказка поверх карты */}
                  {mapReady && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[400] pointer-events-none">
                      <div className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm whitespace-nowrap">
                        👆 Нажмите на карту или перетащите маркер
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Адрес */}
              <div className={sec}>
                <div className={secHeader('from-blue-50', 'to-indigo-50')}>
                  <Building2 className={cn('w-4 h-4', dm ? 'text-blue-400' : 'text-blue-600')} />
                  <h3 className={cn('font-bold text-sm', dm ? 'text-gray-200' : 'text-gray-800')}>Адрес и расположение</h3>
                  {geocoding && <span className={cn('ml-auto text-xs animate-pulse', dm ? 'text-blue-400' : 'text-blue-500')}>⟳ Геокодирование...</span>}
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className={lbl}>Адрес <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={e => set({ address: e.target.value })}
                      placeholder="Заполняется автоматически при клике на карту"
                      className={inp}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Ориентир</label>
                      <input type="text" value={formData.landmark} onChange={e => set({ landmark: e.target.value })} placeholder="Напротив ТЦ..." className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Район <span className="text-red-500">*</span></label>
                      <CustomSelect value={formData.district} onChange={v => set({ district: v })} options={districtOptions} />
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>Номера маршрутов</label>
                    <input type="text" value={formData.routeNumbers} onChange={e => set({ routeNumbers: e.target.value })} placeholder="11, 45, 67" className={inp} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Широта (Lat)</label>
                      <input type="number" step="0.000001" value={formData.lat}
                        onChange={e => {
                          const v = parseFloat(e.target.value) || 0;
                          set({ lat: v });
                          if (markerRef.current) markerRef.current.setLatLng([v, formData.lon]);
                          if (mapInstanceRef.current) mapInstanceRef.current.setView([v, formData.lon]);
                        }}
                        className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Долгота (Lon)</label>
                      <input type="number" step="0.000001" value={formData.lon}
                        onChange={e => {
                          const v = parseFloat(e.target.value) || 0;
                          set({ lon: v });
                          if (markerRef.current) markerRef.current.setLatLng([formData.lat, v]);
                          if (mapInstanceRef.current) mapInstanceRef.current.setView([formData.lat, v]);
                        }}
                        className={inp} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Статус */}
              <div className={sec}>
                <div className={secHeader('from-slate-50', 'to-gray-50')}>
                  <h3 className={cn('font-bold text-sm', dm ? 'text-gray-200' : 'text-gray-800')}>Статус остановки</h3>
                </div>
                <div className="p-4 grid grid-cols-2 gap-2">
                  {[
                    { value: 'active', label: 'Активна', emoji: '🟢', light: 'border-green-400 bg-green-50 text-green-700', dark: 'border-green-500/40 bg-green-500/10 text-green-400' },
                    { value: 'repair', label: 'В ремонте', emoji: '🟡', light: 'border-yellow-400 bg-yellow-50 text-yellow-700', dark: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400' },
                    { value: 'dismantled', label: 'Демонтирована', emoji: '⚫', light: 'border-gray-400 bg-gray-100 text-gray-700', dark: 'border-gray-500/40 bg-gray-500/10 text-gray-400' },
                    { value: 'inactive', label: 'Недоступна', emoji: '🔴', light: 'border-red-400 bg-red-50 text-red-700', dark: 'border-red-500/40 bg-red-500/10 text-red-400' },
                    { value: 'other', label: 'Иное', emoji: '🟣', light: 'border-purple-400 bg-purple-50 text-purple-700', dark: 'border-purple-500/40 bg-purple-500/10 text-purple-400' },
                  ].map(opt => (
                    <label
                      key={opt.value}
                      className={cn(
                        'flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all font-semibold text-sm',
                        formData.status === opt.value
                          ? (dm ? opt.dark : opt.light)
                          : dm ? 'border-gray-600/60 bg-gray-700/40 text-gray-500 hover:border-gray-500' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                      )}
                    >
                      <input type="radio" name="status" value={opt.value} checked={formData.status === opt.value} onChange={() => set({ status: opt.value as StopStatus })} className="hidden" />
                      <div className={cn('w-4 h-4 rounded-full border-2 flex-shrink-0', formData.status === opt.value ? 'border-current bg-current' : dm ? 'border-gray-500' : 'border-gray-300')} />
                      <span>{opt.emoji} {opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>)}

            {/* ── STEP 2 ── */}
            {step === 2 && (<>
              {/* Конструкция */}
              <div className={sec}>
                <div className={secHeader('from-purple-50', 'to-violet-50')}>
                  <Building2 className={cn('w-4 h-4', dm ? 'text-purple-400' : 'text-purple-600')} />
                  <h3 className={cn('font-bold text-sm', dm ? 'text-gray-200' : 'text-gray-800')}>Конструкция</h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={lbl}>Тип остановки</label>
                      <CustomSelect value={formData.stopType} onChange={v => set({ stopType: v as '4m' | '7m' })} options={STOP_TYPE_OPTIONS} />
                    </div>
                    <div>
                      <label className={lbl}>Количество стоек</label>
                      <CustomSelect value={String(formData.legCount)} onChange={v => set({ legCount: Number(v) as 2 | 4 | 6 })} options={LEG_COUNT_OPTIONS} />
                    </div>
                    <div>
                      <label className={lbl}>Год выпуска</label>
                      <input type="text" value={formData.yearBuilt} onChange={e => set({ yearBuilt: e.target.value })} placeholder="2020" className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Цвет покраски</label>
                      <input type="text" value={formData.paintColor} onChange={e => set({ paintColor: e.target.value })} placeholder="Серебристый" className={inp} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Состояния */}
              <div className={sec}>
                <div className={secHeader('from-orange-50', 'to-amber-50')}>
                  <Wrench className={cn('w-4 h-4', dm ? 'text-orange-400' : 'text-orange-600')} />
                  <h3 className={cn('font-bold text-sm', dm ? 'text-gray-200' : 'text-gray-800')}>Состояния</h3>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {([
                    { field: 'condition', label: 'Общее состояние' },
                    { field: 'seatCondition', label: 'Состояние сидений' },
                    { field: 'roofCondition', label: 'Состояние крыши' },
                    { field: 'armoredGlassCondition', label: 'Бронестёкла' },
                    { field: 'glassFasteningCondition', label: 'Крепление стёкол' },
                    { field: 'trashBinCondition', label: 'Состояние урны' },
                  ] as { field: keyof typeof INITIAL_FORM; label: string }[]).map(item => (
                    <div key={item.field}>
                      <label className={lbl}>{item.label}</label>
                      <CustomSelect
                        value={formData[item.field] as string}
                        onChange={v => set({ [item.field]: v as ConditionLevel })}
                        options={CONDITION_OPTIONS}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Крыша */}
              <div className={sec}>
                <div className={secHeader('from-sky-50', 'to-cyan-50')}>
                  <h3 className={cn('font-bold text-sm', dm ? 'text-gray-200' : 'text-gray-800')}>🏗️ Крыша</h3>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={lbl}>Вид крыши</label>
                    <CustomSelect value={formData.roofType} onChange={v => set({ roofType: v })} options={ROOF_TYPE_OPTIONS} />
                  </div>
                  <div>
                    <label className={lbl}>Цвет крыши</label>
                    <input type="text" value={formData.roofColor} onChange={e => set({ roofColor: e.target.value })} placeholder="Серебристый" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Слиф на крыше</label>
                    <CustomSelect value={formData.roofSleeve} onChange={v => set({ roofSleeve: v })} options={ROOF_SLEEVE_OPTIONS} />
                  </div>
                </div>
              </div>

              {/* Стёкла */}
              <div className={sec}>
                <div className={secHeader('from-teal-50', 'to-emerald-50')}>
                  <h3 className={cn('font-bold text-sm', dm ? 'text-gray-200' : 'text-gray-800')}>🔷 Стёкла</h3>
                </div>
                <div className="p-4">
                  <label className={lbl}>Количество замен стёкол</label>
                  <input type="number" min={0} value={formData.glassReplacementCount}
                    onChange={e => set({ glassReplacementCount: parseInt(e.target.value) || 0 })} className={inp} />
                </div>
              </div>

              {/* Дополнительно */}
              <div className={sec}>
                <div className={secHeader('from-yellow-50', 'to-orange-50')}>
                  <Zap className={cn('w-4 h-4', dm ? 'text-yellow-400' : 'text-yellow-600')} />
                  <h3 className={cn('font-bold text-sm', dm ? 'text-gray-200' : 'text-gray-800')}>Дополнительно</h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Навесные элементы</label>
                      <input type="text" value={formData.hangingElements} onChange={e => set({ hangingElements: e.target.value })} placeholder="Рекламные щиты..." className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Крепежи</label>
                      <input type="text" value={formData.fasteners} onChange={e => set({ fasteners: e.target.value })} placeholder="Болтовые" className={inp} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { field: 'electricConnection', label: 'Электросеть', emoji: '⚡', light: 'border-yellow-400 bg-yellow-50 text-yellow-700', dark: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400' },
                      { field: 'hasTrashBin', label: 'Урна', emoji: '🗑️', light: 'border-green-400 bg-green-50 text-green-700', dark: 'border-green-500/40 bg-green-500/10 text-green-400' },
                      { field: 'normCompliance', label: 'Нормы', emoji: '✅', light: 'border-blue-400 bg-blue-50 text-blue-700', dark: 'border-blue-500/40 bg-blue-500/10 text-blue-400' },
                    ] as { field: keyof typeof INITIAL_FORM; label: string; emoji: string; light: string; dark: string }[]).map(item => {
                      const checked = formData[item.field] as boolean;
                      return (
                        <button
                          key={item.field}
                          type="button"
                          onClick={() => set({ [item.field]: !checked } as Partial<typeof INITIAL_FORM>)}
                          className={cn(
                            'flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer font-semibold text-sm transition-all',
                            checked
                              ? (dm ? item.dark : item.light)
                              : dm ? 'border-gray-600/60 bg-gray-700/40 text-gray-500 hover:border-gray-500' : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                          )}
                        >
                          <span className="text-2xl">{item.emoji}</span>
                          <span className="text-center leading-tight">{item.label}</span>
                          <div className={cn('w-10 h-5 rounded-full relative transition-all', checked ? 'bg-green-500' : dm ? 'bg-gray-600' : 'bg-gray-200')}>
                            <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-300', checked ? 'right-0.5' : 'left-0.5')} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Доп. характеристики */}
              {customFields.length > 0 && (
              <div className={cn('rounded-xl border overflow-hidden', dm ? 'border-gray-700/50' : 'border-purple-100')}>
                <div className={cn('px-4 py-2.5 flex items-center gap-2', dm ? 'bg-purple-500/10' : 'bg-gradient-to-r from-purple-50 to-indigo-50')}>
                  <span className="text-lg">✨</span>
                  <h3 className={cn('font-bold text-sm', dm ? 'text-gray-200' : 'text-gray-800')}>Доп. характеристики</h3>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {customFields.map(cf => {
                    const val = cfValues[cf.id] ?? '';
                    if (cf.field_type === 'boolean') {
                      return (
                        <div key={cf.id} className="flex items-center gap-3">
                          <label className={lbl}>{cf.name}</label>
                          <button type="button" onClick={() => setCfValues(prev => ({ ...prev, [cf.id]: val === 'true' ? 'false' : 'true' }))}
                            className={cn('w-10 h-5 rounded-full transition-colors relative', val === 'true' ? 'bg-purple-500' : dm ? 'bg-gray-600' : 'bg-gray-300')}>
                            <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', val === 'true' ? 'left-[22px]' : 'left-0.5')} />
                          </button>
                        </div>
                      );
                    }
                    if (cf.field_type === 'select' && cf.options) {
                      return (
                        <div key={cf.id}>
                          <label className={lbl}>{cf.name}</label>
                          <CustomSelect value={val} onChange={v => setCfValues(prev => ({ ...prev, [cf.id]: v }))}
                            options={cf.options.map(o => ({ value: o, label: o }))} />
                        </div>
                      );
                    }
                    return (
                      <div key={cf.id}>
                        <label className={lbl}>{cf.name}</label>
                        <input type={cf.field_type === 'number' ? 'number' : 'text'} value={val}
                          onChange={e => setCfValues(prev => ({ ...prev, [cf.id]: e.target.value }))}
                          className={inp} placeholder={cf.name} />
                      </div>
                    );
                  })}
                </div>
              </div>
              )}
            </>)}
          </div>

          {/* Footer */}
          <div className={cn('px-5 py-4 border-t flex-shrink-0',
            dm ? 'bg-gray-800/80 border-gray-700/40' : 'bg-white border-gray-200'
          )}>
          {createError && (
            <div className={cn(
              'mb-3 px-4 py-2.5 rounded-xl text-sm flex items-start gap-2',
              dm ? 'bg-red-500/15 border border-red-500/30 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'
            )}>
              <span className="flex-shrink-0 mt-0.5">⚠️</span>
              <span>{createError}</span>
            </div>
          )}
          <div className="flex gap-3">
            {step === 1 ? (
              <>
                <button type="button" onClick={onClose}
                  className={cn('flex-1 px-5 py-3 border-2 rounded-xl font-semibold transition-colors',
                    dm ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  )}>
                  Отмена
                </button>
                <button type="button" onClick={goToStep2}
                  className="flex-[2] px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 group">
                  Далее — Технические данные
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => { setStep(1); setCreateError(null); }}
                  className={cn('flex-1 px-5 py-3 border-2 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2',
                    dm ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  )}>
                  <ChevronLeft className="w-4 h-4" /> Назад
                </button>
                <button type="button" onClick={handleCreate} disabled={creating}
                  className="flex-[2] px-5 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70">
                  {creating
                    ? (<><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Создание...</>)
                    : (<><CheckCircle2 className="w-5 h-5" /> Создать остановку</>)
                  }
                </button>
              </>
            )}
          </div>
          </div>
        </>)}
      </div>

      <style>{`
        @keyframes successPop {
          0% { transform: scale(0) rotate(-15deg); opacity: 0; }
          60% { transform: scale(1.1) rotate(3deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translateY(500px) rotate(720deg) scale(0.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
