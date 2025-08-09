 // Global Variables
let currentUser = null;
let isAuthenticated = false;

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    checkAuthentication();
    setupMobileNavigation();
});

// Mobile Navigation Functions
function setupMobileNavigation() {
    // Mobile nav toggle
    const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
    const nav = document.querySelector('.nav');
    const overlay = document.querySelector('.mobile-overlay');
    
    if (mobileNavToggle) {
        mobileNavToggle.addEventListener('click', toggleMobileNav);
    }
    
    if (overlay) {
        overlay.addEventListener('click', closeMobileNav);
    }
    
    // Mobile bottom nav
    const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
    mobileNavItems.forEach(item => {
        item.addEventListener('click', function() {
            mobileNavItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function toggleMobileNav() {
    const nav = document.querySelector('.nav');
    const overlay = document.querySelector('.mobile-overlay');
    
    if (nav) {
        nav.classList.toggle('active');
    }
    
    if (overlay) {
        overlay.classList.toggle('active');
    }
    
    // Prevent body scroll when nav is open
    document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : 'auto';
}

function closeMobileNav() {
    const nav = document.querySelector('.nav');
    const overlay = document.querySelector('.mobile-overlay');
    
    if (nav) {
        nav.classList.remove('active');
    }
    
    if (overlay) {
        overlay.classList.remove('active');
    }
    
    document.body.style.overflow = 'auto';
}

// Initialize Application
function initializeApp() {
    console.log('مدرسه قرآن استاد علی محرابی - سیستم راه‌اندازی شد');
    
    // Set current date and time
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Initialize tooltips
    initializeTooltips();
    
    // Initialize charts if Chart.js is available
    if (typeof Chart !== 'undefined') {
        initializeCharts();
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Form submissions
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', handleFormSubmit);
    });
    
    // Navigation
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
    
    // Modal close buttons
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(button => {
        button.addEventListener('click', closeModal);
    });
    
    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', handleFilter);
    });
    
    // Tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', handleTabSwitch);
    });
    
    // Search functionality
    const searchInput = document.getElementById('userSearch');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    // Password confirmation
    const confirmPassword = document.getElementById('confirm_password');
    if (confirmPassword) {
        confirmPassword.addEventListener('input', validatePasswordMatch);
    }
}

// Update Date and Time
function updateDateTime() {
    const now = new Date();
    const dateOptions = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    };
    const timeOptions = { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    };
    
    const dateElement = document.getElementById('current-date');
    const timeElement = document.getElementById('current-time');
    
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('fa-IR', dateOptions);
    }
    if (timeElement) {
        timeElement.textContent = now.toLocaleTimeString('fa-IR', timeOptions);
    }
}

// Check Authentication
function checkAuthentication() {
    const userToken = localStorage.getItem('userToken');
    const userData = localStorage.getItem('userData');
    
    if (userToken && userData) {
        try {
            currentUser = JSON.parse(userData);
            isAuthenticated = true;
            updateUIForAuthenticatedUser();
        } catch (error) {
            console.error('خطا در بارگذاری اطلاعات کاربر:', error);
            logout();
        }
    } else {
        updateUIForUnauthenticatedUser();
    }
}

// Update UI for Authenticated User
function updateUIForAuthenticatedUser() {
    const authElements = document.querySelectorAll('.auth-only');
    const unauthElements = document.querySelectorAll('.unauth-only');
    
    authElements.forEach(element => {
        element.style.display = 'block';
    });
    
    unauthElements.forEach(element => {
        element.style.display = 'none';
    });
    
    // Update user info in sidebar
    const userNameElement = document.querySelector('.user-details h4');
    const userRoleElement = document.querySelector('.user-details p');
    
    if (userNameElement && currentUser) {
        userNameElement.textContent = currentUser.full_name || 'کاربر';
    }
    if (userRoleElement && currentUser) {
        userRoleElement.textContent = currentUser.role || 'دانش‌آموز';
    }
}

// Update UI for Unauthenticated User
function updateUIForUnauthenticatedUser() {
    const authElements = document.querySelectorAll('.auth-only');
    const unauthElements = document.querySelectorAll('.unauth-only');
    
    authElements.forEach(element => {
        element.style.display = 'none';
    });
    
    unauthElements.forEach(element => {
        element.style.display = 'block';
    });
}

// Handle Form Submission
function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    // Validate form
    if (!validateForm(form, data)) {
        return;
    }
    
    // Handle different form types
    if (form.id === 'loginForm') {
        handleLogin(data);
    } else if (form.id === 'registerForm') {
        handleRegister(data);
    } else if (form.id === 'registrationForm') {
        handleClassRegistration(data);
    } else if (form.id === 'addUserForm') {
        handleAddUser(data);
    }
}

// Validate Form
function validateForm(form, data) {
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!data[field.name] || data[field.name].trim() === '') {
            showFieldError(field, 'این فیلد الزامی است');
            isValid = false;
        } else {
            clearFieldError(field);
        }
    });
    
    // Specific validations
    if (data.national_id && !isValidNationalId(data.national_id)) {
        showFieldError(form.querySelector('[name="national_id"]'), 'کد ملی معتبر نیست');
        isValid = false;
    }
    
    if (data.phone && !isValidPhone(data.phone)) {
        showFieldError(form.querySelector('[name="phone"]'), 'شماره تلفن معتبر نیست');
        isValid = false;
    }
    
    if (data.email && !isValidEmail(data.email)) {
        showFieldError(form.querySelector('[name="email"]'), 'ایمیل معتبر نیست');
        isValid = false;
    }
    
    return isValid;
}

// Validate National ID
function isValidNationalId(nationalId) {
    if (!/^\d{10}$/.test(nationalId)) {
        return false;
    }
    
    const check = parseInt(nationalId[9]);
    let sum = 0;
    
    for (let i = 0; i < 9; i++) {
        sum += parseInt(nationalId[i]) * (10 - i);
    }
    
    const remainder = sum % 11;
    return (remainder < 2 && check === remainder) || (remainder >= 2 && check === 11 - remainder);
}

// Validate Phone Number
function isValidPhone(phone) {
    return /^09\d{9}$/.test(phone);
}

// Validate Email
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Show Field Error
function showFieldError(field, message) {
    clearFieldError(field);
    
    field.classList.add('error');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    errorDiv.style.color = '#dc3545';
    errorDiv.style.fontSize = '0.8rem';
    errorDiv.style.marginTop = '0.25rem';
    
    field.parentNode.appendChild(errorDiv);
}

// Clear Field Error
function clearFieldError(field) {
    field.classList.remove('error');
    const errorDiv = field.parentNode.querySelector('.field-error');
    if (errorDiv) {
        errorDiv.remove();
    }
}

// Validate Password Match
function validatePasswordMatch() {
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirm_password');
    
    if (password && confirmPassword) {
        if (password.value !== confirmPassword.value) {
            showFieldError(confirmPassword, 'رمز عبور مطابقت ندارد');
        } else {
            clearFieldError(confirmPassword);
        }
    }
}

// Handle Login
function handleLogin(data) {
    // Simulate API call
    showLoading('در حال ورود...');
    
    setTimeout(() => {
        // Mock authentication
        if (data.national_id && data.password) {
            const mockUser = {
                id: '1',
                national_id: data.national_id,
                full_name: 'کاربر نمونه',
                role: 'student',
                user_type: 'quran_student'
            };
            
            localStorage.setItem('userToken', 'mock-token-' + Date.now());
            localStorage.setItem('userData', JSON.stringify(mockUser));
            
            currentUser = mockUser;
            isAuthenticated = true;
            
            hideLoading();
            showSuccess('ورود موفقیت‌آمیز بود!');
            
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);
        } else {
            hideLoading();
            showError('کد ملی یا رمز عبور اشتباه است!');
        }
    }, 1000);
}

// Handle Register
function handleRegister(data) {
    showLoading('در حال ثبت‌نام...');
    
    setTimeout(() => {
        // Mock registration
        const newUser = {
            id: Date.now().toString(),
            national_id: data.national_id,
            full_name: data.full_name,
            phone: data.phone,
            user_type: data.user_type,
            role: 'student'
        };
        
        hideLoading();
        showSuccess('ثبت‌نام با موفقیت انجام شد! حالا می‌توانید وارد شوید.');
        
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
    }, 1500);
}

// Handle Class Registration
function handleClassRegistration(data) {
    showLoading('در حال ثبت‌نام در کلاس...');
    
    setTimeout(() => {
        hideLoading();
        showSuccess('ثبت‌نام شما در کلاس با موفقیت انجام شد!');
        closeModal();
    }, 1000);
}

// Handle Add User (Admin)
function handleAddUser(data) {
    showLoading('در حال افزودن کاربر...');
    
    setTimeout(() => {
        hideLoading();
        showSuccess('کاربر با موفقیت اضافه شد!');
        closeModal();
        location.reload();
    }, 1000);
}

// Handle Navigation
function handleNavigation(event) {
    const link = event.currentTarget;
    const href = link.getAttribute('href');
    
    if (href && href.startsWith('#')) {
        event.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

// Handle Filter
function handleFilter(event) {
    const button = event.currentTarget;
    const filter = button.dataset.filter;
    
    // Remove active class from all buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to current button
    button.classList.add('active');
    
    // Filter items
    const items = document.querySelectorAll('.class-card');
    items.forEach(item => {
        if (filter === 'all' || item.dataset.category === filter) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Handle Tab Switch
function handleTabSwitch(event) {
    const button = event.currentTarget;
    const tabName = button.dataset.tab;
    
    // Remove active class from all tabs and contents
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Add active class to current tab and content
    button.classList.add('active');
    const tabContent = document.getElementById(tabName);
    if (tabContent) {
        tabContent.classList.add('active');
    }
}

// Handle Search
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const tableRows = document.querySelectorAll('tbody tr');
    
    tableRows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Modal Functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
    document.body.style.overflow = 'auto';
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            closeModal();
        }
    });
});

// Loading Functions
function showLoading(message = 'در حال بارگذاری...') {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading';
    loadingDiv.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>${message}</p>
        </div>
    `;
    loadingDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    `;
    
    document.body.appendChild(loadingDiv);
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.remove();
    }
}

// Notification Functions
function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showWarning(message) {
    showNotification(message, 'warning');
}

function showInfo(message) {
    showNotification(message, 'info');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${getNotificationIcon(type)}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 1rem;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        max-width: 400px;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    return icons[type] || icons.info;
}

function getNotificationColor(type) {
    const colors = {
        success: '#4CAF50',
        error: '#dc3545',
        warning: '#ff9800',
        info: '#2196F3'
    };
    return colors[type] || colors.info;
}

// Initialize Tooltips
function initializeTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });
}

function showTooltip(event) {
    const element = event.currentTarget;
    const tooltipText = element.dataset.tooltip;
    
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = tooltipText;
    tooltip.style.cssText = `
        position: absolute;
        background: #333;
        color: white;
        padding: 0.5rem;
        border-radius: 4px;
        font-size: 0.8rem;
        z-index: 1000;
        pointer-events: none;
    `;
    
    document.body.appendChild(tooltip);
    
    const rect = element.getBoundingClientRect();
    tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';
    tooltip.style.left = rect.left + (rect.width - tooltip.offsetWidth) / 2 + 'px';
    
    element.tooltip = tooltip;
}

function hideTooltip(event) {
    const element = event.currentTarget;
    if (element.tooltip) {
        element.tooltip.remove();
        element.tooltip = null;
    }
}

// Initialize Charts
function initializeCharts() {
    // This function will be called if Chart.js is available
    console.log('Charts initialized');
}

// Logout Function
function logout() {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    currentUser = null;
    isAuthenticated = false;
    
    showSuccess('شما با موفقیت خارج شدید.');
    
    setTimeout(() => {
        window.location.href = '/';
    }, 1000);
}

// Utility Functions
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('fa-IR');
}

function formatTime(date) {
    return new Date(date).toLocaleTimeString('fa-IR');
}

// Export functions for global use
window.showSuccess = showSuccess;
window.showError = showError;
window.showWarning = showWarning;
window.showInfo = showInfo;
window.logout = logout;
window.openModal = openModal;
window.closeModal = closeModal;
window.showLoading = showLoading;
window.hideLoading = hideLoading;

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(-100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .loading-spinner {
        text-align: center;
        color: white;
    }
    
    .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-top: 4px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        margin-right: auto;
    }
    
    .field-error {
        color: #dc3545;
        font-size: 0.8rem;
        margin-top: 0.25rem;
    }
    
    input.error {
        border-color: #dc3545;
    }
`;
document.head.appendChild(style);