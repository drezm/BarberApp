const db = require('../config/database');

const appointmentController = {
  // Создание новой записи
  async createAppointment(req, res) {
    try {
      const { masterId, serviceId, appointmentDate, startTime } = req.body;
      const clientId = req.user.userId;

      // Валидация
      if (!masterId || !serviceId || !appointmentDate || !startTime) {
        return res.status(400).json({
          error: 'Все поля обязательны для заполнения'
        });
      }

      // Проверяем доступность времени
      const scheduleCheck = await db.query(
        `SELECT id FROM master_schedules 
         WHERE master_id = $1 AND date = $2 AND start_time = $3 AND is_available = true`,
        [masterId, appointmentDate, startTime]
      );

      if (scheduleCheck.rows.length === 0) {
        return res.status(400).json({
          error: 'Выбранное время недоступно'
        });
      }

      // Получаем информацию об услуге
      const serviceInfo = await db.query(
        'SELECT name, price, duration_minutes FROM services WHERE id = $1',
        [serviceId]
      );

      if (serviceInfo.rows.length === 0) {
        return res.status(404).json({
          error: 'Услуга не найдена'
        });
      }

      const service = serviceInfo.rows[0];
      const endTime = new Date(`1970-01-01 ${startTime}`);
      endTime.setMinutes(endTime.getMinutes() + service.duration_minutes);
      const endTimeStr = endTime.toTimeString().slice(0, 5);

      // Создаем запись
      const result = await db.query(
        `INSERT INTO appointments (client_id, master_id, service_id, appointment_date, start_time, end_time, total_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, appointment_date, start_time, end_time, status, total_price`,
        [clientId, masterId, serviceId, appointmentDate, startTime, endTimeStr, service.price]
      );

      // Помечаем время как занятое
      await db.query(
        'UPDATE master_schedules SET is_available = false WHERE master_id = $1 AND date = $2 AND start_time = $3',
        [masterId, appointmentDate, startTime]
      );

      res.status(201).json({
        message: 'Запись успешно создана',
        appointment: result.rows[0]
      });
    } catch (error) {
      console.error('Ошибка при создании записи:', error);
      res.status(500).json({
        error: 'Ошибка при создании записи'
      });
    }
  },

  // Получение записей клиента
  async getClientAppointments(req, res) {
    try {
      const clientId = req.user.userId;

      const result = await db.query(
        `SELECT 
          a.id, a.appointment_date, a.start_time, a.end_time, 
          a.status, a.total_price, a.notes, a.created_at,
          s.name as service_name, s.duration_minutes,
          m.first_name || ' ' || m.last_name as master_name
         FROM appointments a
         JOIN services s ON a.service_id = s.id
         JOIN users m ON a.master_id = m.id
         WHERE a.client_id = $1
         ORDER BY a.appointment_date DESC, a.start_time DESC`,
        [clientId]
      );

      res.json({
        appointments: result.rows
      });
    } catch (error) {
      console.error('Ошибка при получении записей:', error);
      res.status(500).json({
        error: 'Ошибка при получении записей'
      });
    }
  },

  // Получение записей мастера
  async getMasterAppointments(req, res) {
    try {
      const masterId = req.user.userId;
      const { date } = req.query;

      let query = `
        SELECT 
          a.id, a.appointment_date, a.start_time, a.end_time, 
          a.status, a.total_price, a.notes, a.created_at,
          s.name as service_name, s.duration_minutes,
          c.first_name || ' ' || c.last_name as client_name,
          c.phone as client_phone
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        JOIN users c ON a.client_id = c.id
        WHERE a.master_id = $1
      `;

      const params = [masterId];

      if (date) {
        query += ' AND a.appointment_date = $2';
        params.push(date);
      }

      query += ' ORDER BY a.appointment_date ASC, a.start_time ASC';

      const result = await db.query(query, params);

      res.json({
        appointments: result.rows
      });
    } catch (error) {
      console.error('Ошибка при получении записей мастера:', error);
      res.status(500).json({
        error: 'Ошибка при получении записей'
      });
    }
  },

  // Получение всех записей (для админа)
  async getAllAppointments(req, res) {
    try {
      const result = await db.query(`
        SELECT * FROM appointments_view
        ORDER BY appointment_date DESC, start_time DESC
        LIMIT 100
      `);

      res.json({
        appointments: result.rows
      });
    } catch (error) {
      console.error('Ошибка при получении всех записей:', error);
      res.status(500).json({
        error: 'Ошибка при получении записей'
      });
    }
  },

  // Отмена записи
  async cancelAppointment(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const userRole = req.user.role;

      // Получаем информацию о записи
      const appointmentInfo = await db.query(
        'SELECT client_id, master_id, appointment_date, start_time FROM appointments WHERE id = $1',
        [id]
      );

      if (appointmentInfo.rows.length === 0) {
        return res.status(404).json({
          error: 'Запись не найдена'
        });
      }

      const appointment = appointmentInfo.rows[0];

      // Проверяем права доступа
      if (userRole !== 'admin' && userId !== appointment.client_id && userId !== appointment.master_id) {
        return res.status(403).json({
          error: 'Нет прав для отмены этой записи'
        });
      }

      // Отменяем запись
      await db.query(
        'UPDATE appointments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['cancelled', id]
      );

      // Освобождаем время в расписании мастера
      await db.query(
        'UPDATE master_schedules SET is_available = true WHERE master_id = $1 AND date = $2 AND start_time = $3',
        [appointment.master_id, appointment.appointment_date, appointment.start_time]
      );

      res.json({
        message: 'Запись успешно отменена'
      });
    } catch (error) {
      console.error('Ошибка при отмене записи:', error);
      res.status(500).json({
        error: 'Ошибка при отмене записи'
      });
    }
  },

  // Завершение записи (для мастера/админа)
  async completeAppointment(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const result = await db.query(
        'UPDATE appointments SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
        ['completed', notes || '', id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Запись не найдена'
        });
      }

      res.json({
        message: 'Запись отмечена как выполненная',
        appointment: result.rows[0]
      });
    } catch (error) {
      console.error('Ошибка при завершении записи:', error);
      res.status(500).json({
        error: 'Ошибка при завершении записи'
      });
    }
  }
};

module.exports = appointmentController;
