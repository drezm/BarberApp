const jwt = require('jsonwebtoken');

// Middleware для проверки JWT токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Токен доступа отсутствует'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        error: 'Недействительный токен'
      });
    }
    req.user = user;
    next();
  });
};

// Middleware для проверки ролей
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Необходима авторизация'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Недостаточно прав для выполнения операции'
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole
};
