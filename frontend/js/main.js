// frontend/js/main.js

// Главный класс приложения
class BarberShopApp {
    constructor() {
        this.selectedService = null;
        this.selectedMaster = null;
        this.selectedDate = null;
        this.selectedTime = null;
        this.currentAdminTab = 'overview';
        this.init();
    }

    init() {
        this.loadServices();
        this.loadMasters();
        this.setupEventListeners();
        this.setMinDate();
        
        // Инициализация навигации пользователя
        this.updateUserInterface();
    }

    updateUserInterface() {
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

    setupEventListeners() {
        const serviceSelect = document.getElementById('service');
        const masterSelect = document.getElementById('master');
        const dateInput = document.getElementById('date');
        const bookingForm = document.getElementById('bookingForm');

        if (serviceSelect) {
            serviceSelect.addEventListener('change', (e) => this.onServiceChange(e));
        }

        if (masterSelect) {
            masterSelect.addEventListener('change', (e) => this.onMasterChange(e));
        }

        if (dateInput) {
            dateInput.addEventListener('change', (e) => this.onDateChange(e));
        }

        if (bookingForm) {
            bookingForm.addEventListener('submit', (e) => this.onBookingSubmit(e));
        }

        // Плавная прокрутка
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Активная навигация при прокрутке
        window.addEventListener('scroll', this.updateActiveNavigation);
    }

    updateActiveNavigation() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link');
        
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            if (scrollY >= sectionTop) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    }

    setMinDate() {
        const dateInput = document.getElementById('date');
        if (dateInput) {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            dateInput.min = tomorrow.toISOString().split('T')[0];
        }
    }

    async loadServices() {
        try {
            const response = await api.getServices();
            const services = response.services || [];
            this.displayServices(services);
            this.populateServiceSelect(services);
        } catch (error) {
            console.error('Ошибка при загрузке услуг:', error);
            notifications.error('Не удалось загрузить услуги');
        }
    }

    displayServices(services) {
        const servicesGrid = document.getElementById('servicesGrid');
        if (!servicesGrid) return;

        if (services.length === 0) {
            servicesGrid.innerHTML = '<p style="text-align: center; color: var(--muted);">Услуги пока не доступны</p>';
            return;
        }

        servicesGrid.innerHTML = services.map(service => `
            <div class="service-card">
                <div class="service-icon">
                    <i class="fas fa-cut"></i>
                </div>
                <h3 class="service-name">${service.name}</h3>
                <p class="service-description">${service.description || 'Описание услуги'}</p>
                <div class="service-details">
                    <span class="service-price">${service.price} ₽</span>
                    <span class="service-duration">${service.duration_minutes} мин</span>
                </div>
            </div>
        `).join('');
    }

    populateServiceSelect(services) {
        const serviceSelect = document.getElementById('service');
        if (!serviceSelect) return;

        serviceSelect.innerHTML = '<option value="">Выберите услугу</option>';
        services.forEach(service => {
            const option = document.createElement('option');
            option.value = service.id;
            option.textContent = `${service.name} - ${service.price} ₽`;
            serviceSelect.appendChild(option);
        });
    }

    async loadMasters() {
        try {
            const response = await api.getMasters();
            const masters = response.masters || [];
            this.displayMasters(masters);
        } catch (error) {
            console.error('Ошибка при загрузке мастеров:', error);
            notifications.error('Не удалось загрузить информацию о мастерах');
        }
    }

    displayMasters(masters) {
        const mastersGrid = document.getElementById('mastersGrid');
        if (!mastersGrid) return;

        if (masters.length === 0) {
            mastersGrid.innerHTML = '<p style="text-align: center; color: var(--muted);">Мастера пока не доступны</p>';
            return;
        }

        mastersGrid.innerHTML = masters.map(master => `
            <div class="master-card">
                <div class="master-avatar">
                    ${master.first_name.charAt(0)}${master.last_name.charAt(0)}
                </div>
                <h3 class="master-name">${master.first_name} ${master.last_name}</h3>
                <p class="master-phone">${master.phone || 'Телефон не указан'}</p>
                <div class="master-services">
                    ${(master.services || []).filter(s => s).map(service => 
                        `<span class="service-tag">${service}</span>`
                    ).join('')}
                </div>
            </div>
        `).join('');
    }

    async onServiceChange(e) {
        const serviceId = e.target.value;
        this.selectedService = serviceId;
        
        const masterSelect = document.getElementById('master');
        const timeSlots = document.getElementById('timeSlots');
        
        if (!serviceId) {
            masterSelect.innerHTML = '<option value="">Сначала выберите услугу</option>';
            timeSlots.innerHTML = '<p class="no-slots">Сначала выберите мастера и дату</p>';
            return;
        }

        try {
            // Загружаем мастеров для выбранной услуги
            const response = await api.getMasters();
            const masters = response.masters || [];
            
            masterSelect.innerHTML = '<option value="">Выберите мастера</option>';
            masters.forEach(master => {
                const option = document.createElement('option');
                option.value = master.id;
                option.textContent = `${master.first_name} ${master.last_name}`;
                masterSelect.appendChild(option);
            });
            
            timeSlots.innerHTML = '<p class="no-slots">Выберите мастера и дату</p>';
        } catch (error) {
            console.error('Ошибка при загрузке мастеров:', error);
            notifications.error('Не удалось загрузить мастеров для выбранной услуги');
        }
    }

    async onMasterChange(e) {
        const masterId = e.target.value;
        this.selectedMaster = masterId;
        
        if (masterId && this.selectedDate) {
            await this.loadTimeSlots();
        } else {
            document.getElementById('timeSlots').innerHTML = 
                '<p class="no-slots">Выберите дату для просмотра доступного времени</p>';
        }
    }

    async onDateChange(e) {
        const date = e.target.value;
        this.selectedDate = date;
        
        if (this.selectedMaster && date) {
            await this.loadTimeSlots();
        }
    }

    async loadTimeSlots() {
        const timeSlots = document.getElementById('timeSlots');
        
        if (!this.selectedMaster || !this.selectedDate) {
            timeSlots.innerHTML = '<p class="no-slots">Выберите мастера и дату</p>';
            return;
        }

        try {
            const response = await api.getMasterSchedule(this.selectedMaster, this.selectedDate);
            const schedule = response.schedule || [];
            
            const availableSlots = schedule.filter(slot => slot.is_available);
            
            if (availableSlots.length === 0) {
                timeSlots.innerHTML = '<p class="no-slots">На выбранную дату нет свободного времени</p>';
                return;
            }

            timeSlots.innerHTML = availableSlots.map(slot => `
                <div class="time-slot" data-time="${slot.start_time}" onclick="selectTimeSlot('${slot.start_time}', this)">
                    ${slot.start_time.slice(0, 5)}
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Ошибка при загрузке расписания:', error);
            timeSlots.innerHTML = '<p class="no-slots">Ошибка при загрузке расписания</p>';
        }
    }

    selectTimeSlot(time, element) {
        // Убираем выделение с других слотов
        document.querySelectorAll('.time-slot').forEach(slot => {
            slot.classList.remove('selected');
        });
        
        // Выделяем выбранный слот
        element.classList.add('selected');
        this.selectedTime = time;
    }

    async onBookingSubmit(e) {
        e.preventDefault();
        
        if (!UserUtils.isLoggedIn()) {
            notifications.error('Для записи необходимо авторизоваться');
            showAuthModal();
            return;
        }

        if (!this.selectedService || !this.selectedMaster || !this.selectedDate || !this.selectedTime) {
            notifications.error('Пожалуйста, заполните все поля');
            return;
        }

        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        try {
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Создание записи...';
            submitButton.disabled = true;

            const appointmentData = {
                serviceId: this.selectedService,
                masterId: this.selectedMaster,
                appointmentDate: this.selectedDate,
                startTime: this.selectedTime
            };

            await api.createAppointment(appointmentData);
            
            notifications.success('Запись успешно создана!');
            
            // Сброс формы
            e.target.reset();
            this.selectedService = null;
            this.selectedMaster = null;
            this.selectedDate = null;
            this.selectedTime = null;
            
            document.getElementById('master').innerHTML = '<option value="">Сначала выберите услугу</option>';
            document.getElementById('timeSlots').innerHTML = '<p class="no-slots">Сначала выберите мастера и дату</p>';
            
        } catch (error) {
            console.error('Ошибка при создании записи:', error);
            notifications.error(error.message || 'Не удалось создать запись');
        } finally {
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
        }
    }
}

// Функции для работы с админ панелью
async function showAdminTab(tabName) {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContent = document.getElementById('adminTabContent');
    
    tabButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[onclick="showAdminTab('${tabName}')"]`)?.classList.add('active');
    
    switch (tabName) {
        case 'overview':
            await loadAdminOverview(tabContent);
            break;
        case 'appointments':
            await loadAdminAppointments(tabContent);
            break;
        case 'clients':
            await loadAdminClients(tabContent);
            break;
        case 'masters':
            await loadAdminMasters(tabContent);
            break;
        case 'services':
            await loadAdminServices(tabContent);
            break;
    }
}

async function loadAdminOverview(container) {
    try {
        const [appointments, clients] = await Promise.all([
            api.getAllAppointments(),
            api.getAllClients()
        ]);
        
        const totalAppointments = appointments.appointments?.length || 0;
        const totalClients = clients.clients?.length || 0;
        const completedAppointments = appointments.appointments?.filter(a => a.status === 'completed').length || 0;
        const totalRevenue = appointments.appointments?.filter(a => a.status === 'completed').reduce((sum, a) => sum + parseFloat(a.total_price || 0), 0) || 0;
        
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Всего записей</h3>
                    <div class="value">${totalAppointments}</div>
                </div>
                <div class="stat-card">
                    <h3>Всего клиентов</h3>
                    <div class="value">${totalClients}</div>
                </div>
                <div class="stat-card">
                    <h3>Завершено записей</h3>
                    <div class="value">${completedAppointments}</div>
                </div>
                <div class="stat-card">
                    <h3>Общая выручка</h3>
                    <div class="value">${totalRevenue.toFixed(0)} ₽</div>
                </div>
            </div>
            
            <h3 style="margin: 2rem 0 1rem;">Последние записи</h3>
            <div class="appointments-list">
                ${appointments.appointments?.slice(0, 5).map(appointment => `
                    <div class="appointment-card">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <h4>${appointment.service_name}</h4>
                                <p>Клиент: ${appointment.client_name}</p>
                                <p>Мастер: ${appointment.master_name}</p>
                                <p>Дата: ${new Date(appointment.appointment_date).toLocaleDateString('ru-RU')} в ${appointment.start_time.slice(0, 5)}</p>
                            </div>
                            <div class="status ${appointment.status}">
                                ${getStatusText(appointment.status)}
                            </div>
                        </div>
                    </div>
                `).join('') || '<p>Записей пока нет</p>'}
            </div>
        `;
    } catch (error) {
        container.innerHTML = '<p style="color: var(--muted);">Ошибка при загрузке данных</p>';
        console.error('Ошибка загрузки обзора:', error);
    }
}

async function loadAdminAppointments(container) {
    try {
        const response = await api.getAllAppointments();
        const appointments = response.appointments || [];
        
        container.innerHTML = `
            <h3 style="margin-bottom: 1rem;">Все записи (${appointments.length})</h3>
            <div class="appointments-list">
                ${appointments.map(appointment => `
                    <div class="appointment-card">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                            <div>
                                <h4>${appointment.service_name}</h4>
                                <p><strong>Клиент:</strong> ${appointment.client_name} (${appointment.client_phone || 'Телефон не указан'})</p>
                                <p><strong>Мастер:</strong> ${appointment.master_name}</p>
                                <p><strong>Дата:</strong> ${new Date(appointment.appointment_date).toLocaleDateString('ru-RU')} в ${appointment.start_time.slice(0, 5)}</p>
                                <p><strong>Цена:</strong> ${appointment.total_price} ₽</p>
                                ${appointment.notes ? `<p><strong>Примечания:</strong> ${appointment.notes}</p>` : ''}
                            </div>
                            <div class="status ${appointment.status}">
                                ${getStatusText(appointment.status)}
                            </div>
                        </div>
                        ${appointment.status === 'scheduled' ? `
                            <div style="display: flex; gap: 1rem;">
                                <button onclick="completeAppointment('${appointment.id}')" class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 14px;">
                                    Завершить
                                </button>
                                <button onclick="cancelAppointment('${appointment.id}')" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 14px;">
                                    Отменить
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `).join('') || '<p style="text-align: center; color: var(--text-soft);">Записей пока нет</p>'}
            </div>
        `;
    } catch (error) {
        container.innerHTML = '<p style="color: var(--muted);">Ошибка при загрузке записей</p>';
        console.error('Ошибка загрузки записей:', error);
    }
}

async function loadAdminClients(container) {
    try {
        const response = await api.getAllClients();
        const clients = response.clients || [];
        
        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h3>Клиенты (${clients.length})</h3>
                <button onclick="showCreateClientModal()" class="btn btn-primary">
                    <i class="fas fa-plus"></i>
                    Добавить клиента
                </button>
            </div>
            <div class="clients-list">
                ${clients.map(client => `
                    <div class="client-card">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <h4>${client.first_name} ${client.last_name}</h4>
                                <p><strong>Email:</strong> ${client.email}</p>
                                <p><strong>Телефон:</strong> ${client.phone || 'Не указан'}</p>
                                <p><strong>Дата регистрации:</strong> ${new Date(client.created_at).toLocaleDateString('ru-RU')}</p>
                            </div>
                            <div style="display: flex; gap: 0.5rem;">
                                <button onclick="editClient('${client.id}')" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 14px;">
                                    <i class="fas fa-edit"></i>
                                    Редактировать
                                </button>
                                <button onclick="deleteClient('${client.id}')" class="btn" style="padding: 0.5rem 1rem; font-size: 14px; background: var(--danger); color: #fff;">
                                    <i class="fas fa-trash"></i>
                                    Удалить
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('') || '<p style="text-align: center; color: var(--text-soft);">Клиентов пока нет</p>'}
            </div>
        `;
    } catch (error) {
        container.innerHTML = '<p style="color: var(--muted);">Ошибка при загрузке клиентов</p>';
        console.error('Ошибка загрузки клиентов:', error);
    }
}

async function loadAdminMasters(container) {
    try {
        const response = await api.getMasters();
        const masters = response.masters || [];
        
        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h3>Мастера (${masters.length})</h3>
                <button onclick="showCreateMasterModal()" class="btn btn-primary">
                    <i class="fas fa-plus"></i>
                    Добавить мастера
                </button>
            </div>
            <div class="masters-grid">
                ${masters.map(master => `
                    <div class="master-card">
                        <div class="master-avatar">
                            ${master.first_name.charAt(0)}${master.last_name.charAt(0)}
                        </div>
                        <h4>${master.first_name} ${master.last_name}</h4>
                        <p><strong>Телефон:</strong> ${master.phone || 'Не указан'}</p>
                        <div class="master-services">
                            ${(master.services || []).filter(s => s).map(service => 
                                `<span class="service-tag">${service}</span>`
                            ).join('') || '<span class="service-tag">Услуги не назначены</span>'}
                        </div>
                        <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                            <button onclick="editMaster('${master.id}')" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 14px; flex: 1;">
                                <i class="fas fa-edit"></i>
                                Редактировать
                            </button>
                            <button onclick="deleteMaster('${master.id}')" class="btn" style="padding: 0.5rem 1rem; font-size: 14px; background: var(--danger); color: #fff; flex: 1;">
                                <i class="fas fa-trash"></i>
                                Удалить
                            </button>
                        </div>
                    </div>
                `).join('') || '<p style="text-align: center; color: var(--text-soft);">Мастеров пока нет</p>'}
            </div>
        `;
    } catch (error) {
        container.innerHTML = '<p style="color: var(--muted);">Ошибка при загрузке мастеров</p>';
        console.error('Ошибка загрузки мастеров:', error);
    }
}

async function loadAdminServices(container) {
    try {
        const response = await api.getServices();
        const services = response.services || [];
        
        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h3>Услуги (${services.length})</h3>
                <button onclick="showCreateServiceModal()" class="btn btn-primary">
                    <i class="fas fa-plus"></i>
                    Добавить услугу
                </button>
            </div>
            <div class="services-grid">
                ${services.map(service => `
                    <div class="service-card">
                        <div class="service-icon">
                            <i class="fas fa-cut"></i>
                        </div>
                        <h4>${service.name}</h4>
                        <p>${service.description || 'Описание отсутствует'}</p>
                        <div class="service-details">
                            <span class="service-price">${service.price} ₽</span>
                            <span class="service-duration">${service.duration_minutes} мин</span>
                        </div>
                        <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                            <button onclick="editService('${service.id}')" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 14px; flex: 1;">
                                <i class="fas fa-edit"></i>
                                Редактировать
                            </button>
                            <button onclick="deleteService('${service.id}')" class="btn" style="padding: 0.5rem 1rem; font-size: 14px; background: var(--danger); color: #fff; flex: 1;">
                                <i class="fas fa-trash"></i>
                                Удалить
                            </button>
                        </div>
                        <div style="margin-top: 0.5rem; text-align: center;">
                            <span style="color: ${service.is_active ? 'var(--success)' : 'var(--danger)'}; font-size: 12px; text-transform: uppercase; font-weight: 600;">
                                ${service.is_active ? 'Активна' : 'Неактивна'}
                            </span>
                        </div>
                    </div>
                `).join('') || '<p style="text-align: center; color: var(--text-soft);">Услуг пока нет</p>'}
            </div>
        `;
    } catch (error) {
        container.innerHTML = '<p style="color: var(--muted);">Ошибка при загрузке услуг</p>';
        console.error('Ошибка загрузки услуг:', error);
    }
}

// CRUD операции
function showCreateServiceModal() {
    notifications.info('Открываем форму создания услуги...');
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Добавить услугу</h3>
                <button type="button" class="modal-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="createServiceForm" class="form">
                    <div class="form-group">
                        <label>Название услуги</label>
                        <input type="text" name="name" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Описание</label>
                        <textarea name="description" class="form-control" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Цена (₽)</label>
                        <input type="number" name="price" class="form-control" min="0" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <label>Длительность (минут)</label>
                        <input type="number" name="duration_minutes" class="form-control" min="1" required>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="is_active" checked>
                            Активная услуга
                        </label>
                    </div>
                    <button type="submit" class="btn btn-primary full-width">
                        <i class="fas fa-plus"></i>
                        Создать услугу
                    </button>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('#createServiceForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const serviceData = {
            name: formData.get('name'),
            description: formData.get('description'),
            price: parseFloat(formData.get('price')),
            duration_minutes: parseInt(formData.get('duration_minutes')),
            is_active: formData.get('is_active') === 'on'
        };
        
        try {
            await api.createService(serviceData);
            notifications.success('Услуга успешно создана');
            modal.remove();
            await showAdminTab('services');
        } catch (error) {
            notifications.error('Ошибка при создании услуги: ' + error.message);
        }
    });
}

async function editService(serviceId) {
    notifications.info('Загружаем данные услуги...');
    
    try {
        const service = await api.getServiceById(serviceId);
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Редактировать услугу</h3>
                    <button type="button" class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="editServiceForm" class="form">
                        <div class="form-group">
                            <label>Название услуги</label>
                            <input type="text" name="name" class="form-control" value="${service.name}" required>
                        </div>
                        <div class="form-group">
                            <label>Описание</label>
                            <textarea name="description" class="form-control" rows="3">${service.description || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Цена (₽)</label>
                            <input type="number" name="price" class="form-control" value="${service.price}" min="0" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label>Длительность (минут)</label>
                            <input type="number" name="duration_minutes" class="form-control" value="${service.duration_minutes}" min="1" required>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="is_active" ${service.is_active ? 'checked' : ''}>
                                Активная услуга
                            </label>
                        </div>
                        <button type="submit" class="btn btn-primary full-width">
                            <i class="fas fa-save"></i>
                            Сохранить изменения
                        </button>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#editServiceForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const serviceData = {
                name: formData.get('name'),
                description: formData.get('description'),
                price: parseFloat(formData.get('price')),
                duration_minutes: parseInt(formData.get('duration_minutes')),
                is_active: formData.get('is_active') === 'on'
            };
            
            try {
                await api.updateService(serviceId, serviceData);
                notifications.success('Услуга успешно обновлена');
                modal.remove();
                await showAdminTab('services');
            } catch (error) {
                notifications.error('Ошибка при обновлении услуги: ' + error.message);
            }
        });
        
    } catch (error) {
        notifications.error('Ошибка при загрузке данных услуги: ' + error.message);
    }
}

async function deleteService(serviceId) {
    if (!confirm('Вы уверены, что хотите удалить эту услугу?')) {
        return;
    }
    
    try {
        await api.deleteService(serviceId);
        notifications.success('Услуга успешно удалена');
        await showAdminTab('services');
    } catch (error) {
        notifications.error('Ошибка при удалении услуги: ' + error.message);
    }
}

// Функции для управления клиентами
function showCreateClientModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Добавить клиента</h3>
                <button type="button" class="modal-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="createClientForm" class="form">
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="email" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Пароль</label>
                        <input type="password" name="password" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Имя</label>
                        <input type="text" name="firstName" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Фамилия</label>
                        <input type="text" name="lastName" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Телефон</label>
                        <input type="tel" name="phone" class="form-control">
                    </div>
                    <button type="submit" class="btn btn-primary full-width">
                        <i class="fas fa-plus"></i>
                        Создать клиента
                    </button>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('#createClientForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const clientData = {
            email: formData.get('email'),
            password: formData.get('password'),
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            phone: formData.get('phone'),
            role: 'client'
        };
        
        try {
            await api.register(clientData);
            notifications.success('Клиент успешно создан');
            modal.remove();
            await showAdminTab('clients');
        } catch (error) {
            notifications.error('Ошибка при создании клиента: ' + error.message);
        }
    });
}

async function editClient(clientId) {
    try {
        const client = await api.getClientById(clientId);
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Редактировать клиента</h3>
                    <button type="button" class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="editClientForm" class="form">
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" name="email" class="form-control" value="${client.email}" required>
                        </div>
                        <div class="form-group">
                            <label>Имя</label>
                            <input type="text" name="firstName" class="form-control" value="${client.first_name}" required>
                        </div>
                        <div class="form-group">
                            <label>Фамилия</label>
                            <input type="text" name="lastName" class="form-control" value="${client.last_name}" required>
                        </div>
                        <div class="form-group">
                            <label>Телефон</label>
                            <input type="tel" name="phone" class="form-control" value="${client.phone || ''}">
                        </div>
                        <button type="submit" class="btn btn-primary full-width">
                            <i class="fas fa-save"></i>
                            Сохранить изменения
                        </button>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#editClientForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const clientData = {
                email: formData.get('email'),
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                phone: formData.get('phone')
            };
            
            try {
                await api.updateClient(clientId, clientData);
                notifications.success('Клиент успешно обновлён');
                modal.remove();
                await showAdminTab('clients');
            } catch (error) {
                notifications.error('Ошибка при обновлении клиента: ' + error.message);
            }
        });
        
    } catch (error) {
        notifications.error('Ошибка при загрузке данных клиента: ' + error.message);
    }
}

async function deleteClient(clientId) {
    if (!confirm('Вы уверены, что хотите удалить этого клиента?')) {
        return;
    }
    
    try {
        await api.deleteClient(clientId);
        notifications.success('Клиент успешно удалён');
        await showAdminTab('clients');
    } catch (error) {
        notifications.error('Ошибка при удалении клиента: ' + error.message);
    }
}

// Заглушки для мастеров (аналогично клиентам)
function showCreateMasterModal() {
    notifications.info('Создание мастера пока не реализовано');
}

function editMaster(masterId) {
    notifications.info('Редактирование мастера пока не реализовано');
}

function deleteMaster(masterId) {
    notifications.info('Удаление мастера пока не реализовано');
}

// Остальные функции
async function cancelAppointment(appointmentId) {
    if (!confirm('Вы уверены, что хотите отменить эту запись?')) {
        return;
    }
    
    try {
        await api.cancelAppointment(appointmentId);
        notifications.success('Запись отменена');
        
        // Обновляем соответствующую вкладку/дашборд
        if (UserUtils.getRole() === 'admin') {
            await showAdminTab('appointments');
        } else {
            authManager.showUserDashboard();
        }
    } catch (error) {
        notifications.error('Ошибка при отмене записи: ' + error.message);
    }
}

async function completeAppointment(appointmentId) {
    const notes = prompt('Добавить комментарий к завершенной записи:');
    
    try {
        await api.completeAppointment(appointmentId, notes || '');
        notifications.success('Запись отмечена как завершенная');
        
        if (UserUtils.getRole() === 'admin') {
            await showAdminTab('appointments');
        } else {
            authManager.showUserDashboard();
        }
    } catch (error) {
        notifications.error('Ошибка при завершении записи: ' + error.message);
    }
}

function getStatusText(status) {
    switch (status) {
        case 'scheduled': return 'Запланировано';
        case 'completed': return 'Завершено';
        case 'cancelled': return 'Отменено';
        default: return status;
    }
}

// Глобальные функции
function selectTimeSlot(time, element) {
    app.selectTimeSlot(time, element);
}

// Инициализация приложения
const app = new BarberShopApp();

// Глобальные функции для админ панели
window.showAdminTab = showAdminTab;
window.editService = editService;
window.deleteService = deleteService;
window.showCreateServiceModal = showCreateServiceModal;
window.editClient = editClient;
window.deleteClient = deleteClient;
window.showCreateClientModal = showCreateClientModal;
window.showCreateMasterModal = showCreateMasterModal;
window.editMaster = editMaster;
window.deleteMaster = deleteMaster;
window.cancelAppointment = cancelAppointment;
window.completeAppointment = completeAppointment;
window.selectTimeSlot = selectTimeSlot;
