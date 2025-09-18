const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');
const { authenticateToken, requireRole } = require('../middleware');

// Получение всех мастеров
router.get('/', masterController.getAllMasters);

// Получение расписания мастера
router.get('/:masterId/schedule', masterController.getMasterSchedule);

// Создание расписания (мастер)
router.post('/schedule', authenticateToken, requireRole('master'), masterController.createSchedule);

// Получение статистики мастера
router.get('/stats', authenticateToken, requireRole('master'), masterController.getMasterStats);

// Получение услуг мастера
router.get('/:masterId/services', masterController.getMasterServices);

// Обновление услуг мастера (админ)
router.put('/:masterId/services', authenticateToken, requireRole('admin'), masterController.updateMasterServices);

module.exports = router;
