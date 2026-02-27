import { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  BookOpen, CheckCircle2, MapPin, Camera, FileText,
  Users, Shield, ChevronDown, ChevronUp, Search,
  Layers, Clock, Edit3, BarChart3, Download
} from 'lucide-react';
import { cn } from '../utils/cn';

interface FaqItem {
  question: string;
  answer: string;
  icon: React.ElementType;
  color: string;
}

const FAQ: FaqItem[] = [
  {
    icon: MapPin,
    color: 'from-blue-500 to-indigo-600',
    question: 'Как найти нужную остановку?',
    answer: 'Откройте раздел «Список» или «Карта». Используйте строку поиска вверху — можно искать по адресу, ID (например BS-001) или ориентиру. Фильтры по району, статусу и состоянию помогут сузить результаты.',
  },
  {
    icon: Edit3,
    color: 'from-orange-500 to-red-500',
    question: 'Как редактировать данные остановки?',
    answer: 'Откройте карточку остановки, нажмите кнопку «Редактировать» (синяя, вверху справа). Внесите изменения и нажмите «Сохранить». Все изменения автоматически записываются в журнал.',
  },
  {
    icon: Camera,
    color: 'from-purple-500 to-pink-600',
    question: 'Как добавить фотографию?',
    answer: 'В карточке остановки перейдите в блок с фотографиями и нажмите кнопку «+». Можно загрузить сразу несколько фото. Первое фото автоматически становится главным — его видно на карте.',
  },
  {
    icon: Clock,
    color: 'from-indigo-500 to-purple-600',
    question: 'Как зафиксировать инспекцию?',
    answer: 'В режиме редактирования остановки заполните поля «Дата осмотра», «Инспектор» и «Следующая проверка» в блоке «Инспекция». Данные сохраняются вместе с остальными изменениями.',
  },
  {
    icon: Download,
    color: 'from-green-500 to-emerald-600',
    question: 'Как выгрузить отчёт?',
    answer: 'Перейдите в раздел «Отчёты». Выберите формат (Excel или PDF), настройте фильтры по дате, району или статусу и нажмите «Сформировать». Файл скачается автоматически.',
  },
  {
    icon: Layers,
    color: 'from-cyan-500 to-blue-600',
    question: 'Что означают статусы остановок?',
    answer: '«Активна» — работает в штатном режиме. «В ремонте» — временно на обслуживании. «Демонтирована» — физически убрана. «Недоступна» — временно не функционирует. «Иное» — нестандартная ситуация.',
  },
  {
    icon: BarChart3,
    color: 'from-amber-500 to-orange-600',
    question: 'Что показывает Дашборд?',
    answer: 'Дашборд отображает общую статистику: количество остановок по статусам и состояниям, распределение по районам, активность инспекций за текущий месяц и динамику изменений.',
  },
  {
    icon: Users,
    color: 'from-slate-500 to-gray-600',
    question: 'Какие роли есть в системе?',
    answer: '«Администратор» — полный доступ, управление пользователями. «Инспектор» — может редактировать данные и добавлять фото. «Просмотр» — только чтение без возможности изменений.',
  },
  {
    icon: Shield,
    color: 'from-red-500 to-rose-600',
    question: 'Можно ли отменить изменения?',
    answer: 'Прямой отмены нет, но все изменения фиксируются в «Журнале изменений» внутри карточки каждой остановки. Там видно кто, когда и что изменил — со старым и новым значением.',
  },
  {
    icon: FileText,
    color: 'from-teal-500 to-cyan-600',
    question: 'Что такое цифровой паспорт?',
    answer: 'Каждая остановка получает уникальный номер паспорта (например TP-2026-0001). Этот номер используется в отчётах и QR-коде для быстрой идентификации объекта на местности.',
  },
];

const quickSteps = [
  { icon: MapPin, label: 'Найти остановку', desc: 'Карта или Список' },
  { icon: Edit3, label: 'Редактировать', desc: 'Кнопка «Редактировать»' },
  { icon: Camera, label: 'Добавить фото', desc: 'Кнопка «+» в галерее' },
  { icon: CheckCircle2, label: 'Сохранить', desc: 'Кнопка «Сохранить»' },
];

export function HelpCenter() {
  const dm = useStore(s => s.darkMode);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const filtered = FAQ.filter(f =>
    !search || f.question.toLowerCase().includes(search.toLowerCase()) || f.answer.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (i: number) => setOpenIndex(prev => prev === i ? null : i);

  return (
    <div className={cn('h-full overflow-y-auto transition-colors duration-300', dm ? 'bg-gray-950' : 'bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/20')}>
      <div className="max-w-4xl mx-auto p-4 md:p-6 pb-8 space-y-6">

        {/* Header */}
        <div className={cn('rounded-2xl border p-6', dm ? 'bg-gray-900 border-gray-700/60' : 'bg-white border-gray-200 shadow-sm')}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={cn('text-2xl font-bold', dm ? 'text-white' : 'text-gray-900')}>Как работать с системой</h1>
              <p className={cn('text-sm mt-0.5', dm ? 'text-gray-400' : 'text-gray-500')}>JCDecaux Uzbekistan — Система инвентаризации остановок</p>
            </div>
          </div>

          {/* Quick steps */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickSteps.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className={cn('rounded-xl p-3 border text-center', dm ? 'bg-gray-800/60 border-gray-700/40' : 'bg-gray-50 border-gray-100')}>
                  <div className={cn('w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center', dm ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-600')}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className={cn('text-xs font-bold', dm ? 'text-gray-200' : 'text-gray-800')}>{s.label}</div>
                  <div className={cn('text-xs mt-0.5', dm ? 'text-gray-500' : 'text-gray-500')}>{s.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className={cn('rounded-2xl border p-4', dm ? 'bg-gray-900 border-gray-700/60' : 'bg-white border-gray-200 shadow-sm')}>
          <div className={cn('flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 transition-all', dm ? 'bg-gray-800/60 border-gray-700 focus-within:border-blue-500' : 'bg-gray-50 border-gray-200 focus-within:border-blue-400 focus-within:bg-white')}>
            <Search className={cn('w-4 h-4 flex-shrink-0', dm ? 'text-gray-500' : 'text-gray-400')} />
            <input
              type="text"
              placeholder="Поиск по вопросам..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={cn('flex-1 bg-transparent text-sm outline-none', dm ? 'text-gray-100 placeholder-gray-500' : 'text-gray-800 placeholder-gray-400')}
            />
            {search && (
              <button onClick={() => setSearch('')} className={cn('text-xs px-2 py-0.5 rounded-lg', dm ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600')}>✕</button>
            )}
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className={cn('rounded-2xl border p-8 text-center', dm ? 'bg-gray-900 border-gray-700/60 text-gray-500' : 'bg-white border-gray-200 text-gray-400')}>
              <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Ничего не найдено</p>
              <p className="text-sm mt-1">Попробуйте другой запрос</p>
            </div>
          )}
          {filtered.map((item, i) => {
            const Icon = item.icon;
            const realIndex = FAQ.indexOf(item);
            const isOpen = openIndex === realIndex;
            return (
              <div key={i} className={cn('rounded-2xl border overflow-hidden transition-all', dm ? 'bg-gray-900 border-gray-700/60' : 'bg-white border-gray-200 shadow-sm', isOpen && (dm ? 'border-blue-500/40' : 'border-blue-200'))}>
                <button
                  onClick={() => toggle(realIndex)}
                  className={cn('w-full flex items-center gap-4 px-5 py-4 text-left transition-colors', dm ? 'hover:bg-gray-800/40' : 'hover:bg-gray-50/80')}
                >
                  <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0', item.color)}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className={cn('flex-1 font-semibold text-sm', dm ? 'text-gray-100' : 'text-gray-800')}>{item.question}</span>
                  {isOpen
                    ? <ChevronUp className={cn('w-4 h-4 flex-shrink-0', dm ? 'text-blue-400' : 'text-blue-500')} />
                    : <ChevronDown className={cn('w-4 h-4 flex-shrink-0', dm ? 'text-gray-500' : 'text-gray-400')} />
                  }
                </button>
                {isOpen && (
                  <div className={cn('px-5 pb-4 border-t', dm ? 'border-gray-700/40' : 'border-gray-100')}>
                    <p className={cn('text-sm leading-relaxed pt-3', dm ? 'text-gray-300' : 'text-gray-600')}>{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className={cn('rounded-2xl border p-4 flex items-center gap-3', dm ? 'bg-gray-900 border-gray-700/60' : 'bg-white border-gray-200')}>
          <Shield className={cn('w-5 h-5 flex-shrink-0', dm ? 'text-green-400' : 'text-green-600')} />
          <p className={cn('text-xs', dm ? 'text-gray-500' : 'text-gray-400')}>
            Материал предназначен только для сотрудников JCDecaux Uzbekistan. Все действия в системе логируются.
          </p>
        </div>

      </div>
    </div>
  );
}
