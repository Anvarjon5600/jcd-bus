import { useState, useRef, useEffect } from 'react';
import { cn } from '../utils/cn';
import { ChevronDown, Check } from 'lucide-react';
import { useStore } from '../store/useStore';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  color?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
}

export const STATUS_OPTIONS: SelectOption[] = [
  { value: 'active', label: 'Активна', description: 'Остановка работает в штатном режиме', color: '#22c55e' },
  { value: 'repair', label: 'В ремонте', description: 'Ведутся ремонтные работы', color: '#eab308' },
  { value: 'dismantled', label: 'Демонтирована', description: 'Остановка демонтирована', color: '#6b7280' },
  { value: 'inactive', label: 'Недоступна', description: 'Временно недоступна', color: '#ef4444' },
  { value: 'other', label: 'Иное', description: 'Другое состояние, не попадающее в стандартные статусы', color: '#a855f7' },
];

export const CONDITION_OPTIONS: SelectOption[] = [
  { value: 'excellent', label: 'Отличное', description: 'Не требует обслуживания', color: '#22c55e' },
  { value: 'satisfactory', label: 'Удовлетворительное', description: 'В рабочем состоянии', color: '#3b82f6' },
  { value: 'needs_repair', label: 'Требует ремонта', description: 'Необходим ремонт', color: '#f97316' },
  { value: 'critical', label: 'Критическое', description: 'Срочный ремонт', color: '#ef4444' },
];

export const STOP_TYPE_OPTIONS: SelectOption[] = [
  { value: '4m', label: '4 метра' },
  { value: '7m', label: '7 метров' },
];

export const LEG_COUNT_OPTIONS: SelectOption[] = [
  { value: '2', label: '2 стойки' },
  { value: '4', label: '4 стойки' },
  { value: '6', label: '6 стоек' },
];

export const ROOF_TYPE_OPTIONS: SelectOption[] = [
  { value: 'Арочная', label: 'Арочная' },
  { value: 'Плоская', label: 'Плоская' },
  { value: 'Скатная', label: 'Скатная' },
];

export function CustomSelect({ value, onChange, options, placeholder = 'Выберите...' }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dm = useStore(s => s.darkMode);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !dropdownRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div
      ref={ref}
      className={cn('relative isolate', open ? 'z-[80]' : 'z-10')}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center justify-between px-3.5 py-2.5 border-2 rounded-xl text-sm font-medium transition-all outline-none',
          open
            ? dm ? 'border-blue-500 ring-2 ring-blue-500/20 bg-gray-700/60' : 'border-blue-500 ring-2 ring-blue-500/20 bg-white'
            : dm ? 'border-gray-600/60 bg-gray-700/60 text-gray-200 hover:border-gray-500' : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
        )}
      >
        <div className="flex items-center gap-2.5">
          {selected?.color && (
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: selected.color }} />
          )}
          <span className={!selected ? (dm ? 'text-gray-500' : 'text-gray-400') : ''}>
            {selected?.label || placeholder}
          </span>
        </div>
        <ChevronDown className={cn('w-4 h-4 transition-transform duration-200 flex-shrink-0',
          dm ? 'text-gray-400' : 'text-gray-400',
          open && 'rotate-180'
        )} />
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute left-0 right-0 top-full mt-2 rounded-xl border overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 z-[70]'
            , dm ? 'bg-gray-800 border-gray-700/60' : 'bg-white border-gray-200 shadow-lg'
          )}
        >
          <div className="max-h-52 overflow-y-auto py-1">
            {options.map(option => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => { onChange(option.value); setOpen(false); }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-sm transition-colors',
                    isSelected
                      ? dm ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-50 text-blue-700'
                      : dm ? 'text-gray-300 hover:bg-gray-700/50' : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  {option.color && (
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: option.color }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{option.label}</div>
                    {option.description && (
                      <div className={cn('text-xs mt-0.5', dm ? 'text-gray-500' : 'text-gray-400')}>{option.description}</div>
                    )}
                  </div>
                  {isSelected && (
                    <div className={cn('w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
                      dm ? 'bg-blue-500/30 text-blue-300' : 'bg-blue-100 text-blue-600'
                    )}>
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
