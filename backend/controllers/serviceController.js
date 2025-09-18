const db = require('../config/database');

const serviceController = {
  // Получение всех услуг
  async getAllServices(req, res) {
    try {
      const result = await db.query(`
        SELECT id, name, description, price, duration_minutes, is_active, created_at
        FROM services
        WHERE is_active = true
        ORDER BY name
      `);

      res.json({
        services: result.rows
      });
    } catch (error) {
      console.error('Ошибка при получении услуг:', error);
      res.status(500).json({
        error: 'Ошибка при получении списка услуг'
      });
    }
  },

  // Получение услуги по ID
  async getServiceById(req, res) {
    try {
      const { id } = req.params;

      const result = await db.query(
        'SELECT id, name, description, price, duration_minutes, is_active FROM services WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Услуга не найдена'
        });
      }

      res.json({
        service: result.rows[0]
      });
    } catch (error) {
      console.error('Ошибка при получении услуги:', error);
      res.status(500).json({
        error: 'Ошибка при получении услуги'
      });
    }
  },

  // Создание новой услуги (только для админа)
  async createService(req, res) {
    try {
      const { name, description, price, durationMinutes } = req.body;

      if (!name || !price || !durationMinutes) {
        return res.status(400).json({
          error: 'Обязательные поля: name, price, durationMinutes'
        });
      }

      const result = await db.query(
        `INSERT INTO services (name, description, price, duration_minutes)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, description, price, duration_minutes, is_active, created_at`,
        [name, description || '', price, durationMinutes]
      );

      res.status(201).json({
        message: 'Услуга успешно создана',
        service: result.rows[0]
      });
    } catch (error) {
      console.error('Ошибка при создании услуги:', error);
      res.status(500).json({
        error: 'Ошибка при создании услуги'
      });
    }
  },

  // Обновление услуги (только для админа)
  async updateService(req, res) {
    try {
      const { id } = req.params;
      const { name, description, price, durationMinutes, isActive } = req.body;

      const result = await db.query(
        `UPDATE services 
         SET name = $1, description = $2, price = $3, duration_minutes = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING id, name, description, price, duration_minutes, is_active`,
        [name, description, price, durationMinutes, isActive, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Услуга не найдена'
        });
      }

      res.json({
        message: 'Услуга успешно обновлена',
        service: result.rows[0]
      });
    } catch (error) {
      console.error('Ошибка при обновлении услуги:', error);
      res.status(500).json({
        error: 'Ошибка при обновлении услуги'
      });
    }
  },

  // Удаление услуги (деактивация)
  async deleteService(req, res) {
    try {
      const { id } = req.params;

      const result = await db.query(
        'UPDATE services SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Услуга не найдена'
        });
      }

      res.json({
        message: 'Услуга успешно деактивирована'
      });
    } catch (error) {
      console.error('Ошибка при удалении услуги:', error);
      res.status(500).json({
        error: 'Ошибка при удалении услуги'
      });
    }
  },

  // Получение мастеров, оказывающих конкретную услугу
  async getServiceMasters(req, res) {
    try {
      const { id } = req.params;

      const result = await db.query(`
        SELECT 
          m.id, m.first_name, m.last_name, m.phone, m.avatar_url
        FROM users m
        JOIN master_services ms ON m.id = ms.master_id
        WHERE ms.service_id = $1 AND m.role = 'master'
        ORDER BY m.first_name
      `, [id]);

      res.json({
        masters: result.rows
      });
    } catch (error) {
      console.error('Ошибка при получении мастеров услуги:', error);
      res.status(500).json({
        error: 'Ошибка при получении мастеров услуги'
      });
    }
  }
};

module.exports = serviceController;
