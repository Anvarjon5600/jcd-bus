-- ============================================================
-- SQL Schema для системы инвентаризации автобусных остановок
-- База данных: PostgreSQL 14+
-- ============================================================

-- Удаляем таблицы если существуют (для чистой установки)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS change_logs CASCADE;
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS bus_stops CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS districts CASCADE;
DROP TABLE IF EXISTS routes CASCADE;

-- Удаляем ENUM типы если существуют
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS stop_status CASCADE;
DROP TYPE IF EXISTS condition_type CASCADE;
DROP TYPE IF EXISTS stop_type CASCADE;
DROP TYPE IF EXISTS roof_type CASCADE;


-- ============================================================
-- ENUM типы
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'inspector', 'viewer');
CREATE TYPE stop_status AS ENUM ('active', 'repair', 'dismantled', 'inactive');
CREATE TYPE condition_type AS ENUM ('excellent', 'satisfactory', 'needs_repair', 'critical');
CREATE TYPE stop_type AS ENUM ('4m', '7m');
CREATE TYPE roof_type AS ENUM ('flat', 'arched', 'peaked');


-- ============================================================
-- Таблица пользователей
-- ============================================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'viewer',
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Безопасность
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    last_login TIMESTAMP,
    password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Метаданные
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);


-- ============================================================
-- Таблица refresh токенов
-- ============================================================

CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP,
    
    -- Информация о сессии
    ip_address VARCHAR(45),
    user_agent VARCHAR(500)
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);


-- ============================================================
-- Таблица остановок
-- ============================================================

CREATE TABLE bus_stops (
    id SERIAL PRIMARY KEY,
    stop_id VARCHAR(20) UNIQUE NOT NULL,  -- BS-001
    passport_number VARCHAR(50) UNIQUE,    -- TP-2024-0001
    
    -- Адрес
    address VARCHAR(500) NOT NULL,
    landmark VARCHAR(255),
    district VARCHAR(100) NOT NULL,
    routes VARCHAR(255),
    
    -- Координаты
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    
    -- Статус и состояние
    status stop_status DEFAULT 'active',
    condition condition_type DEFAULT 'satisfactory',
    meets_standards BOOLEAN DEFAULT TRUE,
    
    -- Конструкция
    stop_type stop_type DEFAULT '4m',
    legs_count INTEGER DEFAULT 2 CHECK (legs_count IN (2, 4, 6)),
    year_built INTEGER CHECK (year_built >= 1990 AND year_built <= 2030),
    last_repair_date TIMESTAMP,
    paint_color VARCHAR(50),
    
    -- Состояния элементов
    seats_condition condition_type DEFAULT 'satisfactory',
    
    -- Крыша
    roof_type roof_type DEFAULT 'flat',
    roof_color VARCHAR(50),
    roof_condition condition_type DEFAULT 'satisfactory',
    has_roof_slif BOOLEAN DEFAULT FALSE,
    
    -- Стёкла
    glass_condition condition_type DEFAULT 'satisfactory',
    glass_mount_condition condition_type DEFAULT 'satisfactory',
    glass_replacement_count INTEGER DEFAULT 0,
    
    -- Дополнительно
    has_electricity BOOLEAN DEFAULT FALSE,
    has_bin BOOLEAN DEFAULT FALSE,
    bin_condition condition_type,
    hanging_elements VARCHAR(255),
    fasteners VARCHAR(255),
    
    -- Инспекция
    last_inspection_date TIMESTAMP,
    inspector_name VARCHAR(255),
    next_inspection_date TIMESTAMP,
    
    -- Метаданные
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_bus_stops_stop_id ON bus_stops(stop_id);
CREATE INDEX idx_bus_stops_district ON bus_stops(district);
CREATE INDEX idx_bus_stops_status ON bus_stops(status);
CREATE INDEX idx_bus_stops_condition ON bus_stops(condition);
CREATE INDEX idx_bus_stops_location ON bus_stops(latitude, longitude);
CREATE INDEX idx_bus_stops_status_condition ON bus_stops(status, condition);


-- ============================================================
-- Таблица фотографий
-- ============================================================

CREATE TABLE photos (
    id SERIAL PRIMARY KEY,
    bus_stop_id INTEGER NOT NULL REFERENCES bus_stops(id) ON DELETE CASCADE,
    
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(50),
    
    is_main BOOLEAN DEFAULT FALSE,
    
    -- Метаданные
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by INTEGER REFERENCES users(id),
    uploader_name VARCHAR(255)
);

CREATE INDEX idx_photos_bus_stop_id ON photos(bus_stop_id);
CREATE INDEX idx_photos_is_main ON photos(is_main);


-- ============================================================
-- Журнал изменений остановок
-- ============================================================

CREATE TABLE change_logs (
    id SERIAL PRIMARY KEY,
    bus_stop_id INTEGER NOT NULL REFERENCES bus_stops(id) ON DELETE CASCADE,
    
    user_id INTEGER REFERENCES users(id),
    user_name VARCHAR(255) NOT NULL,
    
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45)
);

CREATE INDEX idx_change_logs_bus_stop_id ON change_logs(bus_stop_id);
CREATE INDEX idx_change_logs_stop_date ON change_logs(bus_stop_id, changed_at);


-- ============================================================
-- Журнал аудита (все действия в системе)
-- ============================================================

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    
    user_id INTEGER REFERENCES users(id),
    user_email VARCHAR(255),
    
    action VARCHAR(50) NOT NULL,  -- login, create, update, delete, export
    resource_type VARCHAR(50) NOT NULL,  -- user, stop, photo, report
    resource_id VARCHAR(50),
    
    details JSONB,
    
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_user_date ON audit_logs(user_id, timestamp);


-- ============================================================
-- Справочник районов
-- ============================================================

CREATE TABLE districts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- Справочник маршрутов
-- ============================================================

CREATE TABLE routes (
    id SERIAL PRIMARY KEY,
    number VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- Начальные данные
-- ============================================================

-- Администратор по умолчанию (пароль: admin123)
-- Хеш bcrypt для "admin123"
INSERT INTO users (email, password_hash, name, role, is_active) VALUES
('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.V4ferxEVK5xdSi', 'Администратор', 'admin', TRUE),
('inspector', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.V4ferxEVK5xdSi', 'Инспектор', 'inspector', TRUE),
('viewer', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.V4ferxEVK5xdSi', 'Пользователь', 'viewer', TRUE);

-- Районы Ташкента
INSERT INTO districts (name) VALUES
('Алмазарский'),
('Бектемирский'),
('Мирабадский'),
('Мирзо-Улугбекский'),
('Сергелийский'),
('Учтепинский'),
('Чиланзарский'),
('Шайхантаурский'),
('Юнусабадский'),
('Яккасарайский'),
('Яшнабадский');

-- Тестовые остановки
INSERT INTO bus_stops (
    stop_id, passport_number, address, landmark, district, routes,
    latitude, longitude, status, condition, meets_standards,
    stop_type, legs_count, year_built, paint_color,
    seats_condition, roof_type, roof_color, roof_condition,
    has_electricity, has_bin, bin_condition
) VALUES
('BS-001', 'TP-2024-0001', 'ул. Навои, 12', 'Напротив ТЦ Навои', 'Юнусабадский', '45, 67, 89',
 41.3111, 69.2797, 'active', 'excellent', TRUE,
 '7m', 4, 2022, 'Синий',
 'excellent', 'arched', 'Серебристый', 'excellent',
 TRUE, TRUE, 'excellent'),
 
('BS-002', 'TP-2024-0002', 'пр. Амира Темура, 45', 'У метро Амир Темур', 'Мирзо-Улугбекский', '12, 34, 56',
 41.3089, 69.2850, 'active', 'satisfactory', TRUE,
 '4m', 2, 2020, 'Зелёный',
 'satisfactory', 'flat', 'Зелёный', 'satisfactory',
 TRUE, TRUE, 'satisfactory'),
 
('BS-003', 'TP-2024-0003', 'ул. Мукими, 78', 'Рядом с базаром', 'Чиланзарский', '23, 45',
 41.2856, 69.2044, 'repair', 'needs_repair', FALSE,
 '4m', 2, 2018, 'Белый',
 'needs_repair', 'flat', 'Белый', 'needs_repair',
 FALSE, FALSE, NULL),
 
('BS-004', 'TP-2024-0004', 'ул. Фурката, 5', 'У парка Фурката', 'Яккасарайский', '11, 22, 33',
 41.2983, 69.2683, 'active', 'excellent', TRUE,
 '7m', 6, 2023, 'Синий',
 'excellent', 'arched', 'Синий', 'excellent',
 TRUE, TRUE, 'excellent'),
 
('BS-005', 'TP-2024-0005', 'ул. Шота Руставели, 100', 'Около университета', 'Мирабадский', '5, 15, 25',
 41.3150, 69.2550, 'inactive', 'critical', FALSE,
 '4m', 2, 2015, 'Серый',
 'critical', 'flat', 'Серый', 'critical',
 FALSE, FALSE, NULL);


-- ============================================================
-- Триггер для автоматического обновления updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bus_stops_updated_at
    BEFORE UPDATE ON bus_stops
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- Права доступа (опционально, для production)
-- ============================================================

-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bus_admin;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bus_admin;


-- ============================================================
-- Готово!
-- ============================================================

SELECT 'Database schema created successfully!' AS status;
SELECT 'Default users: admin/admin123, inspector/inspector123, viewer/viewer123' AS info;
