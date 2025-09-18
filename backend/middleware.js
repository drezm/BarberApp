// backend/middleware.js
const jwt = require('jsonwebtoken');
const db = require('./config/database');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Токен доступа отсутствует' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'barbershop_secret_key_2025', async (err, payload) => {
        if (err) {
            return res.status(403).json({ error: 'Недействительный токен' });
        }

        try {
            // Получаем актуальные данные пользователя
            const result = await db.query(
                'SELECT id, email, first_name, last_name, phone, role, created_at FROM users WHERE id = $1',
                [payload.userId]
            );

            if (result.rows.length === 0) {
                return res.status(403).json({ error: 'Пользователь не найден' });
            }

            req.user = {
                userId: result.rows[0].id,
                email: result.rows[0].email,
                firstName: result.rows[0].first_name,
                lastName: result.rows[0].last_name,
                phone: result.rows[0].phone,
                role: result.rows[0].role,
                createdAt: result.rows[0].created_at
            };

            next();
        } catch (error) {
            console.error('Ошибка при проверке токена:', error);
            return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
        }
    });
};

// Middleware для проверки роли администратора
const isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Пользователь не аутентифицирован' });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            error: 'Доступ запрещен. Требуются права администратора.' 
        });
    }

    next();
};

// Middleware для проверки роли мастера
const isMaster = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Пользователь не аутентифицирован' });
    }

    if (req.user.role !== 'master' && req.user.role !== 'admin') {
        return res.status(403).json({ 
            error: 'Доступ запрещен. Требуются права мастера.' 
        });
    }

    next();
};

// Middleware для проверки роли клиента (или выше)
const isClient = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Пользователь не аутентифицирован' });
    }

    // Клиенты, мастера и админы могут делать записи
    const allowedRoles = ['client', 'master', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ 
            error: 'Доступ запрещен. Неизвестная роль пользователя.' 
        });
    }

    next();
};

module.exports = {
    authenticateToken,
    isAdmin,
    isMaster,
    isClient
};
