import { useState } from 'react';
import { useStore } from '../store/useStore';
import { STATUS_LABELS, CONDITION_LABELS, DISTRICTS } from '../types';
import {
  FileText, Download, Filter, PieChart as PieChartIcon,
  FileSpreadsheet, Calendar, BarChart3, Table as TableIcon
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import { cn } from '../utils/cn';
import { CustomSelect, SelectOption } from './CustomSelect';

type ReportType = 'district' | 'status' | 'condition' | 'repair';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const reportTypeLabels: Record<ReportType, string> = {
  district:  'По районам',
  status:    'По статусу',
  condition: 'По состоянию',
  repair:    'Требующие ремонта',
};

export function ReportsPage() {
  const { stops, darkMode } = useStore();
  const dm = darkMode;
  const [reportType, setReportType]           = useState<ReportType>('district');
  const [selectedDistrict, setSelectedDistrict] = useState('');

  const filteredStops = selectedDistrict
    ? stops.filter(s => s.district === selectedDistrict)
    : stops;

  const getReportData = () => {
    switch (reportType) {
      case 'district':
        return DISTRICTS.map(d => ({
          name: d.length > 15 ? d.slice(0, 12) + '...' : d,
          fullName: d,
          count: filteredStops.filter(s => s.district === d).length,
        })).filter(d => d.count > 0);
      case 'status':
        return Object.entries(STATUS_LABELS).map(([k, v]) => ({
          name: v,
          count: filteredStops.filter(s => s.status === k).length,
        })).filter(d => d.count > 0);
      case 'condition':
        return Object.entries(CONDITION_LABELS).map(([k, v]) => ({
          name: v,
          count: filteredStops.filter(s => s.condition === k).length,
        })).filter(d => d.count > 0);
      case 'repair':
        return [
          { name: 'Требует ремонта', count: filteredStops.filter(s => s.condition === 'needs_repair').length },
          { name: 'Критическое',     count: filteredStops.filter(s => s.condition === 'critical').length },
          { name: 'В ремонте',       count: filteredStops.filter(s => s.status === 'repair').length },
        ];
      default: return [];
    }
  };

  const reportData = getReportData();

  const generateCSV = () => {
    const headers = ['ID', 'Адрес', 'Район', 'Статус', 'Состояние', 'Тип', 'Год', 'Последний осмотр'];
    const rows = filteredStops.map(s => [
      s.id,
      `"${s.address}"`,
      s.district,
      STATUS_LABELS[s.status],
      CONDITION_LABELS[s.condition],
      s.stop_type,
      s.year_built,
      s.last_inspection_date || '—',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stops_report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // ── theme shortcuts ──
  const page       = dm ? 'bg-gray-950' : 'bg-gray-50';
  const card       = dm ? 'bg-gray-800/80 border-gray-700/60' : 'bg-white border-gray-200';
  const head       = dm ? 'text-gray-100' : 'text-gray-900';
  const sub        = dm ? 'text-gray-400' : 'text-gray-500';
  const divider    = dm ? 'border-gray-700/60' : 'border-gray-200';
  const rowHover   = dm ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50';
  const tooltipStyle = dm
    ? { borderRadius: '10px', border: '1px solid rgba(55,65,81,0.8)', background: '#1f2937', color: '#f3f4f6', fontSize: '13px' }
    : { borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '13px' };
  const gridLine  = dm ? '#2d3748' : '#e5e7eb';
  const axisColor = dm ? '#9ca3af' : '#6b7280';

  const kpis = [
    { label: 'Всего остановок',  value: filteredStops.length,                                              color: 'from-blue-500 to-indigo-600' },
    { label: 'Критическое',      value: filteredStops.filter(s => s.condition === 'critical').length,      color: 'from-red-500 to-rose-600' },
    { label: 'Требуют ремонта',  value: filteredStops.filter(s => s.condition === 'needs_repair').length,  color: 'from-yellow-500 to-orange-500' },
    {
      label: 'Проверено за месяц',
      value: filteredStops.filter(s => {
        const d = new Date(s.last_inspection_date || 0);
        const m = new Date(); m.setMonth(m.getMonth() - 1);
        return d >= m;
      }).length,
      color: 'from-green-500 to-emerald-600',
    },
  ];

  return (
    <div className={cn('h-full overflow-y-auto transition-colors duration-300', page)}>
      <div className="max-w-6xl mx-auto p-4 md:p-6 pb-4 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className={cn('text-2xl font-bold', head)}>Отчётность и аналитика</h1>
            <p className={cn('text-sm mt-1', sub)}>Формирование отчётов по остановкам</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={generateCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all text-sm"
            >
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-rose-700 transition-all text-sm">
              <FileText className="w-4 h-4" /> PDF
            </button>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className={cn('rounded-2xl border p-5', card)}>
          <div className="flex flex-wrap items-end gap-5">
            <div className="flex items-center gap-2">
              <Filter className={cn('w-4 h-4', sub)} />
              <span className={cn('text-sm font-semibold', sub)}>Фильтры отчёта</span>
            </div>

            <div>
              <label className={cn('block text-xs font-semibold mb-1.5 uppercase tracking-wide', sub)}>Тип отчёта</label>
              <CustomSelect 
                value={reportType} 
                onChange={v => setReportType(v as ReportType)} 
                options={Object.entries(reportTypeLabels).map(([k, v]) => ({ value: k, label: v })) as SelectOption[]}
              />
            </div>

            <div>
              <label className={cn('block text-xs font-semibold mb-1.5 uppercase tracking-wide', sub)}>Район</label>
              <CustomSelect 
                value={selectedDistrict} 
                onChange={v => setSelectedDistrict(v)} 
                options={[
                  { value: '', label: 'Все районы' },
                  ...DISTRICTS.map(d => ({ value: d, label: d }))
                ] as SelectOption[]}
                placeholder="Все районы"
              />
            </div>

            <div className={cn('flex items-center gap-2 text-sm ml-auto', sub)}>
              <Calendar className="w-4 h-4" />
              <span>Данные на: {new Date().toLocaleDateString('ru-RU')}</span>
            </div>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((item, i) => (
            <div key={i} className={cn(
              'rounded-2xl border p-5 transition-all',
              card,
              dm ? 'hover:border-gray-600' : 'hover:border-gray-300'
            )}>
              <div className={`w-10 h-10 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center mb-3`}>
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div className={cn('text-3xl font-bold', head)}>{item.value}</div>
              <div className={cn('text-xs mt-1 font-medium', sub)}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* ── Chart + Table ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Chart */}
          <div className={cn('rounded-2xl border p-6', card)}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <PieChartIcon className="w-4 h-4 text-white" />
              </div>
              <h3 className={cn('font-bold text-base', head)}>{reportTypeLabels[reportType]}</h3>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={reportData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridLine} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: axisColor, fontSize: 12 }}
                  axisLine={{ stroke: gridLine }}
                  tickLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={130}
                  tick={{ fill: dm ? '#d1d5db' : '#374151', fontSize: 11, fontWeight: 500 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: dm ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}
                />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={20}>
                  {reportData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className={cn('rounded-2xl border p-6', card)}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                <TableIcon className="w-4 h-4 text-white" />
              </div>
              <h3 className={cn('font-bold text-base', head)}>Детализация</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={cn('border-b', divider)}>
                    <th className={cn('text-left py-2.5 px-3 font-semibold text-xs uppercase tracking-wide', sub)}>Категория</th>
                    <th className={cn('text-right py-2.5 px-3 font-semibold text-xs uppercase tracking-wide', sub)}>Кол-во</th>
                    <th className={cn('text-right py-2.5 px-3 font-semibold text-xs uppercase tracking-wide', sub)}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((item, i) => (
                    <tr key={i} className={cn('border-b last:border-0 transition-colors', divider, rowHover)}>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className={cn('font-medium', dm ? 'text-gray-200' : 'text-gray-800')}>{item.name}</span>
                        </div>
                      </td>
                      <td className={cn('py-3 px-3 text-right font-bold', head)}>{item.count}</td>
                      <td className={cn('py-3 px-3 text-right', sub)}>
                        {filteredStops.length > 0 ? ((item.count / filteredStops.length) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                  <tr className={cn('font-bold', dm ? 'bg-gray-700/40 text-gray-200' : 'bg-gray-50 text-gray-800')}>
                    <td className="py-3 px-3">Итого</td>
                    <td className="py-3 px-3 text-right">{reportData.reduce((s, d) => s + d.count, 0)}</td>
                    <td className={cn('py-3 px-3 text-right', sub)}>100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Detailed List ── */}
        <div className={cn('rounded-2xl border overflow-hidden', card)}>
          <div className={cn('p-5 border-b flex items-center justify-between', divider)}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                <Download className="w-4 h-4 text-white" />
              </div>
              <h3 className={cn('font-bold', head)}>Список остановок для отчёта</h3>
            </div>
            <span className={cn('text-sm', sub)}>{filteredStops.length} записей</span>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className={cn('sticky top-0', dm ? 'bg-gray-700/90' : 'bg-gray-50')}>
                <tr>
                  {['ID', 'Адрес', 'Район', 'Статус', 'Состояние', 'Осмотр'].map(h => (
                    <th key={h} className={cn('text-left py-3 px-4 font-semibold text-xs uppercase tracking-wide', sub)}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStops.slice(0, 50).map(stop => (
                  <tr key={stop.id} className={cn('border-b last:border-0 transition-colors', divider, rowHover)}>
                    <td className="py-2.5 px-4 font-mono font-bold text-blue-500">{stop.id}</td>
                    <td className={cn('py-2.5 px-4', dm ? 'text-gray-200' : 'text-gray-800')}>{stop.address}</td>
                    <td className={cn('py-2.5 px-4', sub)}>{stop.district}</td>
                    <td className="py-2.5 px-4">
                      <span className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-semibold',
                        dm ? 'bg-gray-600/60 text-gray-200' : 'bg-gray-100 text-gray-700'
                      )}>
                        {STATUS_LABELS[stop.status]}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        stop.condition === 'critical'     ? (dm ? 'bg-red-500/20 text-red-400'    : 'bg-red-100 text-red-700') :
                        stop.condition === 'needs_repair' ? (dm ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700') :
                        stop.condition === 'excellent'    ? (dm ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700') :
                                                           (dm ? 'bg-blue-500/20 text-blue-400'   : 'bg-blue-100 text-blue-700')
                      }`}>
                        {CONDITION_LABELS[stop.condition]}
                      </span>
                    </td>
                    <td className={cn('py-2.5 px-4', sub)}>{stop.last_inspection_date ? new Date(stop.last_inspection_date).toLocaleDateString('ru-RU') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
