// frontend/js/auth.js

// Утилиты для работы с токеном
const TokenUtils = {
    set(token) {
        localStorage.setItem('barbershop_token', token);
    },
    
    get() {
        return localStorage.getItem('barbershop_token');
    },
    
    remove() {
        localStorage.removeItem('barbershop_token');
        localStorage.removeItem('barbershop_user');
    },
    
    decode() {
        const token = this.get();
        if (!token) return null;
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload;
        } catch (error) {
            console.error('Ошибка декодирования токена:', error);
            return null;
        }
    },
    
    isValid() {
        const payload = this.decode();
        if (!payload) return false;
        
        const currentTime = Math.floor(Date.now() / 1000);
        return payload.exp > currentTime;
    }
};

// Утилиты для работы с пользователем
const UserUtils = {
    set(user) {
        localStorage.setItem('barbershop_user', JSON.stringify(user));
    },
    
    get() {
        const userData = localStorage.getItem('barbershop_user');
        return userData ? JSON.parse(userData) : null;
    },
    
    remove() {
        localStorage.removeItem('barbershop_user');
    },
    
    getRole() {
        const user = this.get();
        return user ? user.role : null;
    },
    
    isLoggedIn() {
        return this.get() !== null && TokenUtils.isValid();
    }
};

// API клиент
class ApiClient {
    constructor() {
        this.baseURL = '/api';
    }
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = TokenUtils.get();
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` })
            },
            ...options
        };
        
        if (config.body && typeof config.body !== 'string') {
            config.body = JSON.stringify(config.body);
        }
        
        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Произошла ошибка при выполнении запроса');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
    
    // Методы аутентификации
    async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: { email, password }
        });
    }
    
    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: userData
        });
    }
    
    async getProfile() {
        return this.request('/auth/profile');
    }
    
    async updateProfile(data) {
        return this.request('/auth/profile', {
            method: 'PUT',
            body: data
        });
    }
    
    // Методы для услуг
    async getServices() {
        return this.request('/services');
    }
    
    async getServiceById(id) {
        return this.request(`/services/${id}`);
    }
    
    async createService(serviceData) {
        return this.request('/services', {
            method: 'POST',
            body: serviceData
        });
    }
    
    async updateService(id, serviceData) {
        return this.request(`/services/${id}`, {
            method: 'PUT',
            body: serviceData
        });
    }
    
    async deleteService(id) {
        return this.request(`/services/${id}`, {
            method: 'DELETE'
        });
    }
    
    // Методы для мастеров
    async getMasters() {
        return this.request('/masters');
    }
    
    async getMasterById(id) {
        return this.request(`/masters/${id}`);
    }
    
    async createMaster(masterData) {
        return this.request('/masters', {
            method: 'POST',
            body: masterData
        });
    }
    
    async updateMaster(id, masterData) {
        return this.request(`/masters/${id}`, {
            method: 'PUT',
            body: masterData
        });
    }
    
    async deleteMaster(id) {
        return this.request(`/masters/${id}`, {
            method: 'DELETE'
        });
    }
    
    async getMasterSchedule(masterId, date = null) {
        const params = date ? `?date=${date}` : '';
        return this.request(`/masters/${masterId}/schedule${params}`);
    }
    
    async getMasterServices(masterId) {
        return this.request(`/masters/${masterId}/services`);
    }
    
    async createMasterSchedule(scheduleData) {
        return this.request('/masters/schedule', {
            method: 'POST',
            body: scheduleData
        });
    }
    
    async getMasterStats() {
        return this.request('/masters/stats/me');
    }
    
    // Методы для записей
    async createAppointment(appointmentData) {
        return this.request('/appointments', {
            method: 'POST',
            body: appointmentData
        });
    }
    
    async getClientAppointments() {
        return this.request('/appointments/client');
    }
    
    async getMasterAppointments(date = null) {
        const params = date ? `?date=${date}` : '';
        return this.request(`/appointments/master${params}`);
    }
    
    async getAllAppointments() {
        return this.request('/appointments/all');
    }
    
    async cancelAppointment(id) {
        return this.request(`/appointments/${id}/cancel`, {
            method: 'PATCH'
        });
    }
    
    async completeAppointment(id, notes = '') {
        return this.request(`/appointments/${id}/complete`, {
            method: 'PATCH',
            body: { notes }
        });
    }
    
    // Методы для клиентов (для админа)
    async getAllClients() {
        return this.request('/clients');
    }
    
    async getClientById(id) {
        return this.request(`/clients/${id}`);
    }
    
    async updateClient(id, clientData) {
        return this.request(`/clients/${id}`, {
            method: 'PUT',
            body: clientData
        });
    }
    
    async deleteClient(id) {
        return this.request(`/clients/${id}`, {
            method: 'DELETE'
        });
    }
}

// Создаем глобальный экземпляр API клиента
const api = new ApiClient();

// Система уведомлений
class NotificationSystem {
    show(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas ${this.getIcon(type)}"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: inherit; cursor: pointer; margin-left: auto;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Показываем уведомление
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Автоматически скрываем уведомление
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
    
    getIcon(type) {
        switch (type) {
            case 'success': return 'fa-check-circle';
            case 'error': return 'fa-exclamation-circle';
            case 'warning': return 'fa-exclamation-triangle';
            case 'info': return 'fa-info-circle';
            default: return 'fa-info-circle';
        }
    }
    
    success(message, duration) {
        this.show(message, 'success', duration);
    }
    
    error(message, duration) {
        this.show(message, 'error', duration);
    }
    
    warning(message, duration) {
        this.show(message, 'warning', duration);
    }
    
    // ДОБАВЛЕНО: метод info для информационных уведомлений
    info(message, duration) {
        this.show(message, 'info', duration);
    }
}

// Создаем глобальный экземпляр системы уведомлений
const notifications = new NotificationSystem();

// Управление аутентификацией
class AuthManager {
    constructor() {
        this.isLoginMode = true;
        this.initializeAuth();
    }
    
    initializeAuth() {
        // Проверяем, авторизован ли пользователь
        if (UserUtils.isLoggedIn()) {
            this.showUserDashboard();
            this.updateNavigation();
        }
    }
    
    async login(formData) {
        try {
            const { email, password } = formData;
            const response = await api.login(email, password);
            
            // Сохраняем токен и данные пользователя
            TokenUtils.set(response.token);
            UserUtils.set(response.user);
            
            notifications.success('Вы успешно вошли в систему');
            this.closeAuthModal();
            this.showUserDashboard();
            this.updateNavigation();
            
            return response;
        } catch (error) {
            notifications.error(error.message);
            throw error;
        }
    }
    
    async register(formData) {
        try {
            const response = await api.register(formData);
            
            // Сохраняем токен и данные пользователя
            TokenUtils.set(response.token);
            UserUtils.set(response.user);
            
            notifications.success('Регистрация прошла успешно');
            this.closeAuthModal();
            this.showUserDashboard();
            this.updateNavigation();
            
            return response;
        } catch (error) {
            notifications.error(error.message);
            throw error;
        }
    }
    
    logout() {
        TokenUtils.remove();
        UserUtils.remove();
        
        // Скрываем дашборд и показываем основной контент
        document.getElementById('userDashboard').style.display = 'none';
        document.querySelector('main') && (document.querySelector('main').style.display = 'block');
        
        // Обновляем навигацию
        this.updateNavigation();
        
        notifications.success('Вы вышли из системы');
        
        // Перезагружаем страницу для сброса состояния
        window.location.reload();
    }
    
    showAuthModal() {
        const modal = document.getElementById('authModal');
        modal.classList.add('active');
        
        // Сбрасываем форму
        document.getElementById('authForm').reset();
        this.updateAuthModal();
    }
    
    closeAuthModal() {
        const modal = document.getElementById('authModal');
        modal.classList.remove('active');
    }
    
    toggleAuthMode() {
        this.isLoginMode = !this.isLoginMode;
        this.updateAuthModal();
    }
    
    updateAuthModal() {
        const modalTitle = document.getElementById('modalTitle');
        const authButtonText = document.getElementById('authButtonText');
        const authSwitchText = document.getElementById('authSwitchText');
        const authSwitchLink = document.getElementById('authSwitchLink');
        const registerFields = document.getElementById('registerFields');
        
        if (this.isLoginMode) {
            modalTitle.textContent = 'Вход в систему';
            authButtonText.textContent = 'Войти';
            authSwitchText.textContent = 'Нет аккаунта?';
            authSwitchLink.textContent = 'Зарегистрироваться';
            registerFields.style.display = 'none';
            registerFields.classList.remove('active');
        } else {
            modalTitle.textContent = 'Регистрация';
            authButtonText.textContent = 'Зарегистрироваться';
            authSwitchText.textContent = 'Уже есть аккаунт?';
            authSwitchLink.textContent = 'Войти';
            registerFields.style.display = 'block';
            setTimeout(() => registerFields.classList.add('active'), 50);
        }
    }
    
    showUserDashboard() {
        const user = UserUtils.get();
        if (!user) return;
        
        // Скрываем основной контент и показываем дашборд
        const main = document.querySelector('main');
        if (main) main.style.display = 'none';
        
        const dashboard = document.getElementById('userDashboard');
        dashboard.style.display = 'block';
        
        // Обновляем информацию о пользователе
        document.getElementById('userName').textContent = `${user.firstName} ${user.lastName}`;
        
        // Загружаем соответствующий интерфейс в зависимости от роли
        this.loadDashboardContent(user.role);
    }
    
    async loadDashboardContent(role) {
        const dashboardContent = document.getElementById('dashboardContent');
        
        switch (role) {
            case 'client':
                await this.loadClientDashboard(dashboardContent);
                break;
            case 'master':
                await this.loadMasterDashboard(dashboardContent);
                break;
            case 'admin':
                await this.loadAdminDashboard(dashboardContent);
                break;
        }
    }
    
    async loadClientDashboard(container) {
        try {
            const appointmentsResponse = await api.getClientAppointments();
            const appointments = appointmentsResponse.appointments || [];
            
            container.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>Всего записей</h3>
                        <div class="value">${appointments.length}</div>
                    </div>
                    <div class="stat-card">
                        <h3>Активных записей</h3>
                        <div class="value">${appointments.filter(a => a.status === 'scheduled').length}</div>
                    </div>
                    <div class="stat-card">
                        <h3>Завершенных записей</h3>
                        <div class="value">${appointments.filter(a => a.status === 'completed').length}</div>
                    </div>
                </div>
                
                <div class="appointments-section">
                    <h3 style="margin-bottom: 1rem;">Мои записи</h3>
                    <div class="appointments-list">
                        ${appointments.length > 0 ? appointments.map(appointment => `
                            <div class="appointment-card">
                                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                                    <div>
                                        <h4>${appointment.service_name}</h4>
                                        <p>Мастер: ${appointment.master_name}</p>
                                        <p>Дата: ${new Date(appointment.appointment_date).toLocaleDateString('ru-RU')}</p>
                                        <p>Время: ${appointment.start_time.slice(0, 5)} - ${appointment.end_time.slice(0, 5)}</p>
                                    </div>
                                    <div style="text-align: right;">
                                        <div class="status ${appointment.status}">
                                            ${this.getStatusText(appointment.status)}
                                        </div>
                                        <div style="font-weight: 600; color: var(--accent); margin-top: 0.5rem;">
                                            ${appointment.total_price} ₽
                                        </div>
                                    </div>
                                </div>
                                ${appointment.status === 'scheduled' ? `
                                    <button onclick="cancelAppointment('${appointment.id}')" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 14px;">
                                        Отменить запись
                                    </button>
                                ` : ''}
                            </div>
                        `).join('') : '<p style="text-align: center; color: var(--text-soft); padding: 2rem;">У вас пока нет записей</p>'}
                    </div>
                </div>
            `;
        } catch (error) {
            notifications.error('Ошибка при загрузке записей');
            console.error(error);
        }
    }
    
    async loadMasterDashboard(container) {
        try {
            const [statsResponse, appointmentsResponse] = await Promise.all([
                api.getMasterStats(),
                api.getMasterAppointments()
            ]);
            
            const stats = statsResponse.stats;
            const todayAppointments = statsResponse.todayAppointments || [];
            
            container.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>Всего записей (30 дней)</h3>
                        <div class="value">${stats.totalAppointments}</div>
                    </div>
                    <div class="stat-card">
                        <h3>Завершено записей</h3>
                        <div class="value">${stats.completedAppointments}</div>
                    </div>
                    <div class="stat-card">
                        <h3>Доходы (30 дней)</h3>
                        <div class="value">${stats.totalEarnings} ₽</div>
                    </div>
                    <div class="stat-card">
                        <h3>Средний чек</h3>
                        <div class="value">${Math.round(stats.avgAppointmentPrice)} ₽</div>
                    </div>
                </div>
                
                <div style="margin-bottom: 2rem;">
                    <button onclick="showScheduleManager()" class="btn btn-primary">
                        <i class="fas fa-calendar-plus"></i>
                        Управление расписанием
                    </button>
                </div>
                
                <div class="appointments-section">
                    <h3 style="margin-bottom: 1rem;">Записи на сегодня</h3>
                    <div class="appointments-list">
                        ${todayAppointments.length > 0 ? todayAppointments.map(appointment => `
                            <div class="appointment-card">
                                <div style="display: flex; justify-content: space-between; align-items: start;">
                                    <div>
                                        <h4>${appointment.service_name}</h4>
                                        <p>Клиент: ${appointment.client_name}</p>
                                        <p>Время: ${appointment.start_time.slice(0, 5)} - ${appointment.end_time.slice(0, 5)}</p>
                                    </div>
                                    <div class="status ${appointment.status}">
                                        ${this.getStatusText(appointment.status)}
                                    </div>
                                </div>
                            </div>
                        `).join('') : '<p style="text-align: center; color: var(--text-soft); padding: 2rem;">На сегодня записей нет</p>'}
                    </div>
                </div>
            `;
        } catch (error) {
            notifications.error('Ошибка при загрузке данных мастера');
            console.error(error);
        }
    }
    
    async loadAdminDashboard(container) {
        container.innerHTML = `
            <div class="admin-tabs">
                <button class="tab-button active" onclick="showAdminTab('overview')">Обзор</button>
                <button class="tab-button" onclick="showAdminTab('appointments')">Записи</button>
                <button class="tab-button" onclick="showAdminTab('clients')">Клиенты</button>
                <button class="tab-button" onclick="showAdminTab('masters')">Мастера</button>
                <button class="tab-button" onclick="showAdminTab('services')">Услуги</button>
            </div>
            
            <div id="adminTabContent">
                <!-- Контент вкладок загружается динамически -->
            </div>
        `;
        
        // ИСПРАВЛЕНО: ждём загрузки main.js перед вызовом showAdminTab
        setTimeout(() => {
            if (typeof showAdminTab === 'function') {
                showAdminTab('overview');
            } else {
                // Если функция ещё не загружена, показываем простой контент
                const tabContent = document.getElementById('adminTabContent');
                tabContent.innerHTML = '<p>Загрузка админ-панели...</p>';
            }
        }, 100);
    }
    
    getStatusText(status) {
        switch (status) {
            case 'scheduled': return 'Запланировано';
            case 'completed': return 'Завершено';
            case 'cancelled': return 'Отменено';
            default: return status;
        }
    }
    
    updateNavigation() {
        const user = UserUtils.get();
        const isLoggedIn = UserUtils.isLoggedIn();
        
        const userInfo = document.getElementById('userInfo');
        const loginBtn = document.getElementById('loginBtn');
        const userNameHeader = document.getElementById('userNameHeader');
        
        if (isLoggedIn && user) {
            userInfo.style.display = 'flex';
            loginBtn.style.display = 'none';
            userNameHeader.textContent = `${user.firstName} ${user.lastName}`;
        } else {
            userInfo.style.display = 'none';
            loginBtn.style.display = 'flex';
        }
    }
}

// Создаем глобальный экземпляр менеджера аутентификации
const authManager = new AuthManager();

// Глобальные функции для работы с аутентификацией
function showAuthModal() {
    authManager.showAuthModal();
}

function closeAuthModal() {
    authManager.closeAuthModal();
}

function toggleAuthMode() {
    authManager.toggleAuthMode();
}

function logout() {
    authManager.logout();
}

// Обработчик формы аутентификации
document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            
            const submitButton = e.target.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            
            try {
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
                submitButton.disabled = true;
                
                if (authManager.isLoginMode) {
                    await authManager.login(data);
                } else {
                    await authManager.register(data);
                }
            } catch (error) {
                // Ошибка уже обработана в методах login/register
            } finally {
                submitButton.innerHTML = originalText;
                submitButton.disabled = false;
            }
        });
    }

    // Обработчик закрытия модального окна по клику вне его
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                authManager.closeAuthModal();
            }
        });
    }
});
