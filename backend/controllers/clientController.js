const db = require('../config/database');

const clientController = {
  // Получение всех клиентов (для админа)
  async getAllClients(req, res) {
    try {
      const result = await db.query(`
        SELECT 
          id, email, first_name, last_name, phone, created_at,
          (SELECT COUNT(*) FROM appointments WHERE client_id = users.id) as appointment_count,
          (SELECT SUM(total_price) FROM appointments WHERE client_id = users.id AND status = 'completed') as total_spent
        FROM users
        WHERE role = 'client'
        ORDER BY created_at DESC
      `);

      res.json({
        clients: result.rows.map(client => ({
          ...client,
          total_spent: client.total_spent || 0
        }))
      });
    } catch (error) {
      console.error('Ошибка при получении клиентов:', error);
      res.status(500).json({
        error: 'Ошибка при получении списка клиентов'
      });
    }
  },

  // Получение информации о клиенте по ID
  async getClientById(req, res) {
    try {
      const { id } = req.params;

      const clientResult = await db.query(
        'SELECT id, email, first_name, last_name, phone, created_at FROM users WHERE id = $1 AND role = $2',
        [id, 'client']
      );

      if (clientResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Клиент не найден'
        });
      }

      const client = clientResult.rows[0];

      // Получаем статистику клиента
      const statsResult = await db.query(`
        SELECT 
          COUNT(*) as total_appointments,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_appointments,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_appointments,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN total_price ELSE 0 END), 0) as total_spent
        FROM appointments
        WHERE client_id = $1
      `, [id]);

      const stats = statsResult.rows[0];

      // Получаем последние записи
      const appointmentsResult = await db.query(`
        SELECT 
          a.id, a.appointment_date, a.start_time, a.status, a.total_price,
          s.name as service_name,
          m.first_name || ' ' || m.last_name as master_name
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        JOIN users m ON a.master_id = m.id
        WHERE a.client_id = $1
        ORDER BY a.appointment_date DESC, a.start_time DESC
        LIMIT 10
      `, [id]);

      res.json({
        client: {
          ...client,
          stats: {
            totalAppointments: parseInt(stats.total_appointments),
            completedAppointments: parseInt(stats.completed_appointments),
            cancelledAppointments: parseInt(stats.cancelled_appointments),
            totalSpent: parseFloat(stats.total_spent)
          },
          recentAppointments: appointmentsResult.rows
        }
      });
    } catch (error) {
      console.error('Ошибка при получении информации о клиенте:', error);
      res.status(500).json({
        error: 'Ошибка при получении информации о клиенте'
      });
    }
  },

  // Удаление клиента (для админа)
  async deleteClient(req, res) {
    try {
      const { id } = req.params;

      // Проверяем, есть ли у клиента активные записи
      const activeAppointments = await db.query(
        'SELECT COUNT(*) as count FROM appointments WHERE client_id = $1 AND status = $2 AND appointment_date >= CURRENT_DATE',
        [id, 'scheduled']
      );

      if (parseInt(activeAppointments.rows[0].count) > 0) {
        return res.status(400).json({
          error: 'Нельзя удалить клиента с активными записями'
        });
      }

      const result = await db.query(
        'DELETE FROM users WHERE id = $1 AND role = $2 RETURNING id',
        [id, 'client']
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Клиент не найден'
        });
      }

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

  // Обновление информации о клиенте (для админа)
  async updateClient(req, res) {
    try {
      const { id } = req.params;
      const { firstName, lastName, phone, email } = req.body;

      const result = await db.query(
        `UPDATE users 
         SET first_name = $1, last_name = $2, phone = $3, email = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 AND role = 'client'
         RETURNING id, email, first_name, last_name, phone`,
        [firstName, lastName, phone, email, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Клиент не найден'
        });
      }

      res.json({
        message: 'Информация о клиенте успешно обновлена',
        client: result.rows[0]
      });
    } catch (error) {
      console.error('Ошибка при обновлении клиента:', error);
      res.status(500).json({
        error: 'Ошибка при обновлении информации о клиенте'
      });
    }
  }
};

module.exports = clientController;
