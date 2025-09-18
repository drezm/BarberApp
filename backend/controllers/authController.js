const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authController = {
  // Регистрация пользователя
  async register(req, res) {
    try {
      const { email, password, firstName, lastName, phone, role = 'client' } = req.body;

      // Валидация
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          error: 'Обязательные поля: email, password, firstName, lastName'
        });
      }

      // Проверка существования пользователя
      const existingUser = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          error: 'Пользователь с таким email уже существует'
        });
      }

      // Хеширование пароля
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Создание пользователя
      const result = await db.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, phone, role) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id, email, first_name, last_name, phone, role, created_at`,
        [email, passwordHash, firstName, lastName, phone, role]
      );

      const newUser = result.rows[0];

      // Создание JWT токена
      const token = jwt.sign(
        { 
          userId: newUser.id, 
          email: newUser.email, 
          role: newUser.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        message: 'Пользователь успешно зарегистрирован',
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          phone: newUser.phone,
          role: newUser.role
        },
        token
      });
    } catch (error) {
      console.error('Ошибка при регистрации:', error);
      res.status(500).json({
        error: 'Ошибка при регистрации пользователя'
      });
    }
  },

  // Авторизация пользователя
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email и пароль обязательны для заполнения'
        });
      }

      // Поиск пользователя
      const result = await db.query(
        'SELECT id, email, password_hash, first_name, last_name, phone, role FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          error: 'Неверный email или пароль'
        });
      }

      const user = result.rows[0];

      // Проверка пароля
      const passwordValid = await bcrypt.compare(password, user.password_hash);
      if (!passwordValid) {
        return res.status(401).json({
          error: 'Неверный email или пароль'
        });
      }

      // Создание JWT токена
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Успешная авторизация',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          role: user.role
        },
        token
      });
    } catch (error) {
      console.error('Ошибка при авторизации:', error);
      res.status(500).json({
        error: 'Ошибка при авторизации'
      });
    }
  },

  // Получение профиля пользователя
  async getProfile(req, res) {
    try {
      const userId = req.user.userId;

      const result = await db.query(
        'SELECT id, email, first_name, last_name, phone, role, avatar_url, created_at FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Пользователь не найден'
        });
      }

      const user = result.rows[0];

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          role: user.role,
          avatarUrl: user.avatar_url,
          createdAt: user.created_at
        }
      });
    } catch (error) {
      console.error('Ошибка при получении профиля:', error);
      res.status(500).json({
        error: 'Ошибка при получении профиля'
      });
    }
  },

  // Обновление профиля
  async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const { firstName, lastName, phone } = req.body;

      const result = await db.query(
        `UPDATE users 
         SET first_name = $1, last_name = $2, phone = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING id, email, first_name, last_name, phone, role, avatar_url`,
        [firstName, lastName, phone, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Пользователь не найден'
        });
      }

      const user = result.rows[0];

      res.json({
        message: 'Профиль успешно обновлен',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          role: user.role,
          avatarUrl: user.avatar_url
        }
      });
    } catch (error) {
      console.error('Ошибка при обновлении профиля:', error);
      res.status(500).json({
        error: 'Ошибка при обновлении профиля'
      });
    }
  }
};

module.exports = authController;
