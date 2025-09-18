// backend/routes/appointments.js
const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticateToken, isAdmin, isMaster, isClient } = require('../middleware');

// Создание записи (для клиентов)
router.post('/', authenticateToken, isClient, appointmentController.createAppointment);

// Получение записей клиента (для самого клиента)
router.get('/client', authenticateToken, isClient, appointmentController.getClientAppointments);

// Получение записей мастера (для мастера)
router.get('/master', authenticateToken, isMaster, appointmentController.getMasterAppointments);

// Получение всех записей (для админа)
router.get('/all', authenticateToken, isAdmin, appointmentController.getAllAppointments);

// Отмена записи
router.patch('/:id/cancel', authenticateToken, appointmentController.cancelAppointment);

// Завершение записи (для мастеров и админов)
router.patch('/:id/complete', authenticateToken, appointmentController.completeAppointment);

// Обновление записи (для админов)
router.put('/:id', authenticateToken, isAdmin, appointmentController.updateAppointment);

// Удаление записи (для админов)
router.delete('/:id', authenticateToken, isAdmin, appointmentController.deleteAppointment);

module.exports = router;
