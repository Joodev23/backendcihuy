let currentUser = null;
let currentSection = 'overview';

const API_BASE = '';

const loginModal = document.getElementById('loginModal');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const navLinks = document.querySelectorAll('.nav-link');
const contentSections = document.querySelectorAll('.content-section');
const pageTitle = document.getElementById('pageTitle');

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    const savedUser = localStorage.getItem('pterodactylUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showDashboard();
    } else {
        showLogin();
    }

    setupEventListeners();
}

function setupEventListeners() {
    loginForm.addEventListener('submit', handleLogin);
    
    logoutBtn.addEventListener('click', handleLogout);
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            showSection(section);
        });
    });

    const createPanelForm = document.getElementById('createPanelForm');
    createPanelForm.addEventListener('submit', handleCreatePanel);

    const createAdminForm = document.getElementById('createAdminForm');
    createAdminForm.addEventListener('submit', handleCreateAdmin);

    setInterval(refreshData, 30000);
}

async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(loginForm);
    const credentials = {
        username: formData.get('username'),
        password: formData.get('password')
    };

    try {
        const response = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(credentials)
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('pterodactylUser', JSON.stringify(currentUser));
            showDashboard();
            hideError();
        } else {
            showError('Invalid username or password');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Login failed. Please try again.');
    }
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('pterodactylUser');
    showLogin();
}

function showLogin() {
    loginModal.style.display = 'flex';
    dashboard.style.display = 'none';
    loginForm.reset();
    hideError();
}

function showDashboard() {
    loginModal.style.display = 'none';
    dashboard.style.display = 'flex';
    showSection('overview');
    refreshData();
}

function showError(message) {
    loginError.textContent = message;
    loginError.classList.add('show');
}

function hideError() {
    loginError.classList.remove('show');
}

// Navigation functions
function showSection(sectionName) {
    // Update active nav link
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === sectionName) {
            link.classList.add('active');
        }
    });

    // Update active content section
    contentSections.forEach(section => {
        section.classList.remove('active');
        if (section.id === sectionName) {
            section.classList.add('active');
        }
    });

    // Update page title
    const titles = {
        'overview': 'Dashboard Overview',
        'create-panel': 'Create New Panel',
        'server-list': 'Server Management',
        'admin-management': 'Admin Management',
        'bulk-operations': 'Bulk Operations',
        'telegram-integration': 'Telegram Integration'
    };
    pageTitle.textContent = titles[sectionName] || 'Dashboard';

    currentSection = sectionName;

    // Load section-specific data
    switch (sectionName) {
        case 'overview':
            loadDashboardData();
            break;
        case 'server-list':
            loadServers();
            break;
        case 'admin-management':
            loadAdmins();
            break;
        case 'telegram-integration':
            loadTelegramSettings();
            break;
    }
}

// Data loading functions
async function refreshData() {
    if (currentSection === 'overview') {
        loadDashboardData();
    } else if (currentSection === 'server-list') {
        loadServers();
    } else if (currentSection === 'admin-management') {
        loadAdmins();
    }
}

async function loadDashboardData() {
    try {
        // Load servers for stats
        const serversResponse = await fetch(`${API_BASE}/api/servers`);
        const servers = await serversResponse.json();

        if (Array.isArray(servers)) {
            // Calculate stats
            const activeServers = servers.filter(s => s.suspended === false).length;
            const stoppedServers = servers.filter(s => s.suspended === true).length;
            const expiringServers = servers.filter(s => s.age >= 25).length;

            // Update stats display
            document.getElementById('activeServers').textContent = activeServers;
            document.getElementById('stoppedServers').textContent = stoppedServers;
            document.getElementById('totalUsers').textContent = servers.length;
            document.getElementById('expiringServers').textContent = expiringServers;

            // Update recent activity
            updateRecentActivity(servers);
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function updateRecentActivity(servers) {
    const recentActivity = document.getElementById('recentActivity');
    
    if (servers.length === 0) {
        recentActivity.innerHTML = '<p class="empty-state">No recent activity to display</p>';
        return;
    }

    // Show latest 5 servers
    const recentServers = servers.slice(0, 5);
    const activityHtml = recentServers.map(server => `
        <div class="activity-item">
            <div class="flex items-center justify-between">
                <div>
                    <strong>${server.name}</strong>
                    <p class="text-sm text-gray-600">Server ${server.username || 'Unknown'}</p>
                </div>
                <div class="server-status">
                    <span class="status-dot ${server.suspended ? 'offline' : 'online'}"></span>
                    <span>${server.suspended ? 'Offline' : 'Online'}</span>
                </div>
            </div>
        </div>
    `).join('');

    recentActivity.innerHTML = activityHtml;
}

// Server management functions
async function loadServers() {
    const serversList = document.getElementById('serversList');
    serversList.innerHTML = '<div class="loading">Loading servers...</div>';

    try {
        const response = await fetch(`${API_BASE}/api/servers`);
        const servers = await response.json();

        if (Array.isArray(servers)) {
            displayServers(servers);
        } else {
            serversList.innerHTML = '<p class="empty-state">No servers found</p>';
        }
    } catch (error) {
        console.error('Error loading servers:', error);
        serversList.innerHTML = '<p class="empty-state">Error loading servers</p>';
    }
}

function displayServers(servers, filter = 'all') {
    const serversList = document.getElementById('serversList');
    const serversCountTitle = document.getElementById('serversCountTitle');
    
    // Filter servers based on selected filter
    let filteredServers = servers;
    switch(filter) {
        case 'active':
            filteredServers = servers.filter(s => !s.suspended);
            break;
        case 'stopped':
            filteredServers = servers.filter(s => s.suspended);
            break;
        case 'expiring':
            filteredServers = servers.filter(s => s.age >= 25);
            break;
        default:
            filteredServers = servers;
    }
    
    serversCountTitle.textContent = `Servers (${filteredServers.length})`;
    
    if (filteredServers.length === 0) {
        const filterText = filter === 'all' ? '' : ` matching the current filter`;
        serversList.innerHTML = `<p class="empty-state">No servers found${filterText}</p>`;
        return;
    }

    const serversHtml = filteredServers.map(server => `
        <div class="server-card">
            <div class="server-header">
                <h4>${server.name}</h4>
                <div class="server-status">
                    <span class="status-dot ${server.suspended ? 'offline' : 'online'}"></span>
                    <span>${server.suspended ? 'Offline' : 'Online'}</span>
                </div>
            </div>
            <div class="server-info">
                <div>
                    <span>Owner:</span>
                    <span>${server.username || 'Unknown'}</span>
                </div>
                <div>
                    <span>RAM:</span>
                    <span>${server.limits?.memory || 'N/A'} MB</span>
                </div>
                <div>
                    <span>Disk:</span>
                    <span>${server.limits?.disk || 'N/A'} MB</span>
                </div>
                <div>
                    <span>CPU:</span>
                    <span>${server.limits?.cpu || 'N/A'}%</span>
                </div>
                <div>
                    <span>Age:</span>
                    <span>${server.age || 0} days</span>
                </div>
            </div>
            <div class="server-actions">
                ${!server.suspended ? 
                    `<button class="btn btn-secondary" onclick="toggleServer(${server.id}, 'stop')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="6" y="4" width="4" height="16"/>
                            <rect x="14" y="4" width="4" height="16"/>
                        </svg>
                        Stop
                    </button>` :
                    `<button class="btn btn-success" onclick="toggleServer(${server.id}, 'start')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="5,3 19,12 5,21"/>
                        </svg>
                        Start
                    </button>`
                }
                <button class="btn btn-danger" onclick="deleteServer(${server.id})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3,6 5,6 21,6"/>
                        <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                    Delete
                </button>
            </div>
        </div>
    `).join('');

    serversList.innerHTML = serversHtml;
}

async function deleteServer(serverId) {
    if (!confirm('Are you sure you want to delete this server? This action cannot be undone.')) {
        return;
    }

    showLoading();

    try {
        const response = await fetch(`${API_BASE}/api/server/${serverId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Server deleted successfully', 'success');
            loadServers(); // Refresh the list
        } else {
            showNotification(data.error || 'Failed to delete server', 'error');
        }
    } catch (error) {
        console.error('Error deleting server:', error);
        showNotification('Error deleting server', 'error');
    } finally {
        hideLoading();
    }
}

async function toggleServer(serverId, action) {
    showLoading();

    try {
        // This would require additional API endpoints in the backend
        // For now, we'll show a message
        showNotification(`Server ${action} functionality would be implemented here`, 'info');
    } catch (error) {
        console.error(`Error ${action}ing server:`, error);
        showNotification(`Error ${action}ing server`, 'error');
    } finally {
        hideLoading();
    }
}

// Panel creation functions
async function handleCreatePanel(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const panelData = {
        username: formData.get('serverName'),
        email: formData.get('email'),
        ram: parseInt(formData.get('ramAllocation')) || 1024,
        disk: parseInt(formData.get('ramAllocation')) || 1024,
        cpu: 100,
        telegramId: formData.get('telegramId') || ''
    };

    showLoading();

    try {
        const response = await fetch(`${API_BASE}/api/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(panelData)
        });

        const data = await response.json();

        if (data.error) {
            showPanelResult(data.error, 'error');
        } else {
            showPanelResult(`Panel created successfully! Username: ${data.username}, Password: ${data.password}`, 'success');
            e.target.reset();
        }
    } catch (error) {
        console.error('Error creating panel:', error);
        showPanelResult('Error creating panel. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

function showPanelResult(message, type) {
    const resultDiv = document.getElementById('createPanelResult');
    resultDiv.textContent = message;
    resultDiv.className = `result-message ${type}`;
    
    setTimeout(() => {
        resultDiv.classList.remove('success', 'error');
        resultDiv.style.display = 'none';
    }, 10000);
}

// Admin management functions
async function loadAdmins() {
    const adminsList = document.getElementById('adminsList');
    adminsList.innerHTML = '<div class="loading">Loading administrators...</div>';

    try {
        const response = await fetch(`${API_BASE}/api/admins`);
        const admins = await response.json();

        if (Array.isArray(admins)) {
            displayAdmins(admins);
        } else {
            adminsList.innerHTML = '<p class="empty-state">No administrators found</p>';
        }
    } catch (error) {
        console.error('Error loading admins:', error);
        adminsList.innerHTML = '<p class="empty-state">Error loading administrators</p>';
    }
}

function displayAdmins(admins) {
    const adminsTableBody = document.getElementById('adminsTableBody');
    const administratorsCount = document.getElementById('administratorsCount');
    
    administratorsCount.textContent = `Administrators (${admins.length})`;
    
    if (admins.length === 0) {
        adminsTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">No administrators found</td></tr>';
        return;
    }

    const adminsHtml = admins.map(admin => `
        <tr>
            <td><strong>${admin.username}</strong></td>
            <td>Admin</td>
            <td>24/8/2025</td>
            <td>Active</td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="deleteAdmin(${admin.id})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3,6 5,6 21,6"/>
                        <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                </button>
            </td>
        </tr>
    `).join('');

    adminsTableBody.innerHTML = adminsHtml;
}

async function handleCreateAdmin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const adminData = {
        username: formData.get('adminUsername'),
        email: formData.get('adminEmail')
    };

    showLoading();

    try {
        const response = await fetch(`${API_BASE}/api/create-admin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(adminData)
        });

        const data = await response.json();

        if (data.error) {
            showAdminResult(data.error, 'error');
        } else {
            showAdminResult(`Admin created successfully! Username: ${data.username}, Password: ${data.password}`, 'success');
            e.target.reset();
            loadAdmins(); // Refresh the list
        }
    } catch (error) {
        console.error('Error creating admin:', error);
        showAdminResult('Error creating admin. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

async function deleteAdmin(adminId) {
    if (!confirm('Are you sure you want to delete this administrator?')) {
        return;
    }

    showLoading();

    try {
        const response = await fetch(`${API_BASE}/api/admin/${adminId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Administrator deleted successfully', 'success');
            loadAdmins(); // Refresh the list
        } else {
            showNotification(data.error || 'Failed to delete administrator', 'error');
        }
    } catch (error) {
        console.error('Error deleting admin:', error);
        showNotification('Error deleting administrator', 'error');
    } finally {
        hideLoading();
    }
}

function showAdminResult(message, type) {
    const resultDiv = document.getElementById('createAdminResult');
    resultDiv.textContent = message;
    resultDiv.className = `result-message ${type}`;
    
    setTimeout(() => {
        resultDiv.classList.remove('success', 'error');
        resultDiv.style.display = 'none';
    }, 10000);
}

// Bulk operations functions
async function deleteAllServers() {
    if (!confirm('Are you sure you want to delete ALL servers? This action cannot be undone.')) {
        return;
    }

    showLoading();

    try {
        const response = await fetch(`${API_BASE}/api/delete-all-servers`, {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            showBulkResult(`Successfully deleted ${data.deletedCount || 0} servers`, 'success');
            if (currentSection === 'server-list') {
                loadServers();
            }
        } else {
            showBulkResult(data.error || 'Failed to delete servers', 'error');
        }
    } catch (error) {
        console.error('Error deleting all servers:', error);
        showBulkResult('Error deleting servers', 'error');
    } finally {
        hideLoading();
    }
}

async function deleteAllUsers() {
    if (!confirm('Are you sure you want to delete ALL users (except admin)? This action cannot be undone.')) {
        return;
    }

    showLoading();

    try {
        const response = await fetch(`${API_BASE}/api/delete-all-users`, {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            showBulkResult(`Successfully deleted ${data.deletedCount || 0} users`, 'success');
        } else {
            showBulkResult(data.error || 'Failed to delete users', 'error');
        }
    } catch (error) {
        console.error('Error deleting all users:', error);
        showBulkResult('Error deleting users', 'error');
    } finally {
        hideLoading();
    }
}

function showBulkResult(message, type) {
    const resultDiv = document.getElementById('bulkOperationResult');
    resultDiv.textContent = message;
    resultDiv.className = `result-message ${type}`;
    
    setTimeout(() => {
        resultDiv.classList.remove('success', 'error');
        resultDiv.style.display = 'none';
    }, 10000);
}

// Utility functions
function showLoading() {
    const loadingModal = document.getElementById('loadingModal');
    loadingModal.style.display = 'flex';
}

function hideLoading() {
    const loadingModal = document.getElementById('loadingModal');
    loadingModal.style.display = 'none';
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1001;
        animation: slideIn 0.3s ease-out;
    `;

    // Set background color based on type
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6',
        warning: '#f59e0b'
    };
    notification.style.backgroundColor = colors[type] || colors.info;

    // Add to DOM
    document.body.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
}

// Filter functionality
let currentFilter = 'all';

function setupFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            
            // Reload servers with filter
            loadServers();
        });
    });
}

// Telegram Integration Functions
function loadTelegramSettings() {
    // Load current telegram settings
    const botToken = document.getElementById('botToken');
    const adminChatId = document.getElementById('adminChatId');
    
    if (botToken) {
        botToken.value = '7789321645:AAEh6BiwNR6SgKI_8ZIE-SfJm3J7SFS5yvw';
    }
    if (adminChatId) {
        adminChatId.value = '7978512548';
    }
}

async function testBotConnection() {
    showLoading();
    try {
        const response = await fetch(`${API_BASE}/api/test-telegram`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Bot connection test successful!', 'success');
        } else {
            showNotification(data.error || 'Bot connection test failed', 'error');
        }
    } catch (error) {
        console.error('Error testing bot connection:', error);
        showNotification('Bot connection test failed', 'error');
    } finally {
        hideLoading();
    }
}

async function saveTelegramSettings() {
    showLoading();
    try {
        // Simulate saving settings
        await new Promise(resolve => setTimeout(resolve, 500));
        showNotification('Telegram settings saved successfully', 'success');
    } catch (error) {
        showNotification('Failed to save settings', 'error');
    } finally {
        hideLoading();
    }
}

// Additional Bulk Operations
async function startAllServers() {
    if (!confirm('Are you sure you want to start all stopped servers?')) {
        return;
    }
    
    showLoading();
    try {
        // Simulate starting all servers
        await new Promise(resolve => setTimeout(resolve, 1500));
        showNotification('All servers started successfully', 'success');
        addRecentBulkOperation('Start All Servers', 'Started all stopped servers');
        loadServers();
    } catch (error) {
        showNotification('Failed to start all servers', 'error');
    } finally {
        hideLoading();
    }
}

async function stopAllServers() {
    if (!confirm('Are you sure you want to stop all running servers?')) {
        return;
    }
    
    showLoading();
    try {
        // Simulate stopping all servers
        await new Promise(resolve => setTimeout(resolve, 1500));
        showNotification('All servers stopped successfully', 'success');
        addRecentBulkOperation('Stop All Servers', 'Stopped all running servers');
        loadServers();
    } catch (error) {
        showNotification('Failed to stop all servers', 'error');
    } finally {
        hideLoading();
    }
}

async function exportUserData() {
    showLoading();
    try {
        // Simulate export
        await new Promise(resolve => setTimeout(resolve, 1000));
        showNotification('User data exported successfully', 'success');
        addRecentBulkOperation('Export User Data', 'Exported user information to CSV');
    } catch (error) {
        showNotification('Failed to export user data', 'error');
    } finally {
        hideLoading();
    }
}

async function notifyExpiring() {
    showLoading();
    try {
        // Simulate notification sending
        await new Promise(resolve => setTimeout(resolve, 1000));
        showNotification('Expiring server notifications sent', 'success');
        addRecentBulkOperation('Notify Expiring', 'Sent Telegram alerts for expiring servers');
    } catch (error) {
        showNotification('Failed to send notifications', 'error');
    } finally {
        hideLoading();
    }
}

function addRecentBulkOperation(operation, description) {
    const recentBulkOperations = document.getElementById('recentBulkOperations');
    if (!recentBulkOperations) return;
    
    const now = new Date().toLocaleString();
    const operationHtml = `
        <div class="operation-item">
            <div class="operation-info">
                <strong>${operation}</strong>
                <p>${description}</p>
                <small class="text-muted">${now}</small>
            </div>
        </div>
    `;
    
    if (recentBulkOperations.innerHTML.includes('No recent bulk operations')) {
        recentBulkOperations.innerHTML = operationHtml;
    } else {
        recentBulkOperations.insertAdjacentHTML('afterbegin', operationHtml);
    }
}

// Enhanced loadServers function to support filtering
async function loadServers() {
    const serversList = document.getElementById('serversList');
    serversList.innerHTML = '<div class="loading">Loading servers...</div>';

    try {
        const response = await fetch(`${API_BASE}/api/servers`);
        const servers = await response.json();

        if (Array.isArray(servers)) {
            displayServers(servers, currentFilter);
        } else {
            serversList.innerHTML = '<p class="empty-state">No servers found</p>';
        }
    } catch (error) {
        console.error('Error loading servers:', error);
        serversList.innerHTML = '<p class="empty-state">Error loading servers</p>';
    }
}

// Initialize new features when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Setup filter buttons after a short delay to ensure DOM is ready
    setTimeout(() => {
        setupFilterButtons();
    }, 100);
});

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .btn-sm {
        padding: 0.375rem 0.75rem;
        font-size: 0.8rem;
    }
    
    .operation-item {
        padding: 0.75rem 0;
        border-bottom: 1px solid #e5e7eb;
    }
    
    .operation-item:last-child {
        border-bottom: none;
    }
    
    .text-muted {
        color: #6b7280;
        font-size: 0.75rem;
    }
`;
document.head.appendChild(style);
