import { useStore } from '../store/useStore';
import { BookOpen, CheckCircle2, MapPin, Camera, FileText, Users, Shield, Zap, AlertTriangle, LifeBuoy, PhoneCall } from 'lucide-react';
import { cn } from '../utils/cn';

const steps = [
  {
    icon: MapPin,
    title: '1. Поиск остановки',
    text: 'Откройте «Карта» или «Список», используйте фильтры района, статуса и состояния, чтобы быстро найти нужную остановку.',
  },
  {
    icon: BookOpen,
    title: '2. Паспорт остановки',
    text: 'Откройте карточку остановки, проверьте адрес, статус и технические характеристики перед внесением изменений.',
  },
  {
    icon: Camera,
    title: '3. Фотофиксация',
    text: 'Добавляйте фотографии состояния. Рекомендуется загружать до/после ремонта для прозрачной истории изменений.',
  },
  {
    icon: CheckCircle2,
    title: '4. Инспекция',
    text: 'Обновляйте дату осмотра и план следующей проверки. Данные автоматически попадают в отчёты.',
  },
  {
    icon: FileText,
    title: '5. Отчёты',
    text: 'В разделе «Отчёты» доступна выгрузка в Excel/PDF и аналитика по районам, статусам и состояниям.',
  },
];

const tips = [
  { icon: Zap, title: 'Быстрые действия', text: 'Используйте фильтры и поиск в верхней части, чтобы сократить время работы.' },
  { icon: Shield, title: 'Безопасность', text: 'Не передавайте пароль коллегам. Все действия логируются в журнале.' },
  { icon: AlertTriangle, title: 'Критические случаи', text: 'При критическом состоянии отметьте «Критическое» и загрузите фото.' },
];

const contacts = [
  { label: 'Срочные случаи', value: '+998 71 987-65-43', icon: PhoneCall },
  { label: 'Фото и медиа', value: 'media@jcdecaux.uz', icon: Camera },
  { label: 'Администрирование', value: 'support@jcdecaux.uz', icon: Users },
];

export function HelpCenter() {
  const dm = useStore(s => s.darkMode);

  return (
    <div className={cn('h-full overflow-y-auto transition-colors duration-300', dm ? 'bg-gray-950' : 'bg-gray-50')}>
      <div className="max-w-6xl mx-auto p-4 md:p-6 pb-4 space-y-6">
        <div className={cn(
          'rounded-2xl border p-6 flex flex-col gap-3',
          dm ? 'bg-gray-900 border-gray-700/60 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
        )}>
          <div className="flex items-center gap-3">
            <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', dm ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700')}>
              <LifeBuoy className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Справочник для сотрудников</h1>
              <p className={cn('text-sm', dm ? 'text-gray-400' : 'text-gray-600')}>Внутреннее руководство JCDecaux Uzbekistan</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={cn('lg:col-span-2 rounded-2xl border p-6', dm ? 'bg-gray-900 border-gray-700/60' : 'bg-white border-gray-200')}>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className={cn('w-5 h-5', dm ? 'text-blue-300' : 'text-blue-600')} />
              <h2 className="text-lg font-bold">Как работать с системой</h2>
            </div>
            <div className="space-y-4">
              {steps.map(step => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className={cn('rounded-xl border p-4 flex gap-4', dm ? 'bg-gray-800/60 border-gray-700/50' : 'bg-gray-50 border-gray-100')}>
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', dm ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-100 text-blue-700')}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold">{step.title}</div>
                      <p className={cn('text-sm mt-1', dm ? 'text-gray-400' : 'text-gray-600')}>{step.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <div className={cn('rounded-2xl border p-6', dm ? 'bg-gray-900 border-gray-700/60' : 'bg-white border-gray-200')}>
              <h3 className="font-bold mb-3">Полезные советы</h3>
              <div className="space-y-3">
                {tips.map(tip => {
                  const Icon = tip.icon;
                  return (
                    <div key={tip.title} className={cn('rounded-xl border p-3', dm ? 'bg-gray-800/60 border-gray-700/50' : 'bg-gray-50 border-gray-100')}>
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={cn('w-4 h-4', dm ? 'text-amber-300' : 'text-amber-600')} />
                        <span className="font-semibold text-sm">{tip.title}</span>
                      </div>
                      <p className={cn('text-xs', dm ? 'text-gray-400' : 'text-gray-600')}>{tip.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={cn('rounded-2xl border p-6', dm ? 'bg-gray-900 border-gray-700/60' : 'bg-white border-gray-200')}>
              <h3 className="font-bold mb-3">Контакты поддержки</h3>
              <div className="space-y-3">
                {contacts.map(contact => {
                  const Icon = contact.icon;
                  return (
                    <div key={contact.label} className={cn('rounded-xl border p-3 flex items-center gap-3', dm ? 'bg-gray-800/60 border-gray-700/50' : 'bg-gray-50 border-gray-100')}>
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', dm ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-100 text-blue-700')}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{contact.label}</div>
                        <div className={cn('text-sm font-semibold', dm ? 'text-gray-200' : 'text-gray-800')}>{contact.value}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className={cn('rounded-2xl border p-6 flex items-center justify-between gap-4', dm ? 'bg-gray-900 border-gray-700/60' : 'bg-white border-gray-200')}>
          <div>
            <p className="text-sm font-semibold">Конфиденциально</p>
            <p className={cn('text-xs', dm ? 'text-gray-400' : 'text-gray-500')}>
              Информация предназначена только для сотрудников JCDecaux Uzbekistan.
            </p>
          </div>
          <Shield className={cn('w-8 h-8', dm ? 'text-green-300' : 'text-green-600')} />
        </div>
      </div>
    </div>
  );
}
