// Основной класс приложения
class BarberShopApp {
    constructor() {
        this.services = [];
        this.masters = [];
        this.selectedService = null;
        this.selectedMaster = null;
        this.selectedDate = null;
        this.selectedTime = null;

        this.init();
    }

    async init() {
        this.setupNavigation();
        await this.loadInitialData();
        this.setupEventListeners();
        this.setMinDate();
    }

    setupNavigation() {
        // Плавная прокрутка к разделам
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                this.scrollToSection(targetId);

                // Обновляем активную ссылку
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });

        // Обновление активной ссылки при прокрутке
        window.addEventListener('scroll', this.updateActiveNavLink.bind(this));
    }

    updateActiveNavLink() {
        const sections = document.querySelectorAll('section[id]');
        const scrollY = window.pageYOffset;

        sections.forEach(section => {
            const sectionHeight = section.offsetHeight;
            const sectionTop = section.offsetTop - 100;
            const sectionId = section.getAttribute('id');

            if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    async loadInitialData() {
        try {
            // Загружаем услуги и мастеров параллельно
            const [servicesResponse, mastersResponse] = await Promise.all([
                api.getServices(),
                api.getMasters()
            ]);

            this.services = servicesResponse.services || [];
            this.masters = mastersResponse.masters || [];

            this.renderServices();
            this.renderMasters();
            this.populateServiceSelect();

        } catch (error) {
            console.error('Ошибка при загрузке начальных данных:', error);
            notifications.error('Ошибка при загрузке данных. Попробуйте обновить страницу.');
        }
    }

    renderServices() {
        const servicesGrid = document.getElementById('servicesGrid');
        if (!servicesGrid) return;

        servicesGrid.innerHTML = this.services.map(service => `
            <div class="service-card fade-in-up">
                <div class="service-icon">
                    <i class="${this.getServiceIcon(service.name)}"></i>
                </div>
                <h3 class="service-name">${service.name}</h3>
                <p class="service-description">${service.description}</p>
                <div class="service-details">
                    <span class="service-price">${service.price} ₽</span>
                    <span class="service-duration">${service.duration_minutes} мин</span>
                </div>
            </div>
        `).join('');

        // Добавляем анимацию появления
        this.animateElements('.service-card');
    }

    renderMasters() {
        const mastersGrid = document.getElementById('mastersGrid');
        if (!mastersGrid) return;

        mastersGrid.innerHTML = this.masters.map(master => `
            <div class="master-card fade-in-up">
                <div class="master-avatar">
                    ${master.first_name.charAt(0)}${master.last_name.charAt(0)}
                </div>
                <h3 class="master-name">${master.first_name} ${master.last_name}</h3>
                <p class="master-phone">${master.phone || ''}</p>
                <div class="master-services">
                    ${(master.services || []).filter(s => s).map(service => 
                        `<span class="service-tag">${service}</span>`
                    ).join('')}
                </div>
            </div>
        `).join('');

        this.animateElements('.master-card');
    }

    populateServiceSelect() {
        const serviceSelect = document.getElementById('service');
        if (!serviceSelect) return;

        serviceSelect.innerHTML = `
            <option value="">Выберите услугу</option>
            ${this.services.map(service => 
                `<option value="${service.id}" data-price="${service.price}" data-duration="${service.duration_minutes}">
                    ${service.name} - ${service.price} ₽ (${service.duration_minutes} мин)
                </option>`
            ).join('')}
        `;
    }

    getServiceIcon(serviceName) {
        const icons = {
            'стрижка': 'fas fa-cut',
            'борода': 'fas fa-user-beard',
            'бритье': 'fas fa-razor',
            'усы': 'fas fa-mustache',
            'комплекс': 'fas fa-crown',
            'детская': 'fas fa-child',
            'укладка': 'fas fa-hair-dryer',
            'мытье': 'fas fa-shower',
            'vip': 'fas fa-star',
            'камуфляж': 'fas fa-palette'
        };

        const serviceLower = serviceName.toLowerCase();
        for (const [key, icon] of Object.entries(icons)) {
            if (serviceLower.includes(key)) {
                return icon;
            }
        }

        return 'fas fa-cut'; // иконка по умолчанию
    }

    setupEventListeners() {
        // Обработчик выбора услуги
        const serviceSelect = document.getElementById('service');
        if (serviceSelect) {
            serviceSelect.addEventListener('change', this.onServiceChange.bind(this));
        }

        // Обработчик выбора мастера
        const masterSelect = document.getElementById('master');
        if (masterSelect) {
            masterSelect.addEventListener('change', this.onMasterChange.bind(this));
        }

        // Обработчик выбора даты
        const dateInput = document.getElementById('date');
        if (dateInput) {
            dateInput.addEventListener('change', this.onDateChange.bind(this));
        }

        // Обработчик формы записи
        const bookingForm = document.getElementById('bookingForm');
        if (bookingForm) {
            bookingForm.addEventListener('submit', this.onBookingSubmit.bind(this));
        }
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
            // Получаем мастеров для выбранной услуги
            const response = await api.getServiceMasters(serviceId);
            const availableMasters = response.masters || [];

            masterSelect.innerHTML = `
                <option value="">Выберите мастера</option>
                ${availableMasters.map(master => 
                    `<option value="${master.id}">${master.first_name} ${master.last_name}</option>`
                ).join('')}
            `;

            // Сбрасываем выбор времени
            timeSlots.innerHTML = '<p class="no-slots">Сначала выберите мастера и дату</p>';

        } catch (error) {
            console.error('Ошибка при загрузке мастеров:', error);
            notifications.error('Ошибка при загрузке мастеров');
        }
    }

    onMasterChange(e) {
        this.selectedMaster = e.target.value;

        if (this.selectedMaster && this.selectedDate) {
            this.loadTimeSlots();
        } else {
            const timeSlots = document.getElementById('timeSlots');
            timeSlots.innerHTML = '<p class="no-slots">Выберите дату</p>';
        }
    }

    onDateChange(e) {
        this.selectedDate = e.target.value;

        if (this.selectedMaster && this.selectedDate) {
            this.loadTimeSlots();
        } else {
            const timeSlots = document.getElementById('timeSlots');
            timeSlots.innerHTML = '<p class="no-slots">Выберите мастера</p>';
        }
    }

    async loadTimeSlots() {
        if (!this.selectedMaster || !this.selectedDate) return;

        const timeSlots = document.getElementById('timeSlots');
        timeSlots.innerHTML = '<p class="no-slots loading">Загрузка доступного времени...</p>';

        try {
            const response = await api.getMasterSchedule(this.selectedMaster, this.selectedDate);
            const schedule = response.schedule || [];

            const availableSlots = schedule.filter(slot => slot.is_available);

            if (availableSlots.length === 0) {
                timeSlots.innerHTML = '<p class="no-slots">На выбранную дату нет свободного времени</p>';
                return;
            }

            timeSlots.innerHTML = availableSlots.map(slot => 
                `<div class="time-slot" data-time="${slot.start_time}" onclick="selectTimeSlot(this, '${slot.start_time}')">
                    ${slot.start_time.slice(0, 5)}
                </div>`
            ).join('');

        } catch (error) {
            console.error('Ошибка при загрузке расписания:', error);
            timeSlots.innerHTML = '<p class="no-slots">Ошибка при загрузке расписания</p>';
        }
    }

    async onBookingSubmit(e) {
        e.preventDefault();

        if (!UserUtils.isLoggedIn()) {
            notifications.warning('Для записи необходимо войти в систему');
            showAuthModal();
            return;
        }

        if (!this.selectedService || !this.selectedMaster || !this.selectedDate || !this.selectedTime) {
            notifications.error('Заполните все поля формы');
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

            // Сбрасываем форму
            e.target.reset();
            this.selectedService = null;
            this.selectedMaster = null;
            this.selectedDate = null;
            this.selectedTime = null;

            // Очищаем слоты времени
            document.getElementById('timeSlots').innerHTML = '<p class="no-slots">Сначала выберите мастера и дату</p>';

            // Если пользователь находится в дашборде, перезагружаем данные
            if (UserUtils.isLoggedIn() && UserUtils.getRole() === 'client') {
                setTimeout(() => {
                    authManager.showUserDashboard();
                }, 1500);
            }

        } catch (error) {
            console.error('Ошибка при создании записи:', error);
            notifications.error(error.message || 'Ошибка при создании записи');
        } finally {
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
        }
    }

    setMinDate() {
        const dateInput = document.getElementById('date');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.setAttribute('min', today);

            // Устанавливаем максимальную дату (например, на 2 месяца вперед)
            const maxDate = new Date();
            maxDate.setMonth(maxDate.getMonth() + 2);
            dateInput.setAttribute('max', maxDate.toISOString().split('T')[0]);
        }
    }

    scrollToSection(sectionId) {
        const element = document.getElementById(sectionId);
        if (element) {
            const headerHeight = 70; // высота фиксированной навигации
            const elementPosition = element.offsetTop - headerHeight;

            window.scrollTo({
                top: elementPosition,
                behavior: 'smooth'
            });
        }
    }

    animateElements(selector) {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el, index) => {
            setTimeout(() => {
                el.style.opacity = '0';
                el.style.transform = 'translateY(20px)';
                el.style.transition = 'all 0.6s ease';

                setTimeout(() => {
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                }, 100);
            }, index * 100);
        });
    }
}

// Глобальные функции для работы с интерфейсом
function selectTimeSlot(element, time) {
    // Убираем выделение с других слотов
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });

    // Выделяем выбранный слот
    element.classList.add('selected');

    // Сохраняем выбранное время
    app.selectedTime = time;
}

function scrollToSection(sectionId) {
    app.scrollToSection(sectionId);
}

// Функции для работы с записями
async function cancelAppointment(appointmentId) {
    if (!confirm('Вы уверены, что хотите отменить запись?')) {
        return;
    }

    try {
        await api.cancelAppointment(appointmentId);
        notifications.success('Запись успешно отменена');

        // Перезагружаем дашборд
        setTimeout(() => {
            authManager.showUserDashboard();
        }, 1000);

    } catch (error) {
        notifications.error('Ошибка при отмене записи');
        console.error(error);
    }
}

async function completeAppointment(appointmentId, notes = '') {
    try {
        await api.completeAppointment(appointmentId, notes);
        notifications.success('Запись отмечена как выполненная');

        // Перезагружаем дашборд
        setTimeout(() => {
            authManager.showUserDashboard();
        }, 1000);

    } catch (error) {
        notifications.error('Ошибка при завершении записи');
        console.error(error);
    }
}

// Функции для админ панели
async function showAdminTab(tabName) {
    // Обновляем активную вкладку
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    event.target?.classList.add('active');

    const tabContent = document.getElementById('adminTabContent');

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
        const [appointmentsResponse, clientsResponse] = await Promise.all([
            api.getAllAppointments(),
            api.getAllClients()
        ]);

        const appointments = appointmentsResponse.appointments || [];
        const clients = clientsResponse.clients || [];

        const totalRevenue = appointments
            .filter(a => a.status === 'completed')
            .reduce((sum, a) => sum + parseFloat(a.total_price || 0), 0);

        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Всего записей</h3>
                    <div class="value">${appointments.length}</div>
                </div>
                <div class="stat-card">
                    <h3>Завершенных записей</h3>
                    <div class="value">${appointments.filter(a => a.status === 'completed').length}</div>
                </div>
                <div class="stat-card">
                    <h3>Активных записей</h3>
                    <div class="value">${appointments.filter(a => a.status === 'scheduled').length}</div>
                </div>
                <div class="stat-card">
                    <h3>Общая выручка</h3>
                    <div class="value">${totalRevenue} ₽</div>
                </div>
                <div class="stat-card">
                    <h3>Всего клиентов</h3>
                    <div class="value">${clients.length}</div>
                </div>
                <div class="stat-card">
                    <h3>Отмененных записей</h3>
                    <div class="value">${appointments.filter(a => a.status === 'cancelled').length}</div>
                </div>
            </div>
        `;
    } catch (error) {
        notifications.error('Ошибка при загрузке обзора');
        console.error(error);
    }
}

async function loadAdminAppointments(container) {
    try {
        const response = await api.getAllAppointments();
        const appointments = response.appointments || [];

        container.innerHTML = `
            <div style="margin-bottom: 2rem;">
                <h3>Управление записями (${appointments.length})</h3>
            </div>
            <div class="appointments-list">
                ${appointments.map(appointment => `
                    <div class="appointment-card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius-lg); border: 1px solid var(--border-light); margin-bottom: 1rem;">
                        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 1rem; align-items: center;">
                            <div>
                                <h4 style="font-weight: 600; margin-bottom: 0.25rem;">${appointment.service_name}</h4>
                                <p style="color: var(--text-secondary); font-size: var(--font-size-sm); margin-bottom: 0.25rem;">
                                    Клиент: ${appointment.client_name} | Мастер: ${appointment.master_name}
                                </p>
                                <p style="color: var(--text-secondary); font-size: var(--font-size-sm);">
                                    ${new Date(appointment.appointment_date).toLocaleDateString('ru-RU')} в ${appointment.start_time.slice(0, 5)}
                                </p>
                            </div>
                            <div style="text-align: center;">
                                <div class="status ${appointment.status}" style="padding: 0.25rem 0.75rem; border-radius: var(--radius-full); font-size: var(--font-size-sm); font-weight: 500; display: inline-block;">
                                    ${authManager.getStatusText(appointment.status)}
                                </div>
                            </div>
                            <div style="text-align: center; font-weight: 600; color: var(--primary-color);">
                                ${appointment.total_price} ₽
                            </div>
                            <div style="display: flex; gap: 0.5rem;">
                                ${appointment.status === 'scheduled' ? `
                                    <button onclick="cancelAppointment('${appointment.id}')" class="btn-secondary" style="padding: 0.25rem 0.5rem; font-size: var(--font-size-sm);">
                                        Отменить
                                    </button>
                                    <button onclick="completeAppointment('${appointment.id}')" class="btn-primary" style="padding: 0.25rem 0.5rem; font-size: var(--font-size-sm);">
                                        Завершить
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        notifications.error('Ошибка при загрузке записей');
        console.error(error);
    }
}

async function loadAdminClients(container) {
    try {
        const response = await api.getAllClients();
        const clients = response.clients || [];

        container.innerHTML = `
            <div style="margin-bottom: 2rem;">
                <h3>Управление клиентами (${clients.length})</h3>
            </div>
            <div class="clients-list">
                ${clients.map(client => `
                    <div class="client-card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius-lg); border: 1px solid var(--border-light); margin-bottom: 1rem;">
                        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 1rem; align-items: center;">
                            <div>
                                <h4 style="font-weight: 600; margin-bottom: 0.25rem;">${client.first_name} ${client.last_name}</h4>
                                <p style="color: var(--text-secondary); font-size: var(--font-size-sm); margin-bottom: 0.25rem;">
                                    Email: ${client.email}
                                </p>
                                <p style="color: var(--text-secondary); font-size: var(--font-size-sm);">
                                    Телефон: ${client.phone || 'Не указан'}
                                </p>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-weight: 600; color: var(--primary-color);">
                                    ${client.appointment_count} записей
                                </div>
                            </div>
                            <div style="text-align: center; font-weight: 600; color: var(--accent-color);">
                                ${client.total_spent || 0} ₽
                            </div>
                            <div style="display: flex; gap: 0.5rem;">
                                <button onclick="editClient('${client.id}')" class="btn-secondary" style="padding: 0.25rem 0.5rem; font-size: var(--font-size-sm);">
                                    Редактировать
                                </button>
                                <button onclick="deleteClient('${client.id}')" class="btn-secondary" style="padding: 0.25rem 0.5rem; font-size: var(--font-size-sm); color: #ef4444;">
                                    Удалить
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        notifications.error('Ошибка при загрузке клиентов');
        console.error(error);
    }
}

// Функции для управления мастерами
async function showScheduleManager() {
    // Функция для мастеров для управления расписанием
    const today = new Date().toISOString().split('T')[0];

    const scheduleHtml = `
        <div class="modal active" id="scheduleModal" style="z-index: 3000;">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>Управление расписанием</h3>
                    <button class="modal-close" onclick="closeScheduleModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="scheduleForm">
                        <div class="form-group">
                            <label for="scheduleDate">Выберите дату</label>
                            <input type="date" id="scheduleDate" name="date" min="${today}" required>
                        </div>
                        <div class="form-group">
                            <label>Временные слоты</label>
                            <div id="timeSlotCreator" style="display: grid; gap: 0.5rem; margin-top: 0.5rem;">
                                <button type="button" onclick="addTimeSlot()" class="btn-secondary">
                                    <i class="fas fa-plus"></i> Добавить слот
                                </button>
                            </div>
                        </div>
                        <button type="submit" class="btn-primary full-width">
                            Сохранить расписание
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', scheduleHtml);

    // Обработчик формы расписания
    document.getElementById('scheduleForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const date = formData.get('date');

        const timeSlots = [];
        document.querySelectorAll('.time-slot-inputs').forEach(slotDiv => {
            const startTime = slotDiv.querySelector('.start-time').value;
            const endTime = slotDiv.querySelector('.end-time').value;
            if (startTime && endTime) {
                timeSlots.push({ startTime, endTime });
            }
        });

        if (timeSlots.length === 0) {
            notifications.error('Добавьте хотя бы один временной слот');
            return;
        }

        try {
            await api.createMasterSchedule({ date, timeSlots });
            notifications.success('Расписание успешно создано');
            closeScheduleModal();
        } catch (error) {
            notifications.error('Ошибка при создании расписания');
            console.error(error);
        }
    });
}

function addTimeSlot() {
    const container = document.getElementById('timeSlotCreator');
    const slotHtml = `
        <div class="time-slot-inputs" style="display: flex; gap: 0.5rem; align-items: center; background: var(--bg-secondary); padding: 0.75rem; border-radius: var(--radius-md);">
            <input type="time" class="start-time" placeholder="Начало" style="flex: 1; border: 1px solid var(--border-color); padding: 0.5rem; border-radius: var(--radius-sm);">
            <span>-</span>
            <input type="time" class="end-time" placeholder="Конец" style="flex: 1; border: 1px solid var(--border-color); padding: 0.5rem; border-radius: var(--radius-sm);">
            <button type="button" onclick="this.parentElement.remove()" style="background: #ef4444; color: white; border: none; padding: 0.5rem; border-radius: var(--radius-sm); cursor: pointer;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', slotHtml);
}

function closeScheduleModal() {
    const modal = document.getElementById('scheduleModal');
    if (modal) {
        modal.remove();
    }
}

// Дополнительные функции для админки
async function editClient(clientId) {
    // Заглушка для редактирования клиента
    notifications.info('Функция редактирования в разработке');
}

async function deleteClient(clientId) {
    if (!confirm('Вы уверены, что хотите удалить этого клиента?')) {
        return;
    }

    try {
        await api.deleteClient(clientId);
        notifications.success('Клиент успешно удален');

        // Перезагружаем список клиентов
        setTimeout(() => {
            showAdminTab('clients');
        }, 1000);
    } catch (error) {
        notifications.error('Ошибка при удалении клиента');
        console.error(error);
    }
}

async function loadAdminMasters(container) {
    container.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <h3>Управление мастерами</h3>
            <p style="color: var(--text-secondary); margin-top: 1rem;">
                Функция управления мастерами будет добавлена в следующих обновлениях
            </p>
        </div>
    `;
}

async function loadAdminServices(container) {
    try {
        const response = await api.getServices();
        const services = response.services || [];

        container.innerHTML = `
            <div style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center;">
                <h3>Управление услугами (${services.length})</h3>
                <button onclick="showCreateServiceModal()" class="btn-primary">
                    <i class="fas fa-plus"></i> Добавить услугу
                </button>
            </div>
            <div class="services-list">
                ${services.map(service => `
                    <div class="service-card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius-lg); border: 1px solid var(--border-light); margin-bottom: 1rem;">
                        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 1rem; align-items: center;">
                            <div>
                                <h4 style="font-weight: 600; margin-bottom: 0.25rem;">${service.name}</h4>
                                <p style="color: var(--text-secondary); font-size: var(--font-size-sm);">
                                    ${service.description}
                                </p>
                            </div>
                            <div style="text-align: center; font-weight: 600; color: var(--primary-color);">
                                ${service.price} ₽
                            </div>
                            <div style="text-align: center; color: var(--text-secondary);">
                                ${service.duration_minutes} мин
                            </div>
                            <div style="display: flex; gap: 0.5rem;">
                                <button onclick="editService('${service.id}')" class="btn-secondary" style="padding: 0.25rem 0.5rem; font-size: var(--font-size-sm);">
                                    Редактировать
                                </button>
                                <button onclick="deleteService('${service.id}')" class="btn-secondary" style="padding: 0.25rem 0.5rem; font-size: var(--font-size-sm); color: #ef4444;">
                                    Удалить
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        notifications.error('Ошибка при загрузке услуг');
        console.error(error);
    }
}

function showCreateServiceModal() {
    notifications.info('Функция добавления услуг в разработке');
}

function editService(serviceId) {
    notifications.info('Функция редактирования услуг в разработке');
}

async function deleteService(serviceId) {
    if (!confirm('Вы уверены, что хотите удалить эту услугу?')) {
        return;
    }

    try {
        await api.deleteService(serviceId);
        notifications.success('Услуга успешно удалена');

        // Перезагружаем список услуг
        setTimeout(() => {
            showAdminTab('services');
        }, 1000);
    } catch (error) {
        notifications.error('Ошибка при удалении услуги');
        console.error(error);
    }
}

// Инициализация приложения
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new BarberShopApp();
});
