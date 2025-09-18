-- Создание базы данных барбершопа
CREATE DATABASE barbershop_booking;

-- Подключение к базе данных
\c barbershop_booking;

-- Создание расширений
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Удаление существующих таблиц (если есть)
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS master_services CASCADE;
DROP TABLE IF EXISTS master_schedules CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Создание перечислений
CREATE TYPE user_role AS ENUM ('client', 'master', 'admin');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'completed', 'cancelled');

-- Создание таблиц
-- Таблица пользователей
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role user_role NOT NULL DEFAULT 'client',
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица услуг
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица связи мастеров с услугами
CREATE TABLE master_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    master_id UUID REFERENCES users(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(master_id, service_id)
);

-- Таблица расписаний мастеров
CREATE TABLE master_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    master_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(master_id, date, start_time)
);

-- Таблица записей
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    master_id UUID REFERENCES users(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status appointment_status DEFAULT 'scheduled',
    notes TEXT,
    total_price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_client ON appointments(client_id);
CREATE INDEX idx_appointments_master ON appointments(master_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_master_schedules_date ON master_schedules(date);
CREATE INDEX idx_master_schedules_master ON master_schedules(master_id);
