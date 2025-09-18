// backend/controllers/appointmentController.js
const db = require('../config/database');

const appointmentController = {
  // Создание записи
  async createAppointment(req, res) {
    try {
      const clientId = req.user.userId;
      const { serviceId, masterId, appointmentDate, startTime } = req.body;

      // Валидация данных
      if (!serviceId || !masterId || !appointmentDate || !startTime) {
        return res.status(400).json({
          error: 'Необходимо заполнить все поля: услуга, мастер, дата и время'
        });
      }

      // Получаем информацию об услуге
      const serviceResult = await db.query(
        'SELECT name, price, duration_minutes FROM services WHERE id = $1 AND is_active = true',
        [serviceId]
      );

      if (serviceResult.rows.length === 0) {
        return res.status(404).json({ error: 'Услуга не найдена или неактивна' });
      }

      const service = serviceResult.rows[0];

      // Вычисляем время окончания
      const startDateTime = new Date(`${appointmentDate}T${startTime}`);
      const endDateTime = new Date(startDateTime.getTime() + service.duration_minutes * 60000);
      const endTime = endDateTime.toTimeString().slice(0, 5);

      // Проверяем, доступно ли это время у мастера
      const scheduleCheck = await db.query(
        'SELECT id FROM master_schedules WHERE master_id = $1 AND date = $2 AND start_time = $3 AND is_available = true',
        [masterId, appointmentDate, startTime]
      );

      if (scheduleCheck.rows.length === 0) {
        return res.status(400).json({
          error: 'Выбранное время недоступно'
        });
      }

      // Проверяем, нет ли уже записи на это время
      const existingAppointment = await db.query(
        'SELECT id FROM appointments WHERE master_id = $1 AND appointment_date = $2 AND start_time = $3 AND status != $4',
        [masterId, appointmentDate, startTime, 'cancelled']
      );

      if (existingAppointment.rows.length > 0) {
        return res.status(409).json({
          error: 'На выбранное время уже есть запись'
        });
      }

      // Создаем запись
      const result = await db.query(
        `INSERT INTO appointments (client_id, master_id, service_id, appointment_date, start_time, end_time, total_price, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled') 
         RETURNING id, appointment_date, start_time, end_time, total_price, status, created_at`,
        [clientId, masterId, serviceId, appointmentDate, startTime, endTime, service.price]
      );

      // Помечаем временной слот как занятый
      await db.query(
        'UPDATE master_schedules SET is_available = false WHERE master_id = $1 AND date = $2 AND start_time = $3',
        [masterId, appointmentDate, startTime]
      );

      res.status(201).json({
        appointment: result.rows[0],
        message: 'Запись успешно создана'
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

      const result = await db.query(`
        SELECT 
          a.id, a.appointment_date, a.start_time, a.end_time, a.total_price, a.status, a.notes, a.created_at,
          s.name as service_name,
          m.first_name || ' ' || m.last_name as master_name,
          m.phone as master_phone
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        JOIN users m ON a.master_id = m.id
        WHERE a.client_id = $1
        ORDER BY a.appointment_date DESC, a.start_time DESC
      `, [clientId]);

      res.json({
        appointments: result.rows,
        message: 'Записи загружены успешно'
      });
    } catch (error) {
      console.error('Ошибка при получении записей клиента:', error);
      res.status(500).json({
        error: 'Ошибка при загрузке записей'
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
          a.id, a.appointment_date, a.start_time, a.end_time, a.total_price, a.status, a.notes, a.created_at,
          s.name as service_name,
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
      
      query += ' ORDER BY a.appointment_date DESC, a.start_time DESC';

      const result = await db.query(query, params);

      res.json({
        appointments: result.rows,
        message: 'Записи загружены успешно'
      });
    } catch (error) {
      console.error('Ошибка при получении записей мастера:', error);
      res.status(500).json({
        error: 'Ошибка при загрузке записей'
      });
    }
  },

  // Получение всех записей (для админа)
  async getAllAppointments(req, res) {
    try {
      const result = await db.query(`
        SELECT 
          a.id, a.appointment_date, a.start_time, a.end_time, a.total_price, a.status, a.notes, a.created_at,
          s.name as service_name,
          c.first_name || ' ' || c.last_name as client_name,
          c.phone as client_phone,
          m.first_name || ' ' || m.last_name as master_name
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        JOIN users c ON a.client_id = c.id
        JOIN users m ON a.master_id = m.id
        ORDER BY a.appointment_date DESC, a.start_time DESC
      `);

      res.json({
        appointments: result.rows,
        message: 'Все записи загружены успешно'
      });
    } catch (error) {
      console.error('Ошибка при получении всех записей:', error);
      res.status(500).json({
        error: 'Ошибка при загрузке записей'
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
      const appointmentResult = await db.query(
        'SELECT client_id, master_id, appointment_date, start_time, status FROM appointments WHERE id = $1',
        [id]
      );

      if (appointmentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Запись не найдена' });
      }

      const appointment = appointmentResult.rows[0];

      // Проверяем права доступа
      if (userRole !== 'admin' && userId !== appointment.client_id && userId !== appointment.master_id) {
        return res.status(403).json({ error: 'Недостаточно прав для отмены записи' });
      }

      if (appointment.status === 'cancelled') {
        return res.status(400).json({ error: 'Запись уже отменена' });
      }

      if (appointment.status === 'completed') {
        return res.status(400).json({ error: 'Нельзя отменить завершенную запись' });
      }

      // Отменяем запись
      await db.query(
        'UPDATE appointments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['cancelled', id]
      );

      // Освобождаем временной слот
      await db.query(
        'UPDATE master_schedules SET is_available = true WHERE master_id = $1 AND date = $2 AND start_time = $3',
        [appointment.master_id, appointment.appointment_date, appointment.start_time]
      );

      res.json({ message: 'Запись успешно отменена' });

    } catch (error) {
      console.error('Ошибка при отмене записи:', error);
      res.status(500).json({
        error: 'Ошибка при отмене записи'
      });
    }
  },

  // Завершение записи
  async completeAppointment(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const userId = req.user.userId;
      const userRole = req.user.role;

      // Получаем информацию о записи
      const appointmentResult = await db.query(
        'SELECT master_id, status FROM appointments WHERE id = $1',
        [id]
      );

      if (appointmentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Запись не найдена' });
      }

      const appointment = appointmentResult.rows[0];

      // Проверяем права доступа (только мастер или админ)
      if (userRole !== 'admin' && (userRole !== 'master' || userId !== appointment.master_id)) {
        return res.status(403).json({ error: 'Недостаточно прав для завершения записи' });
      }

      if (appointment.status === 'completed') {
        return res.status(400).json({ error: 'Запись уже завершена' });
      }

      if (appointment.status === 'cancelled') {
        return res.status(400).json({ error: 'Нельзя завершить отмененную запись' });
      }

      // Завершаем запись
      await db.query(
        'UPDATE appointments SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        ['completed', notes || '', id]
      );

      res.json({ message: 'Запись успешно завершена' });

    } catch (error) {
      console.error('Ошибка при завершении записи:', error);
      res.status(500).json({
        error: 'Ошибка при завершении записи'
      });
    }
  },

  // Обновление записи (для админов)
  async updateAppointment(req, res) {
    try {
      const { id } = req.params;
      const { serviceId, masterId, appointmentDate, startTime, status, notes } = req.body;

      // Проверяем существование записи
      const existingAppointment = await db.query('SELECT id FROM appointments WHERE id = $1', [id]);
      
      if (existingAppointment.rows.length === 0) {
        return res.status(404).json({ error: 'Запись не найдена' });
      }

      // Подготавливаем данные для обновления
      let updateFields = [];
      let updateValues = [];
      let paramCounter = 1;

      if (serviceId) {
        // Получаем информацию об услуге для расчета цены и времени окончания
        const serviceResult = await db.query(
          'SELECT price, duration_minutes FROM services WHERE id = $1 AND is_active = true',
          [serviceId]
        );

        if (serviceResult.rows.length === 0) {
          return res.status(404).json({ error: 'Услуга не найдена или неактивна' });
        }

        const service = serviceResult.rows[0];
        updateFields.push(`service_id = $${paramCounter}`);
        updateValues.push(serviceId);
        paramCounter++;

        updateFields.push(`total_price = $${paramCounter}`);
        updateValues.push(service.price);
        paramCounter++;

        if (startTime) {
          const startDateTime = new Date(`${appointmentDate || '2023-01-01'}T${startTime}`);
          const endDateTime = new Date(startDateTime.getTime() + service.duration_minutes * 60000);
          const endTime = endDateTime.toTimeString().slice(0, 5);

          updateFields.push(`end_time = $${paramCounter}`);
          updateValues.push(endTime);
          paramCounter++;
        }
      }

      if (masterId) {
        updateFields.push(`master_id = $${paramCounter}`);
        updateValues.push(masterId);
        paramCounter++;
      }

      if (appointmentDate) {
        updateFields.push(`appointment_date = $${paramCounter}`);
        updateValues.push(appointmentDate);
        paramCounter++;
      }

      if (startTime) {
        updateFields.push(`start_time = $${paramCounter}`);
        updateValues.push(startTime);
        paramCounter++;
      }

      if (status) {
        updateFields.push(`status = $${paramCounter}`);
        updateValues.push(status);
        paramCounter++;
      }

      if (notes !== undefined) {
        updateFields.push(`notes = $${paramCounter}`);
        updateValues.push(notes);
        paramCounter++;
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'Нет данных для обновления' });
      }

      // Добавляем updated_at
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(id);

      const query = `
        UPDATE appointments 
        SET ${updateFields.join(', ')} 
        WHERE id = $${paramCounter}
        RETURNING *
      `;

      const result = await db.query(query, updateValues);

      res.json({
        appointment: result.rows[0],
        message: 'Запись успешно обновлена'
      });

    } catch (error) {
      console.error('Ошибка при обновлении записи:', error);
      res.status(500).json({
        error: 'Ошибка при обновлении записи'
      });
    }
  },

  // Удаление записи (для админов)
  async deleteAppointment(req, res) {
    try {
      const { id } = req.params;

      // Получаем информацию о записи перед удалением
      const appointmentResult = await db.query(
        'SELECT master_id, appointment_date, start_time FROM appointments WHERE id = $1',
        [id]
      );

      if (appointmentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Запись не найдена' });
      }

      const appointment = appointmentResult.rows[0];

      // Удаляем запись
      await db.query('DELETE FROM appointments WHERE id = $1', [id]);

      // Освобождаем временной слот
      await db.query(
        'UPDATE master_schedules SET is_available = true WHERE master_id = $1 AND date = $2 AND start_time = $3',
        [appointment.master_id, appointment.appointment_date, appointment.start_time]
      );

      res.json({ message: 'Запись успешно удалена' });

    } catch (error) {
      console.error('Ошибка при удалении записи:', error);
      res.status(500).json({
        error: 'Ошибка при удалении записи'
      });
    }
  }
};

module.exports = appointmentController;
