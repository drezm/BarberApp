// backend/controllers/clientController.js
const db = require('../config/database');
const bcrypt = require('bcrypt');

const clientController = {
  // Получение всех клиентов (только для админов)
  async getAllClients(req, res) {
    try {
      const result = await db.query(`
        SELECT 
          id, email, first_name, last_name, phone, 
          created_at, updated_at
        FROM users 
        WHERE role = 'client' 
        ORDER BY created_at DESC
      `);

      res.json({
        clients: result.rows,
        message: 'Клиенты загружены успешно'
      });
    } catch (error) {
      console.error('Ошибка при получении клиентов:', error);
      res.status(500).json({
        error: 'Ошибка при загрузке списка клиентов'
      });
    }
  },

  // Получение клиента по ID (только для админов)
  async getClientById(req, res) {
    try {
      const { id } = req.params;

      const result = await db.query(
        `SELECT 
           id, email, first_name, last_name, phone, 
           created_at, updated_at
         FROM users 
         WHERE id = $1 AND role = 'client'`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Клиент не найден'
        });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Ошибка при получении клиента:', error);
      res.status(500).json({
        error: 'Ошибка при загрузке данных клиента'
      });
    }
  },

  // Создание нового клиента (только для админов)
  async createClient(req, res) {
    try {
      const { email, password, firstName, lastName, phone } = req.body;

      // Валидация обязательных полей
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          error: 'Необходимо заполнить все обязательные поля: email, пароль, имя, фамилия'
        });
      }

      // Проверка email на уникальность
      const existingUser = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          error: 'Пользователь с таким email уже существует'
        });
      }

      // Хеширование пароля
      const hashedPassword = await bcrypt.hash(password, 10);

      // Создание клиента
      const result = await db.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, phone, role) 
         VALUES ($1, $2, $3, $4, $5, 'client') 
         RETURNING id, email, first_name, last_name, phone, created_at`,
        [email.toLowerCase(), hashedPassword, firstName, lastName, phone]
      );

      res.status(201).json({
        client: result.rows[0],
        message: 'Клиент успешно создан'
      });
    } catch (error) {
      console.error('Ошибка при создании клиента:', error);
      res.status(500).json({
        error: 'Ошибка при создании клиента'
      });
    }
  },

  // Обновление данных клиента (только для админов)
  async updateClient(req, res) {
    try {
      const { id } = req.params;
      const { email, firstName, lastName, phone, password } = req.body;

      // Проверяем, существует ли клиент
      const existingClient = await db.query(
        'SELECT id, email FROM users WHERE id = $1 AND role = $2',
        [id, 'client']
      );

      if (existingClient.rows.length === 0) {
        return res.status(404).json({
          error: 'Клиент не найден'
        });
      }

      // Проверка email на уникальность (если изменяется)
      if (email && email.toLowerCase() !== existingClient.rows[0].email) {
        const emailExists = await db.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [email.toLowerCase(), id]
        );

        if (emailExists.rows.length > 0) {
          return res.status(409).json({
            error: 'Пользователь с таким email уже существует'
          });
        }
      }

      // Подготавливаем данные для обновления
      let updateFields = [];
      let updateValues = [];
      let paramCounter = 1;

      if (email) {
        updateFields.push(`email = $${paramCounter}`);
        updateValues.push(email.toLowerCase());
        paramCounter++;
      }

      if (firstName) {
        updateFields.push(`first_name = $${paramCounter}`);
        updateValues.push(firstName);
        paramCounter++;
      }

      if (lastName) {
        updateFields.push(`last_name = $${paramCounter}`);
        updateValues.push(lastName);
        paramCounter++;
      }

      if (phone !== undefined) {
        updateFields.push(`phone = $${paramCounter}`);
        updateValues.push(phone);
        paramCounter++;
      }

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateFields.push(`password_hash = $${paramCounter}`);
        updateValues.push(hashedPassword);
        paramCounter++;
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          error: 'Нет данных для обновления'
        });
      }

      // Добавляем updated_at
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(id);

      const query = `
        UPDATE users 
        SET ${updateFields.join(', ')} 
        WHERE id = $${paramCounter} AND role = 'client'
        RETURNING id, email, first_name, last_name, phone, updated_at
      `;

      const result = await db.query(query, updateValues);

      res.json({
        client: result.rows[0],
        message: 'Данные клиента успешно обновлены'
      });
    } catch (error) {
      console.error('Ошибка при обновлении клиента:', error);
      res.status(500).json({
        error: 'Ошибка при обновлении данных клиента'
      });
    }
  },

  // Удаление клиента (только для админов)
  async deleteClient(req, res) {
    try {
      const { id } = req.params;

      // Проверяем, существует ли клиент
      const existingClient = await db.query(
        'SELECT id FROM users WHERE id = $1 AND role = $2',
        [id, 'client']
      );

      if (existingClient.rows.length === 0) {
        return res.status(404).json({
          error: 'Клиент не найден'
        });
      }

      // Проверяем, есть ли у клиента активные записи
      const activeAppointments = await db.query(
        'SELECT COUNT(*) as count FROM appointments WHERE client_id = $1 AND status = $2',
        [id, 'scheduled']
      );

      if (parseInt(activeAppointments.rows[0].count) > 0) {
        return res.status(400).json({
          error: 'Невозможно удалить клиента с активными записями. Сначала отмените все записи.'
        });
      }

      // Удаляем клиента
      await db.query('DELETE FROM users WHERE id = $1', [id]);

      res.json({
        message: 'Клиент успешно удален'
      });
    } catch (error) {
      console.error('Ошибка при удалении клиента:', error);
      res.status(500).json({
        error: 'Ошибка при удалении клиента'
      });
    }
  },

  // Получение статистики клиента (для самого клиента)
  async getClientStats(req, res) {
    try {
      const clientId = req.user.userId;

      const result = await db.query(`
        SELECT 
          COUNT(*) as total_appointments,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_appointments,
          COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_appointments,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_appointments,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN total_price ELSE 0 END), 0) as total_spent
        FROM appointments 
        WHERE client_id = $1
      `, [clientId]);

      const stats = result.rows[0];

      res.json({
        stats: {
          totalAppointments: parseInt(stats.total_appointments),
          completedAppointments: parseInt(stats.completed_appointments),
          scheduledAppointments: parseInt(stats.scheduled_appointments),
          cancelledAppointments: parseInt(stats.cancelled_appointments),
          totalSpent: parseFloat(stats.total_spent)
        }
      });
    } catch (error) {
      console.error('Ошибка при получении статистики клиента:', error);
      res.status(500).json({
        error: 'Ошибка при загрузке статистики'
      });
    }
  }
};

module.exports = clientController;
