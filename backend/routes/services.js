const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { authenticateToken, requireRole } = require('../middleware');

// Получение всех услуг
router.get('/', serviceController.getAllServices);

// Получение услуги по ID
router.get('/:id', serviceController.getServiceById);

// Создание новой услуги (админ)
router.post('/', authenticateToken, requireRole('admin'), serviceController.createService);

// Обновление услуги (админ)
router.put('/:id', authenticateToken, requireRole('admin'), serviceController.updateService);

// Удаление услуги (админ)
router.delete('/:id', authenticateToken, requireRole('admin'), serviceController.deleteService);

// Получение мастеров, оказывающих услугу
router.get('/:id/masters', serviceController.getServiceMasters);

module.exports = router;
