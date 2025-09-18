const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { authenticateToken, requireRole } = require('../middleware');

// Получение всех клиентов (админ)
router.get('/', authenticateToken, requireRole('admin'), clientController.getAllClients);

// Получение клиента по ID (админ)
router.get('/:id', authenticateToken, requireRole('admin'), clientController.getClientById);

// Обновление клиента (админ)
router.put('/:id', authenticateToken, requireRole('admin'), clientController.updateClient);

// Удаление клиента (админ)
router.delete('/:id', authenticateToken, requireRole('admin'), clientController.deleteClient);

module.exports = router;
