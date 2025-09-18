// backend/routes/masters.js
const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');
const { authenticateToken, isAdmin, isMaster } = require('../middleware');

// Получение всех мастеров
router.get('/', masterController.getAllMasters);

// Получение мастера по ID (для админов)
router.get('/:id', authenticateToken, isAdmin, masterController.getMasterById);

// Создание нового мастера (для админов)
router.post('/', authenticateToken, isAdmin, masterController.createMaster);

// Обновление мастера (для админов)
router.put('/:id', authenticateToken, isAdmin, masterController.updateMaster);

// Удаление мастера (для админов)
router.delete('/:id', authenticateToken, isAdmin, masterController.deleteMaster);

// Получение расписания мастера
router.get('/:masterId/schedule', masterController.getMasterSchedule);

// Создание расписания (для мастеров)
router.post('/schedule', authenticateToken, isMaster, masterController.createSchedule);

// Получение статистики мастера (для самого мастера)
router.get('/stats/me', authenticateToken, isMaster, masterController.getMasterStats);

// Получение услуг мастера
router.get('/:masterId/services', masterController.getMasterServices);

module.exports = router;
