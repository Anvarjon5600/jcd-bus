# 🚌 JCDecaux Bus Stop Inventory System

> Система инвентаризации автобусных остановок г. Ташкент — JCDecaux Uzbekistan

![Tech Stack](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat-square&logo=fastapi)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)

---

## 📋 О проекте

Веб-приложение для управления и инвентаризации автобусных остановок города Ташкент. Позволяет инспекторам проводить осмотры, загружать фотографии, отслеживать состояние объектов и формировать отчёты.

### Возможности

- 🗺️ **Интерактивная карта** — просмотр всех остановок на карте Ташкента
- 📋 **Инвентаризация** — учёт состояния каждой остановки
- 📷 **Фотофиксация** — загрузка и хранение фотографий объектов
- 📊 **Отчёты** — экспорт данных в Excel и PDF
- 👥 **Роли пользователей** — Admin, Inspector, Viewer
- 🔐 **JWT авторизация** — безопасный доступ к системе

---

## 🛠️ Технологии

| Слой | Технология |
|------|-----------|
| **Backend** | Python 3.11, FastAPI, SQLAlchemy, Gunicorn |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS |
| **База данных** | PostgreSQL 16 |
| **Карты** | Leaflet.js |
| **Графики** | Recharts |
| **Деплой** | Docker, Docker Compose, Nginx |

---

## 🚀 Быстрый запуск (Docker)

### 1. Клонировать репозиторий
```bash
git clone https://github.com/Anvarjon5600/jcd-bus.git
cd jcd-bus
```

### 2. Настроить переменные окружения
```bash
cp .env.example .env
nano .env
```

Обязательно заполни:
```env
POSTGRES_PASSWORD=твой_пароль
SECRET_KEY=случайная_строка_32_символа
REFRESH_SECRET_KEY=ещё_одна_случайная_строка
ALLOWED_ORIGINS=http://IP_СЕРВЕРА
```

> Генерация секретных ключей:
> ```bash
> openssl rand -hex 32
> ```

### 3. Запустить
```bash
docker compose up -d --build
```

### 4. Открыть в браузере
```
http://localhost
```

---

## 👤 Тестовые аккаунты

| Роль | Логин | Пароль |
|------|-------|--------|
| Admin | `admin` | `admin123` |
| Inspector | `inspector@jcdecaux.uz` | `inspector123` |
| Viewer | `viewer@jcdecaux.uz` | `viewer123` |

> ⚠️ Смените пароли после первого входа в продакшне!

---

## 📁 Структура проекта

```
├── backend/                # FastAPI приложение
│   ├── main.py             # Точка входа
│   ├── models.py           # ORM модели
│   ├── routes/             # API маршруты
│   ├── middleware/         # Middleware (auth, logging, rate limit)
│   ├── core/               # Конфигурация и безопасность
│   ├── requirements.txt    # Python зависимости
│   └── Dockerfile
│
├── frontend/               # React приложение
│   ├── src/
│   │   ├── components/     # UI компоненты
│   │   ├── api/            # API клиент
│   │   └── store/          # Zustand состояние
│   ├── nginx.conf          # Nginx конфигурация
│   └── Dockerfile
│
├── docker-compose.yml      # Docker Compose конфигурация
├── .env.example            # Шаблон переменных окружения
└── README.md
```

---

## 🔌 API Endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/api/auth/login` | Авторизация |
| `GET` | `/api/stops` | Список остановок |
| `POST` | `/api/stops` | Добавить остановку |
| `GET` | `/api/stops/{id}` | Детали остановки |
| `POST` | `/api/photos` | Загрузить фото |
| `GET` | `/api/reports/excel` | Экспорт Excel |
| `GET` | `/api/reports/pdf` | Экспорт PDF |
| `GET` | `/api/health` | Проверка состояния |

Полная документация API: `http://localhost:8000/docs`

---

## 🐳 Docker команды

```bash
# Запустить
docker compose up -d --build

# Остановить
docker compose down

# Логи
docker compose logs -f

# Перезапустить сервис
docker compose restart backend

# Статус контейнеров
docker compose ps
```

---

## 🔄 Обновление на сервере

```bash
git pull
docker compose up -d --build
```

---

## 📄 Лицензия

© 2024 JCDecaux Uzbekistan. Все права защищены.
