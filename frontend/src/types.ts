/**
 * FIX: Типы синхронизированы с Backend API
 * Изменения:
 * - lat/lon → latitude/longitude (соответствует backend schemas.py)
 * - 'unavailable' → 'inactive' (соответствует backend StopStatus enum)
 * - passportNumber → passport_number (snake_case как в API)
 * - routeNumbers → routes
 * - stopType camelCase → stop_type
 * - все поля приведены к snake_case (как возвращает FastAPI)
 */

export type StopStatus = 'active' | 'repair' | 'dismantled' | 'inactive' | 'other';  // FIX: убрали 'unavailable', добавлено 'other' (\"Иное\" из ТЗ)
export type ConditionLevel = 'excellent' | 'satisfactory' | 'needs_repair' | 'critical';
export type UserRole = 'admin' | 'inspector' | 'viewer';

export interface Photo {
  id: number;          // FIX: number (не string)
  filename: string;
  file_path: string;   // FIX: было url
  is_main: boolean;    // FIX: было isMain
  uploaded_at: string; // FIX: было date
  uploader_name?: string; // FIX: было author
}

export interface ChangeLogEntry {
  id: number;
  changed_at: string;    // FIX: было date
  user_name: string;     // FIX: было user
  field_name: string;    // FIX: было field
  old_value: string;
  new_value: string;
}

export interface BusStop {
  id: number;              // FIX: number (не string)
  stop_id: string;         // FIX: было просто id (строка BS-001)
  passport_number?: string; // FIX: было passportNumber
  qr_code?: string;        // НОВОЕ: QR-код (ТЗ 2.2.3)

  address: string;
  landmark?: string;
  district: string;

  latitude: number;   // FIX: было lat
  longitude: number;  // FIX: было lon

  status: StopStatus;
  routes?: string;          // FIX: было routeNumbers
  stop_type: '4m' | '7m';  // FIX: было stopType
  year_built?: number;      // FIX: было yearBuilt (string → number)
  last_repair_date?: string; // FIX: было repairDate
  legs_count: 2 | 4 | 6;   // FIX: было legCount

  condition: ConditionLevel;
  seats_condition: ConditionLevel;   // FIX: было seatCondition
  paint_color?: string;              // FIX: было paintColor

  roof_type: string;                 // FIX: было roofType
  roof_condition: ConditionLevel;    // FIX: было roofCondition
  roof_color?: string;               // FIX: было roofColor
  has_roof_slif: boolean;            // FIX: было roofSleeve

  hanging_elements?: string;         // FIX: было hangingElements
  fasteners?: string;

  has_electricity: boolean;          // FIX: было electricConnection
  has_bin: boolean;                  // FIX: было hasTrashBin
  bin_condition?: ConditionLevel;    // FIX: было trashBinCondition

  glass_condition: ConditionLevel;         // FIX: было armoredGlassCondition
  glass_replacement_count: number;         // FIX: было glassReplacementCount
  glass_mount_condition: ConditionLevel;   // FIX: было glassFasteningCondition

  meets_standards: boolean;    // FIX: было normCompliance

  last_inspection_date?: string;   // FIX: из inspection.date
  inspector_name?: string;         // FIX: из inspection.inspector
  next_inspection_date?: string;   // FIX: из inspection.nextDate

  photos: Photo[];
  change_logs: ChangeLogEntry[];  // FIX: было changeLog

  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;         // FIX: number (не string)
  name: string;
  role: UserRole;
  email: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

// ============== LABELS & COLORS ==============

export const STATUS_LABELS: Record<StopStatus, string> = {
  active: 'Активна',
  repair: 'В ремонте',
  dismantled: 'Демонтирована',
  inactive: 'Недоступна',  // FIX: было unavailable
  other: 'Иное',
};

export const CONDITION_LABELS: Record<ConditionLevel, string> = {
  excellent: 'Отличное',
  satisfactory: 'Удовлетворительное',
  needs_repair: 'Требует ремонта',
  critical: 'Критическое',
};

export const STATUS_COLORS: Record<StopStatus, string> = {
  active: 'bg-green-100 text-green-800',
  repair: 'bg-yellow-100 text-yellow-800',
  dismantled: 'bg-gray-100 text-gray-800',
  inactive: 'bg-red-100 text-red-800',  // FIX: было unavailable
  other: 'bg-purple-100 text-purple-800',
};

export const CONDITION_COLORS: Record<ConditionLevel, string> = {
  excellent: 'bg-green-100 text-green-800',
  satisfactory: 'bg-blue-100 text-blue-800',
  needs_repair: 'bg-yellow-100 text-yellow-800',
  critical: 'bg-red-100 text-red-800',
};

export const DISTRICTS = [
  'Мирзо-Улугбекский',
  'Яккасарайский',
  'Чиланзарский',
  'Юнусабадский',
  'Шайхантахурский',
  'Алмазарский',
  'Бектемирский',
  'Сергелийский',
  'Учтепинский',
  'Мирабадский',
  'Яшнабадский',
];
