// backend/routes/auth.js
const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware');

// Регистрация
router.post('/register', authController.register);

// Логин
router.post('/login', authController.login);

// Профиль (JWT)
router.get('/profile', authenticateToken, authController.getProfile);

// Обновление профиля (JWT)
router.put('/profile', authenticateToken, authController.updateProfile);

module.exports = router;
