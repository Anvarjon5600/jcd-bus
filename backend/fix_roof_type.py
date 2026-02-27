"""
Скрипт для исправления значений roof_type в БД.
Меняет русские значения на английские enum значения.
Запуск: python fix_roof_type.py
"""
from database import SessionLocal
from models import BusStop

ROOF_MAP = {
    'Арочная': 'arched',
    'Плоская': 'flat',
    'Скатная': 'peaked',
    'арочная': 'arched',
    'плоская': 'flat',
    'скатная': 'peaked',
}

def fix():
    db = SessionLocal()
    try:
        stops = db.query(BusStop).all()
        fixed = 0
        for stop in stops:
            if stop.roof_type in ROOF_MAP:
                old = stop.roof_type
                stop.roof_type = ROOF_MAP[stop.roof_type]
                print(f"  {stop.stop_id}: roof_type '{old}' → '{stop.roof_type}'")
                fixed += 1
        db.commit()
        print(f"\nГотово! Исправлено записей: {fixed}")
    finally:
        db.close()

if __name__ == '__main__':
    fix()
