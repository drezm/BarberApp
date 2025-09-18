-- Вставка тестовых данных
\c barbershop_booking;

-- Вставка администратора
INSERT INTO users (email, password_hash, first_name, last_name, phone, role) VALUES
('admin@barbershop.ru', '$2b$10$example_hash_admin', 'Алексей', 'Администраторов', '+7(999)123-45-67', 'admin');

-- Вставка мастеров
INSERT INTO users (email, password_hash, first_name, last_name, phone, role) VALUES
('master1@barbershop.ru', '$2b$10$example_hash_master1', 'Дмитрий', 'Стригунов', '+7(999)234-56-78', 'master'),
('master2@barbershop.ru', '$2b$10$example_hash_master2', 'Андрей', 'Бритвенов', '+7(999)345-67-89', 'master'),
('master3@barbershop.ru', '$2b$10$example_hash_master3', 'Сергей', 'Усачев', '+7(999)456-78-90', 'master');

-- Вставка клиентов
INSERT INTO users (email, password_hash, first_name, last_name, phone, role) VALUES
('client1@example.com', '$2b$10$example_hash_client1', 'Иван', 'Иванов', '+7(999)567-89-01', 'client'),
('client2@example.com', '$2b$10$example_hash_client2', 'Петр', 'Петров', '+7(999)678-90-12', 'client'),
('client3@example.com', '$2b$10$example_hash_client3', 'Сидор', 'Сидоров', '+7(999)789-01-23', 'client'),
('client4@example.com', '$2b$10$example_hash_client4', 'Алексей', 'Алексеев', '+7(999)890-12-34', 'client'),
('client5@example.com', '$2b$10$example_hash_client5', 'Михаил', 'Михайлов', '+7(999)901-23-45', 'client');

-- Вставка услуг
INSERT INTO services (name, description, price, duration_minutes) VALUES
('Мужская стрижка', 'Классическая мужская стрижка с укладкой', 1500.00, 45),
('Стрижка бороды', 'Оформление и стрижка бороды', 800.00, 30),
('Стрижка усов', 'Стрижка и оформление усов', 500.00, 15),
('Бритье', 'Классическое бритье опасной бритвой', 1200.00, 40),
('Комплекс: стрижка + борода', 'Мужская стрижка + оформление бороды', 2000.00, 60),
('Детская стрижка', 'Стрижка для детей до 12 лет', 1000.00, 30),
('Укладка', 'Укладка волос', 600.00, 20),
('Мытье головы', 'Мытье головы с массажем', 400.00, 15),
('VIP комплекс', 'Полный комплекс услуг: стрижка + бритье + уход', 3500.00, 90),
('Камуфляж седины', 'Окрашивание седых волос', 1800.00, 50);

-- Получаем ID для связывания данных
-- Связываем мастеров с услугами
INSERT INTO master_services (master_id, service_id)
SELECT m.id, s.id 
FROM users m, services s 
WHERE m.role = 'master' AND m.email = 'master1@barbershop.ru' 
AND s.name IN ('Мужская стрижка', 'Стрижка бороды', 'Комплекс: стрижка + борода', 'Детская стрижка', 'Укладка');

INSERT INTO master_services (master_id, service_id)
SELECT m.id, s.id 
FROM users m, services s 
WHERE m.role = 'master' AND m.email = 'master2@barbershop.ru' 
AND s.name IN ('Мужская стрижка', 'Бритье', 'Стрижка усов', 'VIP комплекс', 'Мытье головы');

INSERT INTO master_services (master_id, service_id)
SELECT m.id, s.id 
FROM users m, services s 
WHERE m.role = 'master' AND m.email = 'master3@barbershop.ru' 
AND s.name IN ('Стрижка бороды', 'Стрижка усов', 'Камуфляж седины', 'Укладка', 'Комплекс: стрижка + борода');

-- Создаем расписание для мастеров на текущую и следующую недели
-- Мастер 1 - работает пн-пт с 9:00 до 18:00
INSERT INTO master_schedules (master_id, date, start_time, end_time, is_available)
SELECT 
    m.id,
    d.date,
    t.start_time,
    (t.start_time + INTERVAL '45 minutes')::time,
    true
FROM users m,
    (SELECT generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', '1 day')::date AS date) d,
    (SELECT unnest(ARRAY['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'])::time AS start_time) t
WHERE m.role = 'master' AND m.email = 'master1@barbershop.ru'
    AND extract(dow from d.date) BETWEEN 1 AND 5;

-- Мастер 2 - работает вт-сб с 10:00 до 19:00
INSERT INTO master_schedules (master_id, date, start_time, end_time, is_available)
SELECT 
    m.id,
    d.date,
    t.start_time,
    (t.start_time + INTERVAL '45 minutes')::time,
    true
FROM users m,
    (SELECT generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', '1 day')::date AS date) d,
    (SELECT unnest(ARRAY['10:00', '11:00', '12:00', '13:00', '15:00', '16:00', '17:00', '18:00'])::time AS start_time) t
WHERE m.role = 'master' AND m.email = 'master2@barbershop.ru'
    AND extract(dow from d.date) BETWEEN 2 AND 6;

-- Мастер 3 - работает ср-вс с 11:00 до 20:00
INSERT INTO master_schedules (master_id, date, start_time, end_time, is_available)
SELECT 
    m.id,
    d.date,
    t.start_time,
    (t.start_time + INTERVAL '45 minutes')::time,
    true
FROM users m,
    (SELECT generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', '1 day')::date AS date) d,
    (SELECT unnest(ARRAY['11:00', '12:00', '13:00', '14:00', '16:00', '17:00', '18:00', '19:00'])::time AS start_time) t
WHERE m.role = 'master' AND m.email = 'master3@barbershop.ru'
    AND extract(dow from d.date) IN (0, 3, 4, 5, 6);

-- Создаем несколько тестовых записей
INSERT INTO appointments (client_id, master_id, service_id, appointment_date, start_time, end_time, status, total_price)
SELECT 
    c.id,
    m.id,
    s.id,
    CURRENT_DATE + INTERVAL '1 day',
    '10:00',
    '10:45',
    'scheduled',
    s.price
FROM users c, users m, services s
WHERE c.email = 'client1@example.com' AND m.email = 'master1@barbershop.ru' AND s.name = 'Мужская стрижка';

INSERT INTO appointments (client_id, master_id, service_id, appointment_date, start_time, end_time, status, total_price)
SELECT 
    c.id,
    m.id,
    s.id,
    CURRENT_DATE + INTERVAL '2 days',
    '14:00',
    '15:00',
    'scheduled',
    s.price
FROM users c, users m, services s
WHERE c.email = 'client2@example.com' AND m.email = 'master2@barbershop.ru' AND s.name = 'VIP комплекс';

INSERT INTO appointments (client_id, master_id, service_id, appointment_date, start_time, end_time, status, total_price)
SELECT 
    c.id,
    m.id,
    s.id,
    CURRENT_DATE - INTERVAL '1 day',
    '15:00',
    '15:30',
    'completed',
    s.price
FROM users c, users m, services s
WHERE c.email = 'client3@example.com' AND m.email = 'master3@barbershop.ru' AND s.name = 'Стрижка бороды';

-- Обновляем расписание (помечаем занятые слоты как недоступные)
UPDATE master_schedules 
SET is_available = false
WHERE (master_id, date, start_time) IN (
    SELECT a.master_id, a.appointment_date, a.start_time
    FROM appointments a
    WHERE a.status = 'scheduled'
);

-- Создаем представления для удобства
CREATE VIEW appointments_view AS
SELECT 
    a.id,
    a.appointment_date,
    a.start_time,
    a.end_time,
    a.status,
    a.total_price,
    a.notes,
    c.first_name || ' ' || c.last_name AS client_name,
    c.phone AS client_phone,
    m.first_name || ' ' || m.last_name AS master_name,
    s.name AS service_name,
    s.duration_minutes,
    a.created_at
FROM appointments a
JOIN users c ON a.client_id = c.id
JOIN users m ON a.master_id = m.id
JOIN services s ON a.service_id = s.id
ORDER BY a.appointment_date DESC, a.start_time DESC;

CREATE VIEW master_earnings_view AS
SELECT 
    m.id AS master_id,
    m.first_name || ' ' || m.last_name AS master_name,
    DATE_TRUNC('month', a.appointment_date) AS month,
    COUNT(*) AS appointments_count,
    SUM(a.total_price) AS total_earnings,
    AVG(a.total_price) AS avg_appointment_price
FROM users m
JOIN appointments a ON m.id = a.master_id
WHERE m.role = 'master' AND a.status = 'completed'
GROUP BY m.id, m.first_name, m.last_name, DATE_TRUNC('month', a.appointment_date)
ORDER BY month DESC, total_earnings DESC;

COMMIT;
