// backend/controllers/masterController.js
const db = require('../config/database');

const masterController = {
  async getAllMasters(req, res) {
    try {
      const result = await db.query(`
        SELECT 
          m.id, m.first_name, m.last_name, m.phone, m.avatar_url,
          ARRAY_AGG(s.name) as services
        FROM users m
        LEFT JOIN master_services ms ON m.id = ms.master_id
        LEFT JOIN services s ON ms.service_id = s.id
        WHERE m.role = 'master'
        GROUP BY m.id, m.first_name, m.last_name, m.phone, m.avatar_url
        ORDER BY m.first_name
      `);
      res.json({ masters: result.rows });
    } catch (error) {
      console.error('Ошибка при получении мастеров:', error);
      res.status(500).json({ error: 'Ошибка при получении списка мастеров' });
    }
  },

  async getMasterSchedule(req, res) {
    try {
      const { masterId } = req.params;
      const { date } = req.query;

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
        // ВАЖНО: двойные кавычки для строки JS, чтобы не ломать интервал с одинарными кавычками
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
      const stats = statsRes.rows;

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
  },

  async updateMasterServices(req, res) {
    try {
      const { masterId } = req.params;
      const { serviceIds } = req.body;

      if (!Array.isArray(serviceIds)) {
        return res.status(400).json({ error: 'serviceIds должен быть массивом' });
      }

      await db.query('DELETE FROM master_services WHERE master_id = $1', [masterId]);

      if (serviceIds.length > 0) {
        const ops = serviceIds.map(serviceId =>
          db.query('INSERT INTO master_services (master_id, service_id) VALUES ($1, $2)', [masterId, serviceId])
        );
        await Promise.all(ops);
      }

      res.json({ message: 'Услуги мастера успешно обновлены' });
    } catch (error) {
      console.error('Ошибка при обновлении услуг мастера:', error);
      res.status(500).json({ error: 'Ошибка при обновлении услуг мастера' });
    }
  }
};

module.exports = masterController;
