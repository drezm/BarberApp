// backend/routes/clients.js
const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { authenticateToken, isAdmin, isClient } = require('../middleware');

// Получение всех клиентов (только админы)
router.get('/', authenticateToken, isAdmin, clientController.getAllClients);

// Получение клиента по ID (только админы)
router.get('/:id', authenticateToken, isAdmin, clientController.getClientById);

// Создание нового клиента (только админы)
router.post('/', authenticateToken, isAdmin, clientController.createClient);

// Обновление клиента (только админы)
router.put('/:id', authenticateToken, isAdmin, clientController.updateClient);

// Удаление клиента (только админы)
router.delete('/:id', authenticateToken, isAdmin, clientController.deleteClient);

// Получение статистики клиента (для самого клиента)
router.get('/stats/me', authenticateToken, isClient, clientController.getClientStats);

module.exports = router;
