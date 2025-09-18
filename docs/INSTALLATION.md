# 🔧 Подробная инструкция по установке

## Системные требования

- **Операционная система:** Windows 10/11, macOS 10.14+, Ubuntu 18.04+
- **Node.js:** версия 18.0 или выше
- **PostgreSQL:** версия 12.0 или выше
- **Браузер:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Свободное место на диске:** минимум 1 ГБ

## 📥 Шаг 1: Установка необходимого ПО

### Node.js

#### Windows:
1. Перейдите на [nodejs.org](https://nodejs.org/)
2. Скачайте LTS версию
3. Запустите установщик и следуйте инструкциям

#### macOS:
```bash
# Используя Homebrew
brew install node

# Или скачайте с официального сайта
```

#### Ubuntu/Debian:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### PostgreSQL

#### Windows:
1. Скачайте с [postgresql.org](https://www.postgresql.org/download/)
2. Запустите установщик
3. Запомните пароль для пользователя `postgres`

#### macOS:
```bash
brew install postgresql
brew services start postgresql
```

#### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## 📁 Шаг 2: Подготовка проекта

### Создание рабочей директории
```bash
mkdir barbershop-project
cd barbershop-project
```

### Скачивание файлов проекта
Разместите все файлы проекта в следующей структуре:

```
barbershop-project/
├── database/
│   ├── init_database.sql
│   └── sample_data.sql
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── appointmentController.js
│   │   ├── clientController.js
│   │   ├── masterController.js
│   │   └── serviceController.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── appointments.js
│   │   ├── clients.js
│   │   ├── masters.js
│   │   └── services.js
│   ├── middleware.js
│   ├── server.js
│   ├── package.json
│   └── .env
└── frontend/
    ├── css/
    │   └── style.css
    ├── js/
    │   ├── auth.js
    │   └── main.js
    └── index.html
```

## 🗄 Шаг 3: Настройка базы данных

### Создание пользователя PostgreSQL (если нужно)

#### Подключение к PostgreSQL:
```bash
# Windows
psql -U postgres

# macOS/Linux
sudo -u postgres psql
```

#### Создание пользователя и базы данных:
```sql
-- Создание пользователя (если нужно)
CREATE USER barbershop_user WITH PASSWORD 'secure_password';

-- Предоставление прав
ALTER USER barbershop_user CREATEDB;
```

### Инициализация базы данных

#### Запуск SQL скриптов:
```bash
# Переходим в папку с проектом
cd barbershop-project

# Создаем базу данных и таблицы
psql -U postgres -f database/init_database.sql

# Заполняем тестовыми данными
psql -U postgres -d barbershop_booking -f database/sample_data.sql
```

## ⚙️ Шаг 4: Настройка backend

### Переход в папку backend:
```bash
cd backend
```

### Установка зависимостей:
```bash
npm install
```

### Создание файла конфигурации:
Создайте файл `.env` в папке `backend`:

```env
# Настройки базы данных
DB_HOST=localhost
DB_PORT=5432
DB_NAME=barbershop_booking
DB_USER=postgres
DB_PASSWORD=ВАШ_ПАРОЛЬ_ОТ_POSTGRES

# Настройки сервера
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# JWT Secret (измените на свой!)
JWT_SECRET=my_super_secret_key_for_barbershop_2025

# Настройки сессий
SESSION_SECRET=my_session_secret_key

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## 🚀 Шаг 5: Запуск приложения

### Запуск сервера:
```bash
# Находясь в папке backend
npm start
```

Или для разработки с автоперезагрузкой:
```bash
npm run dev
```

### Проверка запуска:
1. Откройте браузер
2. Перейдите по адресу: `http://localhost:3000`
3. Вы должны увидеть главную страницу барбершопа

## 🧪 Шаг 6: Тестирование

### Проверка работы системы:

1. **Регистрация нового пользователя:**
   - Нажмите кнопку "Войти"
   - Переключитесь на "Регистрация"
   - Заполните форму и отправьте

2. **Вход существующим пользователем:**
   - Используйте тестовые данные:
   - Email: `client1@example.com`
   - Пароль: `client123` (фактический хеш будет в БД)

3. **Создание записи:**
   - Выберите услугу
   - Выберите мастера
   - Выберите дату и время
   - Подтвердите запись

4. **Работа с ролями:**
   - Клиент: просмотр записей
   - Мастер: управление расписанием
   - Админ: полный доступ

## 🔧 Возможные проблемы и их решение

### Проблема: "Cannot find module"
```bash
# Решение: переустановите зависимости
rm -rf node_modules package-lock.json
npm install
```

### Проблема: "Database connection failed"
1. Проверьте настройки в файле `.env`
2. Убедитесь, что PostgreSQL запущен:
   ```bash
   # Windows
   net start postgresql

   # macOS
   brew services start postgresql

   # Linux
   sudo systemctl start postgresql
   ```

### Проблема: "Port 3000 is already in use"
1. Измените порт в файле `.env`:
   ```env
   PORT=3001
   ```
2. Или остановите процесс, использующий порт:
   ```bash
   # Найти процесс
   lsof -ti:3000

   # Остановить процесс
   kill -9 PID
   ```

### Проблема: "JWT Secret not defined"
Убедитесь, что в файле `.env` указан `JWT_SECRET`

### Проблема: Не загружаются стили
1. Проверьте, что файл `style.css` находится в папке `frontend/css/`
2. Очистите кеш браузера (Ctrl+Shift+R)

## 📱 Дополнительная настройка

### Настройка для локальной сети:

Если хотите дать доступ другим устройствам в сети:

1. Измените в `server.js`:
```javascript
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер запущен на http://0.0.0.0:${PORT}`);
});
```

2. Узнайте IP-адрес компьютера:
```bash
# Windows
ipconfig

# macOS/Linux  
ifconfig
```

3. Откройте приложение по адресу: `http://ВАШ_IP:3000`

### Настройка HTTPS (продакшн):

Для продакшн использования настройте HTTPS с помощью nginx или используйте сертификаты Let's Encrypt.

## 🔒 Безопасность

### Обязательные изменения для продакшна:

1. Измените `JWT_SECRET` на сложный ключ
2. Используйте сильный пароль для PostgreSQL
3. Настройте файрвол
4. Используйте HTTPS
5. Ограничьте доступ к базе данных

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи в консоли
2. Убедитесь, что все зависимости установлены
3. Проверьте настройки в файле `.env`
4. Перезапустите сервер и базу данных

## ✅ Контрольный список

- [ ] Node.js 18+ установлен
- [ ] PostgreSQL установлен и запущен
- [ ] Файлы проекта размещены правильно
- [ ] База данных создана и заполнена
- [ ] Файл `.env` настроен
- [ ] Зависимости установлены (`npm install`)
- [ ] Сервер запускается без ошибок
- [ ] Приложение открывается в браузере
- [ ] Можно зарегистрироваться и войти
- [ ] Создание записи работает

---

*Успешной установки! 🎉*
