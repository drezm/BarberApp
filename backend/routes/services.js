// backend/routes/services.js
const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { authenticateToken, isAdmin } = require('../middleware');

// Получение всех активных услуг
router.get('/', serviceController.getAllServices);

// Получение услуги по ID
router.get('/:id', serviceController.getServiceById);

// ДОБАВЛЕНО: Получение мастеров для конкретной услуги
router.get('/:id/masters', serviceController.getServiceMasters);

// Создание новой услуги (только админы)
router.post('/', authenticateToken, isAdmin, serviceController.createService);

// Обновление услуги (только админы)
router.put('/:id', authenticateToken, isAdmin, serviceController.updateService);

// Удаление услуги (только админы)
router.delete('/:id', authenticateToken, isAdmin, serviceController.deleteService);

// Получение всех услуг для админа (включая неактивные)
router.get('/admin/all', authenticateToken, isAdmin, serviceController.getAllServicesForAdmin);

module.exports = router;
