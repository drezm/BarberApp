const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticateToken, requireRole } = require('../middleware');

// Создание записи (клиент)
router.post('/', authenticateToken, requireRole('client'), appointmentController.createAppointment);

// Получение записей клиента
router.get('/client', authenticateToken, requireRole('client'), appointmentController.getClientAppointments);

// Получение записей мастера
router.get('/master', authenticateToken, requireRole('master'), appointmentController.getMasterAppointments);

// Получение всех записей (админ)
router.get('/all', authenticateToken, requireRole('admin'), appointmentController.getAllAppointments);

// Отмена записи
router.patch('/:id/cancel', authenticateToken, appointmentController.cancelAppointment);

// Завершение записи (мастер/админ)
router.patch('/:id/complete', authenticateToken, requireRole('master', 'admin'), appointmentController.completeAppointment);

module.exports = router;
