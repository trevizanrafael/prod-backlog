// Main Application Logic

const API_URL = '/api';
let currentModule = 'home';

// Initialize application
// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initializeNavigation();
    initializeUserInterface();
    loadModule('home');
});

// Authentication Check
function checkAuth() {
    const token = localStorage.getItem('token');

    // Simple check: if no token, redirect to login
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
}

// Initialize User Interface (Sidebar info, Logout)
// Initialize User Interface (Sidebar info, Logout)
// Initialize User Interface (Sidebar info, Logout)
function initializeUserInterface() {
    const userJson = localStorage.getItem('user');
    if (userJson) {
        const user = JSON.parse(userJson);

        // Populate Profile Info in Sidebar
        const profileName = document.querySelector('.profile-name');
        const profileRole = document.querySelector('.profile-role');
        const profileInitials = document.querySelector('.profile-initials');

        if (profileName) profileName.textContent = user.name || user.username || 'Usuário';
        if (profileRole) profileRole.textContent = user.role || 'Membro';
        if (profileInitials) {
            const name = user.name || user.username || 'U';
            profileInitials.textContent = name.charAt(0).toUpperCase();
        }

        // Show Users tab only for Admin (or SuperUser)
        if (user.role === 'Admin' || user.username === 'SuperUser') {
            const navUsers = document.getElementById('nav-users');
            if (navUsers) {
                navUsers.classList.remove('hidden');
            }

            const navRoles = document.getElementById('nav-roles');
            if (navRoles) {
                navRoles.classList.remove('hidden');
            }
        }


    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

// Make logout available globally
window.logout = logout;

// ==================== PERMISSION SYSTEM ====================

// Check if current user has a specific permission
function hasPermission(permissionName) {
    const userJson = localStorage.getItem('user');
    if (!userJson) return false;

    try {
        const user = JSON.parse(userJson);
        const permissions = user.permissions;

        if (!permissions) return false;

        // Parse if it's a JSON string
        const perms = typeof permissions === 'string' ? JSON.parse(permissions) : permissions;

        return perms[permissionName] === true;
    } catch (error) {
        console.error('Error checking permission:', error);
        return false;
    }
}

// Require permission - show modal if user doesn't have it
function requirePermission(permissionName, actionName = 'esta ação') {
    if (!hasPermission(permissionName)) {
        showPermissionDenied(actionName, permissionName);
        return false;
    }
    return true;
}

// Show permission denied modal
function showPermissionDenied(actionName, permissionName = '') {
    const permissionLabels = {
        create_task: 'Criar Tasks',
        edit_task: 'Editar Tasks',
        manage_scopes: 'Criar/Editar Escopos',
        delete_task: 'Deletar Tasks'
    };

    const permissionLabel = permissionLabels[permissionName] || permissionName;

    const modalHtml = `
        <div id="permissionDeniedModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div class="flex items-center mb-4">
                    <div class="bg-red-100 rounded-full p-3 mr-4">
                        <i class="fas fa-ban text-red-600 text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-900">Permissão Negada</h3>
                </div>
                <p class="text-gray-600 mb-4">
                    Você não tem permissão para <strong>${actionName}</strong>.
                    ${permissionLabel ? `<br><br>Permissão necessária: <strong>${permissionLabel}</strong>` : ''}
                </p>
                <p class="text-sm text-gray-500 mb-6">
                    Entre em contato com o administrador do sistema para solicitar acesso.
                </p>
                <button onclick="closePermissionDeniedModal()" class="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Entendi
                </button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closePermissionDeniedModal() {
    const modal = document.getElementById('permissionDeniedModal');
    if (modal) modal.remove();
}

// Make permission functions globally available
window.hasPermission = hasPermission;
window.requirePermission = requirePermission;
window.showPermissionDenied = showPermissionDenied;
window.closePermissionDeniedModal = closePermissionDeniedModal;

// ==================== NAVIGATION ====================

function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const module = link.getAttribute('data-module');

            // If no data-module (e.g., standard href), let default behavior happen
            if (!module) return;

            e.preventDefault();

            // Update active state
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Load module
            loadModule(module);
        });
    });
}

// Module Loader
function loadModule(moduleName) {
    currentModule = moduleName;
    const mainContent = document.getElementById('mainContent');

    // Show loading
    mainContent.innerHTML = '<div class="spinner"></div>';

    // Load the appropriate module
    setTimeout(() => {
        switch (moduleName) {
            case 'home':
                loadHomeModule();
                break;
            case 'tasks':
                loadTasksModule();
                break;
            case 'scopes':
                loadScopesModule();
                break;
            case 'task-list':
                loadTaskListModule();
                break;
            case 'dashboard':
                loadDashboardModule();
                break;
            case 'settings':
                loadSettingsModule();
                break;
            case 'users':
                loadUsersModule();
                break;
            case 'roles':
                loadRolesModule();
                break;
            default:
                mainContent.innerHTML = '<h1 class="text-2xl font-bold">Módulo não encontrado</h1>';
        }
    }, 300);
}

// API Helper Functions
function getAuthHeaders() {
    const headers = {
        'Content-Type': 'application/json',
    };
    const token = localStorage.getItem('token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

async function apiGet(endpoint) {
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${API_URL}${endpoint}`, { headers });

        if (response.status === 401 || response.status === 403) {
            logout();
            throw new Error('Unauthorized');
        }

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('API GET Error:', error);
        showNotification('Erro ao buscar dados', 'error');
        throw error;
    }
}

async function apiPost(endpoint, data) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });

        if (response.status === 401 || response.status === 403) {
            logout();
            throw new Error('Unauthorized');
        }

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('API POST Error:', error);
        showNotification('Erro ao enviar dados', 'error');
        throw error;
    }
}

async function apiPut(endpoint, data) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });

        if (response.status === 401 || response.status === 403) {
            logout();
            throw new Error('Unauthorized');
        }

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('API PUT Error:', error);
        showNotification('Erro ao atualizar dados', 'error');
        throw error;
    }
}

async function apiPatch(endpoint, data) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });

        if (response.status === 401 || response.status === 403) {
            logout();
            throw new Error('Unauthorized');
        }

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('API PATCH Error:', error);
        showNotification('Erro ao atualizar dados', 'error');
        throw error;
    }
}

async function apiDelete(endpoint) {
    try {
        const headers = getAuthHeaders();
        // DELETE usually doesn't need Content-Type, but getAuthHeaders includes it. 
        // fetch handles it fine, but strictly speaking we might only need Auth.
        // Let's keep it simple.

        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'DELETE',
            headers: headers
        });

        if (response.status === 401 || response.status === 403) {
            logout();
            throw new Error('Unauthorized');
        }

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('API DELETE Error:', error);
        showNotification('Erro ao deletar dados', 'error');
        throw error;
    }
}

async function uploadFile(endpoint, file) {
    try {
        const formData = new FormData();
        formData.append('screenshot', file);

        const token = localStorage.getItem('token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: headers, // Do NOT set Content-Type for FormData, browser does it with boundary
            body: formData,
        });

        if (response.status === 401 || response.status === 403) {
            logout();
            throw new Error('Unauthorized');
        }

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('File Upload Error:', error);
        showNotification('Erro ao fazer upload do arquivo', 'error');
        throw error;
    }
}

// Utility Functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
}

function getPriorityBadge(priority) {
    const badges = {
        high: '<span class="badge badge-high">Alta</span>',
        medium: '<span class="badge badge-medium">Média</span>',
        low: '<span class="badge badge-low">Baixa</span>',
    };
    return badges[priority] || priority;
}

function getComplexityBadge(complexity) {
    const badges = {
        easy: '<span class="badge badge-easy">Fácil</span>',
        normal: '<span class="badge badge-normal">Normal</span>',
        hard: '<span class="badge badge-hard">Difícil</span>',
    };
    return badges[complexity] || complexity;
}

function getStatusBadge(task) {
    if (task.completed_at) {
        return '<span class="badge status-completed">Concluída</span>';
    }

    const dueDate = new Date(task.due_date);
    const now = new Date();

    if (dueDate < now) {
        return '<span class="badge status-overdue">Atrasada</span>';
    }

    return '<span class="badge status-pending">Pendente</span>';
}

function getDaysUntilDue(dateString) {
    const dueDate = new Date(dateString);
    const now = new Date();
    const diffTime = dueDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return `${Math.abs(diffDays)} dias atrasado`;
    } else if (diffDays === 0) {
        return 'Vence hoje';
    } else if (diffDays === 1) {
        return 'Vence amanhã';
    } else {
        return `${diffDays} dias restantes`;
    }
}

// Notification System
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 transition-opacity ${type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Confirm Dialog
function confirmDialog(message) {
    return confirm(message);
}
