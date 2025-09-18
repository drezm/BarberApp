// backend/controllers/masterController.js
const db = require('../config/database');
const bcrypt = require('bcrypt');

// Функция для валидации UUID
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

const masterController = {
  // Получение всех мастеров
  async getAllMasters(req, res) {
    try {
      const result = await db.query(`
        SELECT 
          m.id, m.first_name, m.last_name, m.phone, m.avatar_url, m.created_at,
          ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL) as services
        FROM users m
        LEFT JOIN master_services ms ON m.id = ms.master_id
        LEFT JOIN services s ON ms.service_id = s.id AND s.is_active = true
        WHERE m.role = 'master'
        GROUP BY m.id, m.first_name, m.last_name, m.phone, m.avatar_url, m.created_at
        ORDER BY m.first_name
      `);
      res.json({ masters: result.rows });
    } catch (error) {
      console.error('Ошибка при получении мастеров:', error);
      res.status(500).json({ error: 'Ошибка при получении списка мастеров' });
    }
  },

  // Получение мастера по ID (для админов)
  async getMasterById(req, res) {
    try {
      const { id } = req.params;

      // Валидация UUID
      if (!isValidUUID(id)) {
        return res.status(400).json({ error: 'Некорректный ID мастера' });
      }

      const masterResult = await db.query(
        `SELECT id, email, first_name, last_name, phone, avatar_url, created_at 
         FROM users WHERE id = $1 AND role = 'master'`,
        [id]
      );

      if (masterResult.rows.length === 0) {
        return res.status(404).json({ error: 'Мастер не найден' });
      }

      const servicesResult = await db.query(
        `SELECT s.id, s.name FROM services s
         JOIN master_services ms ON s.id = ms.service_id
         WHERE ms.master_id = $1 AND s.is_active = true`,
        [id]
      );

      const master = masterResult.rows[0];
      master.services = servicesResult.rows;

      res.json(master);
    } catch (error) {
      console.error('Ошибка при получении мастера:', error);
      res.status(500).json({ error: 'Ошибка при загрузке данных мастера' });
    }
  },

  // Создание нового мастера (для админов)
  async createMaster(req, res) {
    try {
      const { email, password, firstName, lastName, phone, serviceIds = [] } = req.body;

      console.log('Создание мастера:', { email, firstName, lastName, phone, serviceIds });

      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          error: 'Необходимо заполнить все обязательные поля: email, пароль, имя, фамилия'
        });
      }

      // Проверка email на уникальность
      const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
      if (existingUser.rows.length > 0) {
        return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      // Создание мастера
      const result = await db.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, phone, role) 
         VALUES ($1, $2, $3, $4, $5, 'master') 
         RETURNING id, email, first_name, last_name, phone, created_at`,
        [email.toLowerCase(), hashedPassword, firstName, lastName, phone]
      );

      const masterId = result.rows[0].id;
      console.log('Мастер создан с ID:', masterId);

      // Привязка услуг
      if (Array.isArray(serviceIds) && serviceIds.length > 0) {
        console.log('Привязываем услуги:', serviceIds);

        // Валидация serviceIds
        const validServiceIds = [];
        for (const serviceId of serviceIds) {
          if (isValidUUID(serviceId)) {
            validServiceIds.push(serviceId);
          } else {
            console.warn('Некорректный ID услуги:', serviceId);
          }
        }

        if (validServiceIds.length > 0) {
          const serviceInserts = validServiceIds.map(serviceId =>
            db.query('INSERT INTO master_services (master_id, service_id) VALUES ($1, $2)', [masterId, serviceId])
          );
          await Promise.all(serviceInserts);
        }
      }

      res.status(201).json({
        master: result.rows[0],
        message: 'Мастер успешно создан'
      });
    } catch (error) {
      console.error('Ошибка при создании мастера:', error);
      res.status(500).json({ error: 'Ошибка при создании мастера' });
    }
  },

  // Обновление мастера (для админов)
  async updateMaster(req, res) {
    try {
      const { id } = req.params;
      const { email, firstName, lastName, phone, serviceIds, password } = req.body;

      console.log('Обновление мастера ID:', id);
      console.log('Данные:', { email, firstName, lastName, phone, serviceIds, password: !!password });

      // Валидация UUID мастера
      if (!isValidUUID(id)) {
        return res.status(400).json({ error: 'Некорректный ID мастера' });
      }

      // Проверяем существование мастера
      const existingMaster = await db.query(
        'SELECT id, email FROM users WHERE id = $1 AND role = $2',
        [id, 'master']
      );

      if (existingMaster.rows.length === 0) {
        return res.status(404).json({ error: 'Мастер не найден' });
      }

      // Проверка email на уникальность
      if (email && email.toLowerCase() !== existingMaster.rows[0].email) {
        const emailExists = await db.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [email.toLowerCase(), id]
        );
        if (emailExists.rows.length > 0) {
          return res.status(409).json({ error: 'Email уже используется' });
        }
      }

      // Подготовка данных для обновления
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
      if (password && password.trim()) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateFields.push(`password_hash = $${paramCounter}`);
        updateValues.push(hashedPassword);
        paramCounter++;
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        updateValues.push(id);

        const query = `
          UPDATE users 
          SET ${updateFields.join(', ')} 
          WHERE id = $${paramCounter} AND role = 'master'
          RETURNING id, email, first_name, last_name, phone, updated_at
        `;
        
        console.log('Executing query:', query);
        console.log('With values:', updateValues);
        
        await db.query(query, updateValues);
      }

      // Обновление услуг
      if (Array.isArray(serviceIds)) {
        console.log('Обновляем услуги мастера:', serviceIds);
        
        // Удаляем старые связи
        await db.query('DELETE FROM master_services WHERE master_id = $1', [id]);
        
        // Добавляем новые связи
        if (serviceIds.length > 0) {
          // Валидация serviceIds
          const validServiceIds = [];
          for (const serviceId of serviceIds) {
            if (isValidUUID(serviceId)) {
              validServiceIds.push(serviceId);
            } else {
              console.warn('Некорректный ID услуги при обновлении:', serviceId);
            }
          }

          if (validServiceIds.length > 0) {
            const serviceInserts = validServiceIds.map(serviceId =>
              db.query('INSERT INTO master_services (master_id, service_id) VALUES ($1, $2)', [id, serviceId])
            );
            await Promise.all(serviceInserts);
          }
        }
      }

      res.json({ message: 'Мастер успешно обновлён' });
    } catch (error) {
      console.error('Ошибка при обновлении мастера:', error);
      res.status(500).json({ error: 'Ошибка при обновлении мастера' });
    }
  },

  // Удаление мастера (для админов)
  async deleteMaster(req, res) {
    try {
      const { id } = req.params;

      // Валидация UUID
      if (!isValidUUID(id)) {
        return res.status(400).json({ error: 'Некорректный ID мастера' });
      }

      // Проверяем существование мастера
      const existingMaster = await db.query('SELECT id FROM users WHERE id = $1 AND role = $2', [id, 'master']);
      if (existingMaster.rows.length === 0) {
        return res.status(404).json({ error: 'Мастер не найден' });
      }

      // Проверяем активные записи
      const activeAppointments = await db.query(
        'SELECT COUNT(*) as count FROM appointments WHERE master_id = $1 AND status = $2',
        [id, 'scheduled']
      );

      if (parseInt(activeAppointments.rows[0].count) > 0) {
        return res.status(400).json({
          error: 'Невозможно удалить мастера с активными записями'
        });
      }

      // Удаляем связи с услугами и самого мастера
      await db.query('DELETE FROM master_services WHERE master_id = $1', [id]);
      await db.query('DELETE FROM users WHERE id = $1', [id]);

      res.json({ message: 'Мастер успешно удалён' });
    } catch (error) {
      console.error('Ошибка при удалении мастера:', error);
      res.status(500).json({ error: 'Ошибка при удалении мастера' });
    }
  },

  // Получение расписания мастера
  async getMasterSchedule(req, res) {
    try {
      const { masterId } = req.params;
      const { date } = req.query;

      // Валидация UUID
      if (!isValidUUID(masterId)) {
        return res.status(400).json({ error: 'Некорректный ID мастера' });
      }

      let query = `
        SELECT id, date, start_time, end_time, is_available
        FROM master_schedules
        WHERE master_id = $1
      `;
      const params = [masterId];

      if (date) {
        query += ' AND date = $2';
        params.push(date);
      } else {
        query += " AND date >= CURRENT_DATE AND date <= CURRENT_DATE + INTERVAL '14 days'";
      }

      query += ' ORDER BY date, start_time';

      const result = await db.query(query, params);
      res.json({ schedule: result.rows });
    } catch (error) {
      console.error('Ошибка при получении расписания мастера:', error);
      res.status(500).json({ error: 'Ошибка при получении расписания' });
    }
  },

  async createSchedule(req, res) {
    try {
      const masterId = req.user.userId;
      const { date, timeSlots } = req.body;

      if (!date || !timeSlots || !Array.isArray(timeSlots)) {
        return res.status(400).json({ error: 'Необходимо указать дату и временные слоты' });
      }

      await db.query(
        'DELETE FROM master_schedules WHERE master_id = $1 AND date = $2 AND is_available = true',
        [masterId, date]
      );

      const insertPromises = timeSlots.map(({ startTime, endTime }) =>
        db.query(
          'INSERT INTO master_schedules (master_id, date, start_time, end_time, is_available) VALUES ($1, $2, $3, $4, true)',
          [masterId, date, startTime, endTime]
        )
      );
      await Promise.all(insertPromises);

      res.json({ message: 'Расписание успешно создано' });
    } catch (error) {
      console.error('Ошибка при создании расписания:', error);
      res.status(500).json({ error: 'Ошибка при создании расписания' });
    }
  },

  async getMasterStats(req, res) {
    try {
      const masterId = req.user.userId;

      const statsQuery = `
        SELECT 
          COUNT(*) as total_appointments,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_appointments,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_appointments,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN total_price ELSE 0 END), 0) as total_earnings,
          COALESCE(AVG(CASE WHEN status = 'completed' THEN total_price END), 0) as avg_appointment_price
        FROM appointments
        WHERE master_id = $1 AND appointment_date >= CURRENT_DATE - INTERVAL '30 days'
      `;
      const statsRes = await db.query(statsQuery, [masterId]);
      const stats = statsRes.rows[0];

      const todayAppointments = await db.query(`
        SELECT 
          a.start_time, a.end_time, a.status,
          s.name as service_name,
          c.first_name || ' ' || c.last_name as client_name
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        JOIN users c ON a.client_id = c.id
        WHERE a.master_id = $1 AND a.appointment_date = CURRENT_DATE
        ORDER BY a.start_time
      `, [masterId]);

      res.json({
        stats: {
          totalAppointments: parseInt(stats.total_appointments, 10),
          completedAppointments: parseInt(stats.completed_appointments, 10),
          cancelledAppointments: parseInt(stats.cancelled_appointments, 10),
          totalEarnings: parseFloat(stats.total_earnings),
          avgAppointmentPrice: parseFloat(stats.avg_appointment_price)
        },
        todayAppointments: todayAppointments.rows
      });
    } catch (error) {
      console.error('Ошибка при получении статистики мастера:', error);
      res.status(500).json({ error: 'Ошибка при получении статистики' });
    }
  },

  async getMasterServices(req, res) {
    try {
      const { masterId } = req.params;

      // Валидация UUID
      if (!isValidUUID(masterId)) {
        return res.status(400).json({ error: 'Некорректный ID мастера' });
      }

      const result = await db.query(`
        SELECT s.id, s.name, s.description, s.price, s.duration_minutes
        FROM services s
        JOIN master_services ms ON s.id = ms.service_id
        WHERE ms.master_id = $1 AND s.is_active = true
        ORDER BY s.name
      `, [masterId]);

      res.json({ services: result.rows });
    } catch (error) {
      console.error('Ошибка при получении услуг мастера:', error);
      res.status(500).json({ error: 'Ошибка при получении услуг мастера' });
    }
  }
};

module.exports = masterController;
