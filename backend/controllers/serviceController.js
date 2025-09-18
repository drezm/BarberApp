// backend/controllers/serviceController.js
const db = require('../config/database');

const serviceController = {
  // Получение всех активных услуг
  async getAllServices(req, res) {
    try {
      const result = await db.query(`
        SELECT id, name, description, price, duration_minutes, is_active, created_at, updated_at
        FROM services
        WHERE is_active = true
        ORDER BY name ASC
      `);

      res.json({
        services: result.rows,
        message: 'Услуги загружены успешно'
      });
    } catch (error) {
      console.error('Ошибка при получении услуг:', error);
      res.status(500).json({
        error: 'Ошибка при загрузке услуг'
      });
    }
  },

  // Получение услуги по ID
  async getServiceById(req, res) {
    try {
      const { id } = req.params;

      const result = await db.query(
        'SELECT id, name, description, price, duration_minutes, is_active, created_at, updated_at FROM services WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Услуга не найдена'
        });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Ошибка при получении услуги:', error);
      res.status(500).json({
        error: 'Ошибка при загрузке услуги'
      });
    }
  },

  // ДОБАВЛЕНО: Получение мастеров для конкретной услуги
  async getServiceMasters(req, res) {
    try {
      const { id } = req.params;

      const result = await db.query(`
        SELECT 
          u.id, u.first_name, u.last_name, u.phone, u.avatar_url
        FROM users u
        JOIN master_services ms ON u.id = ms.master_id
        WHERE ms.service_id = $1 AND u.role = 'master'
        ORDER BY u.first_name, u.last_name
      `, [id]);

      res.json({
        masters: result.rows,
        message: 'Мастера для услуги загружены успешно'
      });
    } catch (error) {
      console.error('Ошибка при получении мастеров для услуги:', error);
      res.status(500).json({
        error: 'Ошибка при загрузке мастеров'
      });
    }
  },

  // Создание новой услуги (только для админов)
  async createService(req, res) {
    try {
      const { name, description, price, duration_minutes, is_active = true } = req.body;

      // Валидация данных
      if (!name || !price || !duration_minutes) {
        return res.status(400).json({
          error: 'Необходимо заполнить обязательные поля: название, цена и длительность'
        });
      }

      if (price < 0) {
        return res.status(400).json({
          error: 'Цена не может быть отрицательной'
        });
      }

      if (duration_minutes < 1) {
        return res.status(400).json({
          error: 'Длительность должна быть больше 0 минут'
        });
      }

      const result = await db.query(
        `INSERT INTO services (name, description, price, duration_minutes, is_active) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, name, description, price, duration_minutes, is_active, created_at`,
        [name, description, price, duration_minutes, is_active]
      );

      res.status(201).json({
        service: result.rows[0],
        message: 'Услуга успешно создана'
      });
    } catch (error) {
      console.error('Ошибка при создании услуги:', error);
      res.status(500).json({
        error: 'Ошибка при создании услуги'
      });
    }
  },

  // Обновление услуги (только для админов)
  async updateService(req, res) {
    try {
      const { id } = req.params;
      const { name, description, price, duration_minutes, is_active } = req.body;

      // Проверяем, существует ли услуга
      const existingService = await db.query('SELECT id FROM services WHERE id = $1', [id]);
      
      if (existingService.rows.length === 0) {
        return res.status(404).json({
          error: 'Услуга не найдена'
        });
      }

      // Валидация данных
      if (price !== undefined && price < 0) {
        return res.status(400).json({
          error: 'Цена не может быть отрицательной'
        });
      }

      if (duration_minutes !== undefined && duration_minutes < 1) {
        return res.status(400).json({
          error: 'Длительность должна быть больше 0 минут'
        });
      }

      const result = await db.query(
        `UPDATE services 
         SET name = COALESCE($1, name), 
             description = COALESCE($2, description), 
             price = COALESCE($3, price), 
             duration_minutes = COALESCE($4, duration_minutes),
             is_active = COALESCE($5, is_active),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6 
         RETURNING id, name, description, price, duration_minutes, is_active, updated_at`,
        [name, description, price, duration_minutes, is_active, id]
      );

      res.json({
        service: result.rows[0],
        message: 'Услуга успешно обновлена'
      });
    } catch (error) {
      console.error('Ошибка при обновлении услуги:', error);
      res.status(500).json({
        error: 'Ошибка при обновлении услуги'
      });
    }
  },

  // Мягкое удаление услуги (отключение) (только для админов)
  async deleteService(req, res) {
    try {
      const { id } = req.params;

      // Проверяем, существует ли услуга
      const existingService = await db.query('SELECT id FROM services WHERE id = $1', [id]);
      
      if (existingService.rows.length === 0) {
        return res.status(404).json({
          error: 'Услуга не найдена'
        });
      }

      // Мягкое удаление - просто деактивируем услугу
      await db.query(
        'UPDATE services SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );

      res.json({
        message: 'Услуга успешно отключена'
      });
    } catch (error) {
      console.error('Ошибка при удалении услуги:', error);
      res.status(500).json({
        error: 'Ошибка при удалении услуги'
      });
    }
  },

  // Получение всех услуг включая неактивные (для админов)
  async getAllServicesForAdmin(req, res) {
    try {
      const result = await db.query(`
        SELECT id, name, description, price, duration_minutes, is_active, created_at, updated_at
        FROM services
        ORDER BY created_at DESC
      `);

      res.json({
        services: result.rows,
        message: 'Все услуги загружены успешно'
      });
    } catch (error) {
      console.error('Ошибка при получении всех услуг:', error);
      res.status(500).json({
        error: 'Ошибка при загрузке услуг'
      });
    }
  }
};

module.exports = serviceController;
