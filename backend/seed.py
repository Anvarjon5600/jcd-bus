# seed.py - Начальные данные для базы данных
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import User, District, BusStop, StopStatus, Condition, StopType, RoofType
from auth import get_password_hash

def seed_database():
    """Заполнение базы данных начальными данными"""
    db = SessionLocal()
    
    try:
        # ============ ПОЛЬЗОВАТЕЛИ ============
        users_data = [
            {
                "email": "admin",
                "name": "Администратор",
                "role": "admin",
                "password": "admin123"
            },
            {
                "email": "inspector",
                "name": "Инспектор Иванов",
                "role": "inspector",
                "password": "inspector123"
            },
            {
                "email": "viewer",
                "name": "Офис-менеджер",
                "role": "viewer",
                "password": "viewer123"
            }
        ]
        
        for user_data in users_data:
            existing = db.query(User).filter(User.email == user_data["email"]).first()
            if not existing:
                user = User(
                    email=user_data["email"],
                    name=user_data["name"],
                    role=user_data["role"],
                    password_hash=get_password_hash(user_data["password"])
                )
                db.add(user)
                print(f"✅ Создан пользователь: {user_data['email']}")
        
        db.commit()
        
        # ============ РАЙОНЫ ============
        districts_data = [
            "Алмазарский",
            "Бектемирский", 
            "Мирабадский",
            "Мирзо-Улугбекский",
            "Сергелийский",
            "Учтепинский",
            "Чиланзарский",
            "Шайхантахурский",
            "Юнусабадский",
            "Яккасарайский",
            "Яшнабадский"
        ]
        
        for name in districts_data:
            existing = db.query(District).filter(District.name == name).first()
            if not existing:
                district = District(name=name)
                db.add(district)
                print(f"✅ Создан район: {name}")
        
        db.commit()
        
        # ============ ТЕСТОВЫЕ ОСТАНОВКИ ============
        stops_data = [
            {
                "stop_id": "BS-001",
                "passport_number": "ПС-0001",
                "address": "ул. Навои, 100",
                "landmark": "Напротив ТЦ Навои",
                "district": "Юнусабадский",
                "latitude": 41.311081,
                "longitude": 69.279737,
                "routes": "5, 12, 45, 78",
                "status": StopStatus.active,
                "condition": Condition.excellent,
                "stop_type": StopType.seven_m,
                "legs_count": 6,
                "year_built": 2020,
                "color": "Синий",
                "has_electricity": True,
                "has_trash_bin": True
            },
            {
                "stop_id": "BS-002",
                "passport_number": "ПС-0002",
                "address": "пр. Амира Темура, 45",
                "landmark": "У станции метро Космонавтов",
                "district": "Мирзо-Улугбекский",
                "latitude": 41.295695,
                "longitude": 69.275940,
                "routes": "10, 25, 67",
                "status": StopStatus.active,
                "condition": Condition.satisfactory,
                "stop_type": StopType.four_m,
                "legs_count": 4,
                "year_built": 2018,
                "color": "Зелёный",
                "has_electricity": True,
                "has_trash_bin": True
            },
            {
                "stop_id": "BS-003",
                "passport_number": "ПС-0003",
                "address": "ул. Бунёдкор, 12",
                "landmark": "Рядом с базаром",
                "district": "Чиланзарский",
                "latitude": 41.285432,
                "longitude": 69.204812,
                "routes": "8, 15, 33",
                "status": StopStatus.repair,
                "condition": Condition.needs_repair,
                "stop_type": StopType.four_m,
                "legs_count": 4,
                "year_built": 2015,
                "color": "Белый",
                "has_electricity": False,
                "has_trash_bin": False
            },
            {
                "stop_id": "BS-004",
                "passport_number": "ПС-0004",
                "address": "ул. Мукими, 78",
                "landmark": "У школы №45",
                "district": "Яккасарайский",
                "latitude": 41.298123,
                "longitude": 69.256789,
                "routes": "3, 22, 55",
                "status": StopStatus.active,
                "condition": Condition.excellent,
                "stop_type": StopType.seven_m,
                "legs_count": 6,
                "year_built": 2021,
                "color": "Синий",
                "has_electricity": True,
                "has_trash_bin": True
            },
            {
                "stop_id": "BS-005",
                "passport_number": "ПС-0005",
                "address": "пр. Шота Руставели, 33",
                "landmark": "Напротив поликлиники",
                "district": "Мирабадский",
                "latitude": 41.312456,
                "longitude": 69.287654,
                "routes": "7, 18, 42, 88",
                "status": StopStatus.active,
                "condition": Condition.satisfactory,
                "stop_type": StopType.four_m,
                "legs_count": 4,
                "year_built": 2019,
                "color": "Зелёный",
                "has_electricity": True,
                "has_trash_bin": True
            },
            {
                "stop_id": "BS-006",
                "passport_number": "ПС-0006",
                "address": "ул. Фаргона йули, 200",
                "landmark": "У входа в парк",
                "district": "Яшнабадский",
                "latitude": 41.278901,
                "longitude": 69.345678,
                "routes": "11, 29, 61",
                "status": StopStatus.dismantled,
                "condition": Condition.critical,
                "stop_type": StopType.four_m,
                "legs_count": 4,
                "year_built": 2010,
                "color": "Серый",
                "has_electricity": False,
                "has_trash_bin": False
            },
            {
                "stop_id": "BS-007",
                "passport_number": "ПС-0007",
                "address": "ул. Чилонзор, 5 квартал",
                "landmark": "Рядом с метро",
                "district": "Чиланзарский",
                "latitude": 41.276543,
                "longitude": 69.198765,
                "routes": "2, 14, 36, 77",
                "status": StopStatus.active,
                "condition": Condition.needs_repair,
                "stop_type": StopType.seven_m,
                "legs_count": 6,
                "year_built": 2017,
                "color": "Синий",
                "has_electricity": True,
                "has_trash_bin": True
            },
            {
                "stop_id": "BS-008",
                "passport_number": "ПС-0008",
                "address": "ул. Беруни, 156",
                "landmark": "Около больницы",
                "district": "Учтепинский",
                "latitude": 41.323456,
                "longitude": 69.212345,
                "routes": "9, 23, 48",
                "status": StopStatus.active,
                "condition": Condition.excellent,
                "stop_type": StopType.four_m,
                "legs_count": 4,
                "year_built": 2022,
                "color": "Белый",
                "has_electricity": True,
                "has_trash_bin": True
            },
            {
                "stop_id": "BS-009",
                "passport_number": "ПС-0009",
                "address": "ул. Сергели, 7А",
                "landmark": "У ТЦ Сергели",
                "district": "Сергелийский",
                "latitude": 41.245678,
                "longitude": 69.198234,
                "routes": "17, 35, 52",
                "status": StopStatus.inactive,
                "condition": Condition.critical,
                "stop_type": StopType.four_m,
                "legs_count": 2,
                "year_built": 2012,
                "color": "Серый",
                "has_electricity": False,
                "has_trash_bin": False
            },
            {
                "stop_id": "BS-010",
                "passport_number": "ПС-0010",
                "address": "ул. Юнусабад, 19 квартал",
                "landmark": "Напротив банка",
                "district": "Юнусабадский",
                "latitude": 41.365432,
                "longitude": 69.287123,
                "routes": "6, 19, 44, 89",
                "status": StopStatus.active,
                "condition": Condition.satisfactory,
                "stop_type": StopType.seven_m,
                "legs_count": 6,
                "year_built": 2019,
                "color": "Зелёный",
                "has_electricity": True,
                "has_trash_bin": True
            }
        ]
        
        for stop_data in stops_data:
            existing = db.query(BusStop).filter(BusStop.stop_id == stop_data["stop_id"]).first()
            if not existing:
                # Находим район
                district = db.query(District).filter(District.name == stop_data["district"]).first()
                
                stop = BusStop(
                    stop_id=stop_data["stop_id"],
                    passport_number=stop_data["passport_number"],
                    address=stop_data["address"],
                    landmark=stop_data["landmark"],
                    district_id=district.id if district else None,
                    latitude=stop_data["latitude"],
                    longitude=stop_data["longitude"],
                    routes=stop_data["routes"],
                    status=stop_data["status"],
                    condition=stop_data["condition"],
                    stop_type=stop_data["stop_type"],
                    legs_count=stop_data["legs_count"],
                    year_built=stop_data["year_built"],
                    color=stop_data["color"],
                    has_electricity=stop_data["has_electricity"],
                    has_trash_bin=stop_data["has_trash_bin"],
                    meets_standards=True,
                    seats_condition=stop_data["condition"],
                    roof_type=RoofType.arched,
                    roof_condition=stop_data["condition"],
                    glass_condition=stop_data["condition"]
                )
                db.add(stop)
                print(f"✅ Создана остановка: {stop_data['stop_id']} - {stop_data['address']}")
        
        db.commit()
        
        print("\n" + "="*50)
        print("✅ База данных успешно заполнена!")
        print("="*50)
        print("\n📋 Данные для входа:")
        print("-"*50)
        print("| Логин      | Пароль       | Роль          |")
        print("-"*50)
        print("| admin      | admin123     | Администратор |")
        print("| inspector  | inspector123 | Инспектор     |")
        print("| viewer     | viewer123    | Просмотр      |")
        print("-"*50)
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Заполнение базы данных...")
    seed_database()
