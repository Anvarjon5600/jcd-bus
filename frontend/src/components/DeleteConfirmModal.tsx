import { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, X, MapPin } from 'lucide-react';
import { cn } from '../utils/cn';

interface DeleteConfirmModalProps {
  stopId: string;
  stopAddress: string;
  darkMode: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export function DeleteConfirmModal({
  stopId,
  stopAddress,
  darkMode: dm,
  onConfirm,
  onCancel,
  isDeleting = false,
}: DeleteConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" />

      {/* Modal */}
      <div
        className={cn(
          'relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden',
          'animate-in zoom-in-95 fade-in duration-150',
          dm ? 'bg-gray-900 border border-gray-700/60' : 'bg-white border border-gray-100'
        )}
      >
        {/* Top red accent bar */}
        <div className="h-1.5 bg-gradient-to-r from-red-500 via-rose-500 to-red-600" />

        {/* Header */}
        <div className={cn(
          'px-6 pt-6 pb-4 flex items-start justify-between gap-4',
        )}>
          {/* Icon */}
          <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-600/20 border border-red-500/30 flex items-center justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/30">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className={cn('text-lg font-bold leading-snug', dm ? 'text-white' : 'text-gray-900')}>
              Удалить остановку?
            </h2>
            <p className={cn('text-sm mt-1', dm ? 'text-gray-400' : 'text-gray-500')}>
              Это действие необратимо
            </p>
          </div>

          <button
            onClick={onCancel}
            className={cn(
              'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
              dm
                ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            )}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stop info card */}
        <div className={cn(
          'mx-6 mb-4 p-4 rounded-xl border flex items-start gap-3',
          dm
            ? 'bg-gray-800/60 border-gray-700/60'
            : 'bg-gray-50 border-gray-200'
        )}>
          <div className={cn(
            'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center',
            dm ? 'bg-gray-700' : 'bg-white border border-gray-200'
          )}>
            <MapPin className={cn('w-4 h-4', dm ? 'text-blue-400' : 'text-blue-500')} />
          </div>
          <div className="min-w-0">
            <div className={cn('font-mono font-bold text-sm', dm ? 'text-white' : 'text-gray-900')}>
              {stopId}
            </div>
            <div className={cn('text-xs mt-0.5 truncate', dm ? 'text-gray-400' : 'text-gray-500')}>
              {stopAddress}
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className={cn(
          'mx-6 mb-5 p-3.5 rounded-xl flex items-start gap-2.5',
          dm
            ? 'bg-red-500/10 border border-red-500/30'
            : 'bg-red-50 border border-red-200'
        )}>
          <AlertTriangle className={cn('w-4 h-4 flex-shrink-0 mt-0.5', dm ? 'text-red-400' : 'text-red-500')} />
          <p className={cn('text-xs leading-relaxed', dm ? 'text-red-300' : 'text-red-700')}>
            Вместе с остановкой будут удалены все фотографии, история изменений и связанные данные.
          </p>
        </div>

        {/* Buttons */}
        <div className={cn(
          'px-6 py-4 flex gap-3 border-t',
          dm ? 'border-gray-700/60 bg-gray-800/40' : 'border-gray-100 bg-gray-50/80'
        )}>
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={isDeleting}
            className={cn(
              'flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold border-2 transition-all',
              dm
                ? 'border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-700/60'
                : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-100',
              'disabled:opacity-50'
            )}
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className={cn(
              'flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2',
              'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700',
              'shadow-lg shadow-red-500/30 hover:shadow-red-500/40 hover:scale-[1.02]',
              'disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100'
            )}
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Удаление...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Удалить
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
