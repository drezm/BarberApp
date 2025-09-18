// backend/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Импорт маршрутов
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const masterRoutes = require('./routes/masters');
const serviceRoutes = require('./routes/services');
const appointmentRoutes = require('./routes/appointments');

// Базовая защита
// Отключаем встроенный CSP от helmet и задаём собственный CSP, где разрешены inline-обработчики
app.use(helmet({ contentSecurityPolicy: false }));

// Разрешаем inline-скрипты и inline-атрибуты (onclick и т.п.) — это нужно,
// потому что в верстке и шаблонах используются onclick/онлайн-обработчики.
// В продакшене лучше заменить inline-обработчики на addEventListener + nonce/hash CSP.
app.use((req, res, next) => {
  // Разрешаем локальные ресурсы, inline-скрипты, атрибуты-обработчики и inline-стили
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; script-src-attr 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  );
  next();
});

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Ограничение частоты запросов
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Слишком много запросов, попробуйте позже.' }
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Статические файлы (фронтенд)
app.use(express.static(path.join(__dirname, '../frontend')));

// API маршруты
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/masters', masterRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/appointments', appointmentRoutes);

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint не найден' });
  }
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Глобальная обработка ошибок
app.use((error, req, res, next) => {
  console.error('Ошибка сервера:', error);
  res.status(500).json({
    error: 'Внутренняя ошибка сервера',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Что-то пошло не так'
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Не найдено', message: 'Запрашиваемый ресурс не существует' });
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
});

process.on('SIGTERM', () => { console.log('SIGTERM'); process.exit(0); });
process.on('SIGINT', () => { console.log('SIGINT'); process.exit(0); });

module.exports = app;
