import { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import {
  STATUS_LABELS, CONDITION_LABELS, STATUS_COLORS, CONDITION_COLORS,
  StopStatus, ConditionLevel, DISTRICTS, BusStop
} from '../types';
import {
  ArrowLeft, MapPin, Camera, Wrench, Clock, History,
  QrCode, Zap, ZapOff, Trash2, CheckCircle, AlertTriangle,
  Edit3, Save, X, ChevronLeft, ChevronRight, Plus, Upload,
  Calendar, Ruler, Building, Sparkles
} from 'lucide-react';
import { cn } from '../utils/cn';
import {
  CustomSelect,
  STATUS_OPTIONS, CONDITION_OPTIONS, STOP_TYPE_OPTIONS,
  LEG_COUNT_OPTIONS, ROOF_TYPE_OPTIONS, SelectOption
} from './CustomSelect';
import { uploadStopPhoto, uploadMultipleStopPhotos, getStop, updateStop as apiUpdateStop } from '../api/stops';
import { DeleteConfirmModal } from './DeleteConfirmModal';

const TRANSLATE_DICT: Record<string, string> = {
  'active': 'Активна', 'repair': 'В ремонте', 'dismantled': 'Демонтирована',
  'inactive': 'Недоступна', 'other': 'Иное',
  'excellent': 'Отличное', 'satisfactory': 'Удовлетворительное',
  'needs_repair': 'Требует ремонта', 'critical': 'Критическое',
  '4m': '4 метра', '7m': '7 метров',
  'flat': 'Плоская', 'arched': 'Арочная', 'peaked': 'Скатная',
  'true': 'Да', 'false': 'Нет',
  '2': '2 стойки', '4': '4 стойки', '6': '6 стоек',
};

function translateValue(raw: string): string {
  return TRANSLATE_DICT[String(raw).trim()] ?? String(raw).trim();
}

const DISTRICT_OPTIONS: SelectOption[] = DISTRICTS.map(d => ({ value: d, label: d }));

export function StopDetail() {
  const { stops, selectedStopId, setPage, currentUser, updateStop, loadStops, removeStop } = useStore();
  const dm = useStore(s => s.darkMode);
  const stop = stops.find(s => String(s.id) === String(selectedStopId) || s.stop_id === selectedStopId);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<BusStop | null>(stop ? { ...stop } : null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!stop) return null;

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'inspector';
  const canDelete = currentUser?.role === 'admin';

  const startEdit = () => { setEditData({ ...stop }); setEditing(true); };
  const cancelEdit = () => { setEditing(false); setEditData(null); };

  const saveEdit = async () => {
    if (!editData || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await apiUpdateStop(stop.stop_id, editData);
      updateStop(String(stop.id), updated);
      setEditing(false);
      setEditData(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setSaveError(e?.response?.data?.detail || 'Не удалось сохранить изменения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await removeStop(String(stop.id));
    setIsDeleting(false);
    setShowDeleteModal(false);
    setPage('list');
  };

  const handlePhotoUploadClick = () => {
    fileInputRef.current?.click();
  };

  const data = editing && editData ? editData : stop;
  const photos = data.photos || [];
  const changeLogs = data.change_logs || [];
  const selectedIndex = Math.min(selectedPhotoIndex, Math.max(0, photos.length - 1));
  const nextPhoto = () => setSelectedPhotoIndex(p => (p + 1) % photos.length);
  const prevPhoto = () => setSelectedPhotoIndex(p => (p - 1 + photos.length) % photos.length);
  const set = (patch: Partial<BusStop>) => setEditData(prev => prev ? { ...prev, ...patch } : null);

  // ── Helpers ──
  const cardCls = cn('rounded-2xl border', dm ? 'bg-gray-800/60 border-gray-700/40' : 'bg-white border-gray-100');
  const fieldBg = cn('rounded-xl p-3.5 border', dm ? 'bg-gray-700/40 border-gray-600/40' : 'bg-gradient-to-br from-gray-50 to-gray-100/80 border-gray-100');
  const fieldLabel = cn('text-xs uppercase tracking-wide font-medium mb-1.5', dm ? 'text-gray-400' : 'text-gray-500');
  const fieldValue = cn('font-semibold text-sm', dm ? 'text-gray-100' : 'text-gray-900');
  const sectionHeaderCls = (fromColor: string, toColor: string) => cn(
    'px-6 py-4 border-b flex items-center gap-3',
    dm ? 'bg-gray-800/80 border-gray-700/40' : `bg-gradient-to-r ${fromColor} ${toColor} border-gray-100`
  );

  const renderConditionBadge = (value: ConditionLevel, size: 'sm' | 'md' = 'sm') => (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap',
      size === 'sm' ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-sm',
      CONDITION_COLORS[value]
    )}>
      {value === 'excellent' && <Sparkles className="w-3 h-3" />}
      {value === 'critical' && <AlertTriangle className="w-3 h-3" />}
      {CONDITION_LABELS[value]}
    </span>
  );

  const InputField = ({ label, value, onChange, placeholder = '', type = 'text' }: {
    label: string; value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string;
  }) => (
    <div>
      <label className={cn('block text-xs font-semibold uppercase tracking-wide mb-1.5', dm ? 'text-gray-400' : 'text-gray-500')}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className={cn(
          'w-full border-2 rounded-xl px-3 py-2.5 text-sm outline-none transition-all',
          dm ? 'bg-gray-700/60 border-gray-600/60 text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
            : 'bg-white border-gray-200 text-gray-900 hover:border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
        )} />
    </div>
  );

  const DisplayField = ({ label, value, icon: Icon }: { label: string; value: string | number | undefined | null; icon?: React.ElementType }) => (
    <div className={cn(fieldBg, 'min-w-0')}>
      <div className={cn('flex items-center gap-1.5 text-xs mb-1.5', dm ? 'text-gray-400' : 'text-gray-500')}>
        {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
        <span className="uppercase tracking-wide font-medium truncate">{label}</span>
      </div>
      <div className={cn(fieldValue, 'break-words')}>{value ?? '—'}</div>
    </div>
  );

  const SectionTitle = ({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) => (
    <h4 className={cn('font-bold flex items-center gap-2 pb-3 border-b-2', color, dm ? 'text-gray-200' : 'text-gray-800')}>
      <Icon className="w-4 h-4" /> {label}
    </h4>
  );

  const ToggleField = ({ label, checked, onChange, activeColor = 'bg-green-500' }: {
    label: string; checked: boolean; onChange: (v: boolean) => void; activeColor?: string;
  }) => (
    <button type="button" onClick={() => onChange(!checked)}
      className={cn(
        'w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all font-medium text-sm',
        checked
          ? dm ? 'border-green-500/40 bg-green-500/10 text-green-400' : 'border-green-300 bg-green-50 text-green-700'
          : dm ? 'border-gray-600/60 bg-gray-700/40 text-gray-400 hover:border-gray-500' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
      )}>
      <span>{label}</span>
      <div className={cn('w-11 h-6 rounded-full relative transition-all duration-300', checked ? activeColor : dm ? 'bg-gray-600' : 'bg-gray-300')}>
        <div className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-300', checked ? 'right-0.5' : 'left-0.5')} />
      </div>
    </button>
  );

  return (
    <div className={cn('h-[calc(100vh-4rem-52px)] flex flex-col overflow-hidden transition-colors duration-300', dm ? 'bg-gray-900' : 'bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30')}>

      {/* Top Bar */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 px-4 md:px-6 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => setPage('list')}
          className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white bg-white/10 px-3 py-1.5 rounded-lg transition-all hover:bg-white/20">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Назад</span>
        </button>
        <div className="flex-1 flex items-center justify-center gap-3">
          <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2 flex items-center gap-2">
            <span className="font-mono font-bold text-white">{stop.id}</span>
            <span className="text-slate-400 text-sm hidden sm:inline">·</span>
            <span className="text-slate-300 text-sm hidden sm:inline truncate max-w-[180px] md:max-w-[320px] lg:max-w-[480px]">{stop.address}</span>
            <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold ml-1',
              stop.status === 'active' ? 'bg-green-400/20 text-green-300' :
                stop.status === 'repair' ? 'bg-yellow-400/20 text-yellow-300' :
                  stop.status === 'dismantled' ? 'bg-gray-400/20 text-gray-300' :
                    stop.status === 'inactive' ? 'bg-red-400/20 text-red-300' :
                      'bg-purple-400/20 text-purple-300'
            )}>{STATUS_LABELS[stop.status]}</span>
          </div>
        </div>
        {canEdit && !editing && (
          <div className="flex items-center gap-2">
            {canDelete && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white text-sm font-semibold rounded-xl hover:from-red-600 hover:to-rose-700 transition-all hover:scale-105 shadow-lg shadow-red-500/30"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Удалить</span>
              </button>
            )}
            <button onClick={startEdit}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all hover:scale-105">
              <Edit3 className="w-4 h-4" />
              <span className="hidden sm:inline">Редактировать</span>
            </button>
          </div>
        )}
        {editing && (
          <div className="flex flex-col items-end gap-1">
            {saveError && (
              <span className="text-xs text-red-300 bg-red-500/20 px-2 py-1 rounded-lg">{saveError}</span>
            )}
            <div className="flex gap-2">
              <button onClick={cancelEdit} disabled={saving} className="flex items-center gap-1 px-3 py-2 bg-white/10 text-white text-sm rounded-xl hover:bg-white/20 transition-colors disabled:opacity-50">
                <X className="w-4 h-4" /><span className="hidden sm:inline">Отмена</span>
              </button>
              <button onClick={saveEdit} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-70">
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">{saving ? 'Сохранение...' : 'Сохранить'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-3 md:p-4 pb-3 space-y-4">

          {/* Row 1: Photo + Quick Info */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* Photo Gallery */}
            <div className={cn('lg:col-span-2', cardCls)}>
              <div className={cn('relative group', dm ? 'bg-gray-700' : 'bg-gradient-to-br from-gray-100 to-gray-200')} style={{ aspectRatio: '4/3' }}>
                {photos[selectedIndex] ? (
                  <img src={`/${photos[selectedIndex].file_path.replace(/\\/g, '/')}`} alt={`Фото ${stop.id}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22400%22%20height%3D%22300%22%3E%3Crect%20fill%3D%22%23f3f4f6%22%20width%3D%22400%22%20height%3D%22300%22%2F%3E%3Ctext%20fill%3D%22%239ca3af%22%20font-family%3D%22system-ui%22%20font-size%3D%2216%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%3E%D0%A4%D0%BE%D1%82%D0%BE%3C%2Ftext%3E%3C%2Fsvg%3E'; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300"><Camera className="w-16 h-16" /></div>
                )}
                {photos.length > 1 && (<>
                  <button onClick={prevPhoto} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center hover:bg-white hover:scale-110 transition-all">
                    <ChevronLeft className="w-5 h-5 text-gray-700" />
                  </button>
                  <button onClick={nextPhoto} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center hover:bg-white hover:scale-110 transition-all">
                    <ChevronRight className="w-5 h-5 text-gray-700" />
                  </button>
                </>)}
                {photos[selectedIndex]?.is_main && (
                  <div className="absolute top-3 left-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs px-3 py-1.5 rounded-full font-bold">⭐ Главное</div>
                )}
                {photos.length > 0 && (
                  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur text-white text-xs px-2.5 py-1 rounded-full font-medium">{selectedIndex + 1} / {photos.length}</div>
                )}
              </div>
              <div className={cn('p-3 flex gap-2 overflow-x-auto', dm ? 'bg-gray-800/60' : '')}>
                {photos.map((photo, idx) => (
                  <button key={photo.id} onClick={() => setSelectedPhotoIndex(idx)}
                    className={cn('w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all',
                      idx === selectedIndex ? 'border-blue-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                    )}>
                    <img src={`/${photo.file_path.replace(/\\/g, '/')}`} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </button>
                ))}
                {canEdit && (
                  <button onClick={() => setShowPhotoUpload(true)}
                    className={cn('w-16 h-16 flex-shrink-0 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all',
                      dm ? 'border-gray-600 text-gray-500 hover:border-blue-500 hover:text-blue-400 hover:bg-blue-500/10' : 'border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50'
                    )}>
                    <Plus className="w-5 h-5" /><span className="text-xs mt-0.5">Фото</span>
                  </button>
                )}
              </div>
              {photos[selectedIndex] && (
                <div className={cn('px-4 pb-4 flex items-center justify-between text-xs border-t pt-3',
                  dm ? 'text-gray-400 border-gray-700/40' : 'text-gray-500 border-gray-50'
                )}>
                  <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{new Date(photos[selectedIndex].uploaded_at).toLocaleDateString('ru-RU')}</div>
                  <span>👤 {photos[selectedIndex].uploader_name || '—'}</span>
                </div>
              )}
            </div>

            {/* Quick Info */}
            <div className="lg:col-span-3 space-y-4">

              {/* Passport + QR */}
              <div className={cn(cardCls, 'p-5')}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className={cn('text-xs font-semibold uppercase tracking-widest mb-1', dm ? 'text-gray-500' : 'text-gray-400')}>Цифровой паспорт</div>
                    <div className={cn('text-xl font-black', dm ? 'text-gray-100' : 'text-gray-900')}>{data.passport_number}</div>
                    <div className={cn('font-mono text-sm mt-1', dm ? 'text-gray-500' : 'text-gray-400')}>{data.id}</div>
                  </div>
                  <div className={cn('w-20 h-20 rounded-2xl flex items-center justify-center border flex-shrink-0',
                    dm ? 'bg-gray-700/50 border-gray-600/50' : 'bg-gradient-to-br from-gray-100 to-gray-200 border-gray-200'
                  )}>
                    <QrCode className={cn('w-12 h-12', dm ? 'text-gray-500' : 'text-gray-400')} />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className={cn(cardCls, 'p-5')}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-white" />
                  </div>
                  <span className={cn('font-bold', dm ? 'text-gray-200' : 'text-gray-800')}>Расположение</span>
                </div>
                {editing ? (
                  <div className="space-y-3">
                    <InputField label="Адрес" value={editData?.address || ''} onChange={v => set({ address: v })} />
                    <InputField label="Ориентир" value={editData?.landmark || ''} onChange={v => set({ landmark: v })} />
                    <div>
                      <label className={cn('block text-xs font-semibold uppercase tracking-wide mb-1.5', dm ? 'text-gray-400' : 'text-gray-500')}>Район</label>
                      <CustomSelect value={editData?.district || ''} onChange={v => set({ district: v })} options={DISTRICT_OPTIONS} />
                    </div>
                    <InputField label="Маршруты" value={editData?.routes || ''} onChange={v => set({ routes: v })} placeholder="11, 45, 67" />
                  </div>
                ) : (<>
                  <div className={cn('font-bold text-lg', dm ? 'text-gray-100' : 'text-gray-900')}>{data.address}</div>
                  <div className={cn('text-sm mt-1', dm ? 'text-gray-400' : 'text-gray-600')}>{data.landmark}</div>
                  <div className="flex flex-wrap gap-3 mt-3 text-sm">
                    <span className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border', dm ? 'bg-gray-700/40 border-gray-600/40 text-gray-300' : 'bg-gray-50 border-gray-100 text-gray-600')}>
                      <Building className="w-3.5 h-3.5 text-blue-500" />{data.district}
                    </span>
                    <span className={cn('px-3 py-1.5 rounded-lg border', dm ? 'bg-gray-700/40 border-gray-600/40 text-gray-300' : 'bg-gray-50 border-gray-100 text-gray-600')}>
                      📍 {data.latitude.toFixed(4)}, {data.longitude.toFixed(4)}
                    </span>
                    <span className={cn('px-3 py-1.5 rounded-lg border', dm ? 'bg-gray-700/40 border-gray-600/40 text-gray-300' : 'bg-gray-50 border-gray-100 text-gray-600')}>
                      🚌 {data.routes || '—'}
                    </span>
                  </div>
                </>)}
              </div>

              {/* Status + Condition */}
              <div className={cn(cardCls, 'p-5')}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className={cn('text-xs font-semibold uppercase tracking-wider mb-2', dm ? 'text-gray-400' : 'text-gray-400')}>Статус</div>
                    {editing ? (
                      <CustomSelect value={editData?.status || 'active'} onChange={v => set({ status: v as StopStatus })} options={STATUS_OPTIONS} />
                    ) : (
                      <span className={cn('inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold', STATUS_COLORS[data.status])}>
                        {data.status === 'active' && <CheckCircle className="w-4 h-4" />}
                        {data.status === 'repair' && <Wrench className="w-4 h-4" />}
                        {data.status === 'dismantled' && <Trash2 className="w-4 h-4" />}
                        {data.status === 'inactive' && <AlertTriangle className="w-4 h-4" />}
                        {data.status === 'other' && <AlertTriangle className="w-4 h-4" />}
                        {STATUS_LABELS[data.status]}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className={cn('text-xs font-semibold uppercase tracking-wider mb-2', dm ? 'text-gray-400' : 'text-gray-400')}>Состояние</div>
                    {editing ? (
                      <CustomSelect value={editData?.condition || 'satisfactory'} onChange={v => set({ condition: v as ConditionLevel })} options={CONDITION_OPTIONS} />
                    ) : renderConditionBadge(data.condition, 'md')}
                  </div>
                </div>
                <div className={cn('mt-4 pt-4 border-t', dm ? 'border-gray-700/40' : 'border-gray-100')}>
                  {editing ? (
                    <ToggleField label="Соответствует нормативам" checked={editData?.meets_standards || false} onChange={v => set({ meets_standards: v })} />
                  ) : data.meets_standards ? (
                    <div className={cn('flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-xl border',
                      dm ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-green-700 bg-green-50 border-green-200'
                    )}><CheckCircle className="w-5 h-5" /> Соответствует нормативам</div>
                  ) : (
                    <div className={cn('flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-xl border',
                      dm ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-red-700 bg-red-50 border-red-200'
                    )}><AlertTriangle className="w-5 h-5" /> Не соответствует нормативам</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Technical Specs */}
          <div className={cardCls}>
            <div className={sectionHeaderCls('from-orange-50', 'to-amber-50')}>
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <h3 className={cn('font-bold text-lg', dm ? 'text-gray-200' : 'text-gray-900')}>Технические характеристики</h3>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

              {/* Construction */}
              <div className="space-y-4">
                <SectionTitle icon={Building} label="Конструкция" color={dm ? 'border-blue-500/40 text-blue-400' : 'border-blue-200 text-blue-700'} />
                {editing ? (
                  <div className="space-y-3">
                    <div>
                      <label className={cn('block text-xs font-semibold uppercase tracking-wide mb-1.5', dm ? 'text-gray-400' : 'text-gray-500')}>Тип остановки</label>
                      <CustomSelect value={editData?.stop_type || '4m'} onChange={v => set({ stop_type: v as '4m' | '7m' })} options={STOP_TYPE_OPTIONS} />
                    </div>
                    <div>
                      <label className={cn('block text-xs font-semibold uppercase tracking-wide mb-1.5', dm ? 'text-gray-400' : 'text-gray-500')}>Количество стоек</label>
                      <CustomSelect value={String(editData?.legs_count || 2)} onChange={v => set({ legs_count: Number(v) as 2 | 4 | 6 })} options={LEG_COUNT_OPTIONS} />
                    </div>
                    <InputField label="Год выпуска" value={editData?.year_built || ''} onChange={v => set({ year_built: Number(v) || undefined })} />
                    <InputField label="Цвет покраски" value={editData?.paint_color || ''} onChange={v => set({ paint_color: v })} />
                    <div>
                      <label className={cn('block text-xs font-semibold uppercase tracking-wide mb-1.5', dm ? 'text-gray-400' : 'text-gray-500')}>Состояние сидений</label>
                      <CustomSelect value={editData?.seats_condition || 'satisfactory'} onChange={v => set({ seats_condition: v as ConditionLevel })} options={CONDITION_OPTIONS} />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DisplayField label="Тип" value={data.stop_type} />
                    <DisplayField label="Стойки" value={`${data.legs_count} шт.`} />
                    <DisplayField label="Год выпуска" value={data.year_built} />
                    <DisplayField label="Ремонт" value={data.last_repair_date} />
                    <DisplayField label="Цвет" value={data.paint_color} />
                    <div className={cn(fieldBg, 'min-w-0')}>
                      <div className={fieldLabel}>Сидения</div>
                      {renderConditionBadge(data.seats_condition)}
                    </div>
                  </div>
                )}
              </div>

              {/* Roof */}
              <div className="space-y-4">
                <SectionTitle icon={Ruler} label="Крыша" color={dm ? 'border-purple-500/40 text-purple-400' : 'border-purple-200 text-purple-700'} />
                {editing ? (
                  <div className="space-y-3">
                    <div>
                      <label className={cn('block text-xs font-semibold uppercase tracking-wide mb-1.5', dm ? 'text-gray-400' : 'text-gray-500')}>Вид крыши</label>
                      <CustomSelect value={editData?.roof_type || 'flat'} onChange={v => set({ roof_type: v })} options={ROOF_TYPE_OPTIONS} />
                    </div>
                    <InputField label="Цвет крыши" value={editData?.roof_color || ''} onChange={v => set({ roof_color: v })} />
                    <div>
                      <label className={cn('block text-xs font-semibold uppercase tracking-wide mb-1.5', dm ? 'text-gray-400' : 'text-gray-500')}>Состояние крыши</label>
                      <CustomSelect value={editData?.roof_condition || 'satisfactory'} onChange={v => set({ roof_condition: v as ConditionLevel })} options={CONDITION_OPTIONS} />
                    </div>
                    <InputField label="Слиф на крыше" value={editData?.has_roof_slif ? 'Установлен' : 'Не установлен'} onChange={v => set({ has_roof_slif: v === 'Установлен' })} />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DisplayField label="Вид" value={data.roof_type} />
                    <DisplayField label="Цвет" value={data.roof_color} />
                    <div className={cn(fieldBg, 'min-w-0')}>
                      <div className={fieldLabel}>Состояние</div>
                      {renderConditionBadge(data.roof_condition)}
                    </div>
                    <DisplayField label="Слиф" value={data.has_roof_slif ? 'Установлен' : 'Не установлен'} />
                  </div>
                )}
              </div>

              {/* Glass */}
              <div className="space-y-4">
                <h4 className={cn('font-bold pb-3 border-b-2 flex items-center gap-2',
                  dm ? 'border-cyan-500/40 text-cyan-400' : 'border-cyan-200 text-cyan-700'
                )}>🪟 Стёкла</h4>
                {editing ? (
                  <div className="space-y-3">
                    <div>
                      <label className={cn('block text-xs font-semibold uppercase tracking-wide mb-1.5', dm ? 'text-gray-400' : 'text-gray-500')}>Бронестёкла</label>
                      <CustomSelect value={editData?.glass_condition || 'satisfactory'} onChange={v => set({ glass_condition: v as ConditionLevel })} options={CONDITION_OPTIONS} />
                    </div>
                    <InputField label="Кол-во замен" type="number" value={editData?.glass_replacement_count || 0} onChange={v => set({ glass_replacement_count: Number(v) })} />
                    <div>
                      <label className={cn('block text-xs font-semibold uppercase tracking-wide mb-1.5', dm ? 'text-gray-400' : 'text-gray-500')}>Крепление стёкол</label>
                      <CustomSelect value={editData?.glass_mount_condition || 'satisfactory'} onChange={v => set({ glass_mount_condition: v as ConditionLevel })} options={CONDITION_OPTIONS} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className={cn(fieldBg, 'min-w-0')}>
                      <div className={fieldLabel}>Бронестёкла</div>
                      {renderConditionBadge(data.glass_condition)}
                    </div>
                    <DisplayField label="Кол-во замен" value={`${data.glass_replacement_count} раз`} />
                    <div className={cn(fieldBg, 'min-w-0')}>
                      <div className={fieldLabel}>Крепление</div>
                      {renderConditionBadge(data.glass_mount_condition)}
                    </div>
                  </div>
                )}
              </div>

              {/* Electrical + Trash */}
              <div className="space-y-4">
                <h4 className={cn('font-bold flex items-center gap-2 pb-3 border-b-2',
                  dm ? 'border-yellow-500/40 text-yellow-400' : 'border-yellow-200 text-yellow-700'
                )}><Zap className="w-4 h-4" /> Электропитание и урна</h4>
                {editing ? (
                  <div className="space-y-3">
                    <ToggleField label="⚡ Электропитание" checked={editData?.has_electricity || false} onChange={v => set({ has_electricity: v })} activeColor="bg-yellow-500" />
                    <ToggleField label="🗑️ Наличие урны" checked={editData?.has_bin || false} onChange={v => set({ has_bin: v })} />
                    {editData?.has_bin && (
                      <div>
                        <label className={cn('block text-xs font-semibold uppercase tracking-wide mb-1.5', dm ? 'text-gray-400' : 'text-gray-500')}>Состояние урны</label>
                        <CustomSelect value={editData?.bin_condition || 'satisfactory'} onChange={v => set({ bin_condition: v as ConditionLevel })} options={CONDITION_OPTIONS} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className={cn('flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm border',
                      data.has_electricity
                        ? dm ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        : dm ? 'bg-gray-700/40 text-gray-400 border-gray-600/40' : 'bg-gray-100 text-gray-500 border-gray-200'
                    )}>
                      {data.has_electricity ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
                      {data.has_electricity ? 'Подключено к электросети' : 'Нет электропитания'}
                    </div>
                    <div className={cn('flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm border',
                      data.has_bin
                        ? dm ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-green-50 text-green-700 border-green-200'
                        : dm ? 'bg-gray-700/40 text-gray-400 border-gray-600/40' : 'bg-gray-100 text-gray-500 border-gray-200'
                    )}>
                      <Trash2 className="w-5 h-5" />
                      {data.has_bin ? 'Урна установлена' : 'Урна отсутствует'}
                    </div>
                    {data.has_bin && (
                      <div className={fieldBg}>
                        <div className={fieldLabel}>Состояние урны</div>
                        {renderConditionBadge(data.bin_condition)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Elements */}
              <div className="space-y-4">
                <h4 className={cn('font-bold pb-3 border-b-2',
                  dm ? 'border-green-500/40 text-green-400' : 'border-green-200 text-green-700'
                )}>📦 Дополнительные элементы</h4>
                {editing ? (
                  <div className="space-y-3">
                    <InputField label="Навесные элементы" value={editData?.hanging_elements || ''} onChange={v => set({ hanging_elements: v })} placeholder="Рекламные щиты..." />
                    <InputField label="Крепежи" value={editData?.fasteners || ''} onChange={v => set({ fasteners: v })} />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <DisplayField label="Навесные элементы" value={data.hanging_elements || '—'} />
                    <DisplayField label="Крепежи" value={data.fasteners} />
                  </div>
                )}
              </div>

              {/* Inspection */}
              <div className="space-y-4">
                <h4 className={cn('font-bold flex items-center gap-2 pb-3 border-b-2',
                  dm ? 'border-indigo-500/40 text-indigo-400' : 'border-indigo-200 text-indigo-700'
                )}><Clock className="w-4 h-4" /> Инспекция</h4>
                <div className="space-y-3">
                  <div className={cn('rounded-xl p-4 border',
                    dm ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100'
                  )}>
                    <div className={cn('text-xs font-semibold uppercase tracking-wide mb-1', dm ? 'text-indigo-400' : 'text-indigo-400')}>📅 Последний осмотр</div>
                    <div className={cn('font-bold text-base', dm ? 'text-gray-100' : 'text-gray-900')}>{data.last_inspection_date ? new Date(data.last_inspection_date).toLocaleDateString('ru-RU') : '—'}</div>
                  </div>
                  <DisplayField label="Инспектор" value={data.inspector_name} icon={Wrench} />
                  <div className={cn('rounded-xl p-4 border',
                    dm ? 'bg-blue-500/10 border-blue-500/20' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100'
                  )}>
                    <div className={cn('text-xs font-semibold uppercase tracking-wide mb-1', dm ? 'text-blue-400' : 'text-blue-400')}>🔔 Следующая проверка</div>
                    <div className={cn('font-bold text-base', dm ? 'text-blue-300' : 'text-blue-700')}>{data.next_inspection_date ? new Date(data.next_inspection_date).toLocaleDateString('ru-RU') : '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Change History */}
          <div className={cn(cardCls, 'mb-4')}>
            <button onClick={() => setShowHistory(!showHistory)}
              className={cn('w-full px-6 py-4 flex items-center justify-between transition-colors', dm ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50')}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl flex items-center justify-center">
                  <History className="w-5 h-5 text-white" />
                </div>
                <span className={cn('font-bold text-lg', dm ? 'text-gray-200' : 'text-gray-900')}>Журнал изменений</span>
                <span className={cn('text-sm font-semibold px-2.5 py-1 rounded-full',
                  dm ? 'bg-gray-700/60 text-gray-400' : 'bg-gray-100 text-gray-600'
                )}>{changeLogs.length}</span>
              </div>
              <ChevronRight className={cn('w-5 h-5 transition-transform duration-300', dm ? 'text-gray-500' : 'text-gray-400', showHistory && 'rotate-90')} />
            </button>
            {showHistory && (
              <div className={cn('border-t p-5', dm ? 'border-gray-700/40' : 'border-gray-100')}>
                {changeLogs.length === 0 ? (
                  <div className={cn('text-center py-10', dm ? 'text-gray-600' : 'text-gray-400')}>
                    <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Изменений пока нет</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {changeLogs.map(entry => (
                      <div key={entry.id} className={cn('flex gap-4 p-4 rounded-xl border',
                        dm ? 'bg-gray-700/30 border-gray-600/30' : 'bg-gradient-to-r from-gray-50 to-white border-gray-100'
                      )}>
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <Edit3 className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn('font-semibold text-sm', dm ? 'text-gray-200' : 'text-gray-900')}>{entry.user_name}</span>
                            <span className={cn('text-xs px-2 py-0.5 rounded-full', dm ? 'text-gray-400 bg-gray-600/40' : 'text-gray-400 bg-gray-100')}>{new Date(entry.changed_at).toLocaleString('ru-RU')}</span>
                          </div>
                          <div className={cn('text-sm mt-1', dm ? 'text-gray-400' : 'text-gray-500')}>
                            Изменено: <span className={cn('font-semibold', dm ? 'text-gray-300' : 'text-gray-700')}>{entry.field_name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className={cn('px-2.5 py-1 rounded-lg text-sm font-medium line-through opacity-70',
                              dm ? 'bg-red-500/15 text-red-400' : 'bg-red-100 text-red-700'
                            )}>{entry.old_value}</span>
                            <span className={cn('font-bold', dm ? 'text-gray-500' : 'text-gray-400')}>→</span>
                            <span className={cn('px-2.5 py-1 rounded-lg text-sm font-semibold',
                              dm ? 'bg-green-500/15 text-green-400' : 'bg-green-100 text-green-700'
                            )}>{entry.new_value}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Photo Upload Modal */}
      {showPhotoUpload && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={cn('rounded-3xl max-w-md w-full p-8', dm ? 'bg-gray-800' : 'bg-white')}>
            <h3 className={cn('text-xl font-bold mb-6 text-center', dm ? 'text-gray-100' : 'text-gray-900')}>Добавить фотографию</h3>
            <div
              className={cn(
                'border-2 border-dashed rounded-2xl p-6 text-center transition-colors',
                dm ? 'border-gray-600 hover:border-blue-500 hover:bg-blue-500/5' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              )}
              onClick={handlePhotoUploadClick}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <p className={cn('mb-1 font-medium', dm ? 'text-gray-300' : 'text-gray-600')}>Выберите одно или несколько фото</p>
              <p className={cn('text-xs mb-2', dm ? 'text-gray-500' : 'text-gray-400')}>PNG, JPG, WebP до 10MB, максимум 10 файлов</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  if (!files.length) return;
                  setUploading(true);
                  setUploadError(null);
                  try {
                    if (files.length === 1) {
                      await uploadStopPhoto(stop.stop_id, files[0]);
                    } else {
                      await uploadMultipleStopPhotos(stop.stop_id, files);
                    }
                    // Перезагружаем остановку чтобы отобразить новые фото
                    const updated = await getStop(stop.stop_id);
                    updateStop(String(stop.id), updated);
                    setShowPhotoUpload(false);
                  } catch (err) {
                    console.error(err);
                    setUploadError('Не удалось загрузить фото. Проверьте формат и размер файлов.');
                  } finally {
                    setUploading(false);
                    e.target.value = '';
                  }
                }}
              />
              {uploadError && (
                <p className={cn('mt-3 text-xs', dm ? 'text-red-400' : 'text-red-600')}>{uploadError}</p>
              )}
              {uploading && (
                <p className={cn('mt-3 text-xs', dm ? 'text-blue-400' : 'text-blue-600')}>Загрузка...</p>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPhotoUpload(false)}
                className={cn('flex-1 px-4 py-3 border-2 rounded-xl font-semibold transition-colors',
                  dm ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                )}
                disabled={uploading}
              >
                Отмена
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-70"
                disabled={uploading}
              >
                {uploading ? 'Загрузка...' : 'Выбрать файлы'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <DeleteConfirmModal
          stopId={stop.stop_id}
          stopAddress={stop.address}
          darkMode={dm}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
