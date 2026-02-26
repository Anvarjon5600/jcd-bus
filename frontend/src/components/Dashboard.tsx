import { useStore } from '../store/useStore';
import { STATUS_LABELS, CONDITION_LABELS, DISTRICTS } from '../types';
import {
  MapPin, AlertTriangle, Wrench, CheckCircle, Activity,
  BarChart3, PieChart as PieChartIcon, Trash2, Sparkles, TrendingUp
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import { cn } from '../utils/cn';

const CHART_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];
const STATUS_CHART_COLORS = ['#22c55e', '#f59e0b', '#6b7280', '#ef4444'];

export function Dashboard() {
  const { stops, selectStop, darkMode } = useStore();

  const dm = darkMode;

  // Цвета карточек для светлой темы
  const card = dm
    ? 'bg-gray-800/80 border-gray-700/60'
    : 'bg-white border-gray-100';

  const subText = dm ? 'text-gray-400' : 'text-gray-500';
  const headText = dm ? 'text-gray-100' : 'text-gray-900';

  const tooltipStyle = dm
    ? {
        borderRadius: '12px',
        border: '1px solid #374151',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        background: '#1f2937',
        color: '#f3f4f6',
        fontSize: '13px',
      }
    : {
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        fontSize: '13px',
      };

  const total = stops.length;
  const active = stops.filter(s => s.status === 'active').length;
  const needsRepair = stops.filter(s => s.condition === 'needs_repair').length;
  const critical = stops.filter(s => s.condition === 'critical').length;
  const dismantled = stops.filter(s => s.status === 'dismantled').length;

  const statusData = Object.entries(STATUS_LABELS).map(([k, label]) => ({
    name: label,
    value: stops.filter(s => s.status === k).length,
  })).filter(d => d.value > 0);

  const conditionData = Object.entries(CONDITION_LABELS).map(([k, label]) => ({
    name: label,
    value: stops.filter(s => s.condition === k).length,
  })).filter(d => d.value > 0);

  const districtData = DISTRICTS.map(d => ({
    name: d.length > 16 ? d.slice(0, 14) + '…' : d,
    fullName: d,
    count: stops.filter(s => s.district === d).length,
  })).filter(d => d.count > 0);

  const criticalStops = stops.filter(s => s.condition === 'critical' || s.condition === 'needs_repair');

  const stats = [
    {
      label: 'Всего остановок', value: total, icon: MapPin,
      light: 'bg-blue-50 text-blue-700 border-blue-200',
      dark: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
      iconBg: dm ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700',
    },
    {
      label: 'Активных', value: active, icon: CheckCircle,
      light: 'bg-green-50 text-green-700 border-green-200',
      dark: 'bg-green-500/10 text-green-300 border-green-500/30',
      iconBg: dm ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700',
    },
    {
      label: 'Требуют ремонта', value: needsRepair, icon: Wrench,
      light: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      dark: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
      iconBg: dm ? 'bg-yellow-500/20 text-yellow-300' : 'bg-yellow-100 text-yellow-700',
    },
    {
      label: 'Критическое', value: critical, icon: AlertTriangle,
      light: 'bg-red-50 text-red-700 border-red-200',
      dark: 'bg-red-500/10 text-red-300 border-red-500/30',
      iconBg: dm ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700',
    },
    {
      label: 'Демонтировано', value: dismantled, icon: Trash2,
      light: 'bg-gray-50 text-gray-700 border-gray-200',
      dark: 'bg-gray-500/10 text-gray-300 border-gray-500/30',
      iconBg: dm ? 'bg-gray-500/20 text-gray-300' : 'bg-gray-100 text-gray-700',
    },
  ];

  const gridLine = dm ? '#2d3748' : '#e5e7eb';
  const axisColor = dm ? '#9ca3af' : '#6b7280';

  return (
    <div className={cn(
      'p-3 md:p-4 pb-3 space-y-4 overflow-y-auto h-full transition-colors duration-300',
      dm ? 'bg-gray-900' : 'bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/40'
    )}>

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base md:text-lg font-bold mb-0.5">Система инвентаризации остановок</h1>
            <p className="text-blue-100 text-xs">Мониторинг автобусных остановок г. Ташкент</p>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-lg">
            <TrendingUp className="w-4 h-4" />
            <span className="font-semibold text-xs">JCDecaux Uzbekistan</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={cn(
                'rounded-xl border p-4 transition-all cursor-pointer hover:-translate-y-0.5',
                dm ? stat.dark : stat.light,
                dm ? 'hover:border-gray-600' : 'hover:border-gray-300'
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', stat.iconBg)}>
                  <Icon className="w-4 h-4" />
                </div>
                <Sparkles className={cn('w-3.5 h-3.5', dm ? 'text-gray-600' : 'text-gray-300')} />
              </div>
              <div className="text-2xl md:text-3xl font-bold">{stat.value}</div>
              <div className={cn('text-xs mt-0.5 font-medium', dm ? 'text-gray-400' : 'text-gray-600')}>{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Pie */}
        <div className={cn('rounded-xl border p-4', card)}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
              <PieChartIcon className="w-4 h-4 text-white" />
            </div>
            <h3 className={cn('font-semibold text-sm', headText)}>По статусу</h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%" cy="50%"
                outerRadius={85} innerRadius={35}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={{ stroke: dm ? '#6b7280' : '#94a3b8', strokeWidth: 1 }}
              >
                {statusData.map((_, i) => <Cell key={i} fill={STATUS_CHART_COLORS[i % STATUS_CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Condition Pie */}
        <div className={cn('rounded-xl border p-4', card)}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <h3 className={cn('font-semibold text-sm', headText)}>По состоянию</h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={conditionData}
                cx="50%" cy="50%"
                outerRadius={85} innerRadius={35}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={{ stroke: dm ? '#6b7280' : '#94a3b8', strokeWidth: 1 }}
              >
                {conditionData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* District Bar Chart */}
      <div className={cn('rounded-xl border p-4', card)}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <h3 className={cn('font-semibold text-sm', headText)}>По районам</h3>
        </div>
        <ResponsiveContainer width="100%" height={Math.max(260, districtData.length * 42)}>
          <BarChart
            data={districtData}
            layout="vertical"
            margin={{ left: 8, right: 32, top: 4, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={false}
              vertical={true}
              stroke={gridLine}
            />
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
              width={160}
              tick={{ fill: dm ? '#d1d5db' : '#374151', fontSize: 12, fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value) => [value, 'Остановок']}
              labelFormatter={(label) => districtData.find(d => d.name === label)?.fullName || label}
              contentStyle={tooltipStyle}
              cursor={{ fill: dm ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
            />
            <Bar dataKey="count" fill="url(#barGrad)" radius={[0, 8, 8, 0]} barSize={24} />
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Critical Stops Table */}
      <div className={cn('rounded-2xl border overflow-hidden', card)}>
        <div className={cn(
          'p-4 border-b flex items-center gap-2',
          dm ? 'border-gray-700/60 bg-red-900/10' : 'border-gray-100 bg-red-50/60'
        )}>
          <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className={cn('font-semibold text-sm', headText)}>Требуют внимания</h3>
            <p className={cn('text-sm', subText)}>{criticalStops.length} остановок нуждаются в осмотре</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={cn(
                'text-left border-b',
                dm ? 'border-gray-700/60 bg-gray-700/30 text-gray-400' : 'border-gray-100 bg-gray-50/80 text-gray-500'
              )}>
                <th className="py-3 px-5 font-semibold">ID</th>
                <th className="py-3 px-5 font-semibold">Адрес</th>
                <th className="py-3 px-5 font-semibold hidden md:table-cell">Район</th>
                <th className="py-3 px-5 font-semibold">Состояние</th>
                <th className="py-3 px-5 font-semibold text-right">Действие</th>
              </tr>
            </thead>
            <tbody>
              {criticalStops.map(stop => (
                <tr
                  key={stop.id}
                  onClick={() => selectStop(stop.id)}
                  className={cn(
                    'border-b last:border-0 cursor-pointer transition-colors group',
                    dm
                      ? 'border-gray-700/40 hover:bg-gray-700/30'
                      : 'border-gray-50 hover:bg-blue-50/50'
                  )}
                >
                  <td className="py-3.5 px-5 font-mono font-bold text-blue-500">{stop.id}</td>
                  <td className={cn('py-3.5 px-5 font-medium', dm ? 'text-gray-200' : 'text-gray-800')}>{stop.address}</td>
                  <td className={cn('py-3.5 px-5 hidden md:table-cell text-sm', subText)}>{stop.district}</td>
                  <td className="py-3.5 px-5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      stop.condition === 'critical'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {stop.condition === 'critical' && <AlertTriangle className="w-3 h-3" />}
                      {stop.condition === 'needs_repair' && <Wrench className="w-3 h-3" />}
                      {CONDITION_LABELS[stop.condition]}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); selectStop(stop.id); }}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all"
                    >
                      Открыть →
                    </button>
                  </td>
                </tr>
              ))}
              {criticalStops.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-400" />
                    <p className={cn('font-medium', dm ? 'text-gray-400' : 'text-gray-600')}>Всё отлично!</p>
                    <p className="text-sm mt-1">Нет остановок, требующих внимания</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
