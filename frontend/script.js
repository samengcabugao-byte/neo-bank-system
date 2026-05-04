// Configuration: Set API_URL based on where the frontend is hosted
const API_URL = (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000/api'
    : window.location.origin + '/api';

console.log("Neo Bank API Target:", API_URL);

let currentUser = null;
let token = localStorage.getItem('token');

// Page Elements
const landingContainer = document.getElementById('landing-container');
const userDashboardPage = document.getElementById('user-dashboard-page');
const adminDashboardPage = document.getElementById('admin-dashboard-page');

// --- Global System Notifications & Modals ---
window.showSystemAlert = async (message, title = 'System Message', icon = '🔔', isConfirm = false) => {
    return new Promise((resolve) => {
        const modal = document.getElementById('system-alert-modal');
        const titleEl = document.getElementById('alert-title');
        const messageEl = document.getElementById('alert-message');
        const iconEl = document.getElementById('alert-icon');
        const iconWrapper = document.getElementById('alert-icon-wrapper');
        const okBtn = document.getElementById('alert-ok-btn');
        const cancelBtn = document.getElementById('alert-cancel-btn');

        if (!modal) {
            alert(message);
            resolve(true);
            return;
        }

        titleEl.textContent = title;
        messageEl.textContent = message;
        
        // Auto-assign icons and styles
        let iconClass = '';
        if (icon === '🔔') {
            if (message.toLowerCase().includes('success')) {
                icon = '✅';
                iconClass = 'success';
            } else if (message.toLowerCase().includes('failed') || message.toLowerCase().includes('error')) {
                icon = '❌';
            } else if (isConfirm) {
                icon = '🚪';
            }
        } else if (icon === '🚪') {
            // Logout specific
            iconClass = ''; // Default red for logout warning
        } else if (icon === '✅') {
            iconClass = 'success';
        }

        iconEl.textContent = icon;
        iconWrapper.className = `alert-icon-wrapper ${iconClass}`;
        
        cancelBtn.classList.toggle('hidden', !isConfirm);
        okBtn.textContent = isConfirm ? 'Confirm' : 'OK';
        if (isConfirm && icon === '🚪') {
            okBtn.className = 'btn btn-danger btn-full'; // Red button for logout
        } else {
            okBtn.className = 'btn btn-primary btn-full';
        }

        modal.classList.remove('hidden');

        okBtn.onclick = () => {
            modal.classList.add('hidden');
            resolve(true);
        };

        cancelBtn.onclick = () => {
            modal.classList.add('hidden');
            resolve(false);
        };
    });
};

window.showSystemPrompt = async (message, title = 'Input Required', icon = '🔐') => {
    return new Promise((resolve) => {
        const modal = document.getElementById('user-password-modal');
        const passInput = document.getElementById('user-action-password');
        const submitBtn = document.getElementById('user-password-submit');
        const cancelBtn = document.getElementById('user-password-cancel');

        if (!modal) {
            resolve(prompt(message));
            return;
        }

        passInput.value = '';
        modal.classList.remove('hidden');
        setTimeout(() => passInput.focus(), 100);

        submitBtn.onclick = () => {
            modal.classList.add('hidden');
            resolve(passInput.value);
        };

        cancelBtn.onclick = () => {
            modal.classList.add('hidden');
            resolve(null);
        };

        passInput.onkeypress = (e) => {
            if (e.key === 'Enter') submitBtn.click();
        };
    });
};

window.showNotification = (message, type = 'info') => {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️');
    notif.innerHTML = `
        <div class="notif-content">
            <span class="notif-icon">${icon}</span>
            <span class="notif-message">${message}</span>
        </div>
    `;

    container.appendChild(notif);
    setTimeout(() => notif.classList.add('show'), 10);
    setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => notif.remove(), 300);
    }, 4000);
};

// --- Landing Page Navigation ---
window.showLandingView = (viewId) => {
    document.querySelectorAll('.landing-view').forEach(v => v.classList.add('hidden'));
    const targetView = document.getElementById(`landing-${viewId}`) || document.getElementById(`${viewId}-page`);
    if (targetView) targetView.classList.remove('hidden');

    document.querySelectorAll('.nav-link').forEach(link => {
        const text = link.textContent.toLowerCase().replace(/\s/g, '');
        if (text.includes(viewId)) link.classList.add('active');
        else link.classList.remove('active');
    });

    if (typeof feather !== 'undefined') feather.replace();
};

// --- Form Helpers ---
const setupPasswordToggle = (checkboxId, inputId) => {
    const checkbox = document.getElementById(checkboxId);
    const input = document.getElementById(inputId);
    if (checkbox && input) {
        checkbox.addEventListener('change', (e) => {
            input.type = e.target.checked ? 'text' : 'password';
        });
    }
};

setupPasswordToggle('show-password-login', 'login-password');
setupPasswordToggle('show-password-register', 'register-password');
setupPasswordToggle('show-password-register-confirm', 'register-confirm-password');
setupPasswordToggle('show-password-profile', 'profile-password');

// --- Auth Flow ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (!email.includes('@') || !email.toLowerCase().endsWith('.com')) {
            await showSystemAlert('Please enter a valid email address ending in .com', 'Validation Error', '📧');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (res.ok) {
                token = data.token;
                localStorage.setItem('token', token);
                initDashboard();
                showNotification('Login successful', 'success');
            } else {
                await showSystemAlert(data.message, 'Login Failed', '❌');
            }
        } catch (err) {
            await showSystemAlert('Error connecting to server. Is the backend running?', 'Connection Error', '🌐');
        }
    };
}

const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.onsubmit = async (e) => {
        e.preventDefault();
        const fname = document.getElementById('register-fname').value;
        const lname = document.getElementById('register-lname').value;
        const email = document.getElementById('register-email').value;
        const otp = document.getElementById('register-otp').value;
        const phone = document.getElementById('register-phone').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        let captchaResponse = '';
        if (typeof grecaptcha !== 'undefined' && typeof grecaptcha.getResponse === 'function') {
            captchaResponse = grecaptcha.getResponse();
        } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // In dev mode the backend bypasses reCAPTCHA; send a placeholder token
            captchaResponse = 'dev-bypass-token';
            console.log('reCAPTCHA not loaded; using dev bypass token');
        }

        if (!captchaResponse) {
            await showSystemAlert('Please complete the reCAPTCHA verification.', 'Verification Required', '🛡️');
            return;
        }

        if (!otp || otp.length !== 6) {
            await showSystemAlert('Please enter the 6-digit OTP code sent to your email.', 'OTP Required', '🔑');
            return;
        }

        if (password !== confirmPassword) {
            await showSystemAlert('Passwords do not match!', 'Validation Error', '❌');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: `${fname} ${lname}`, email, password, phoneNumber: phone, otp, captchaToken: captchaResponse
                })
            });
            const data = await res.json();
            if (res.ok) {
                await showSystemAlert('Registration successful! Please login.', 'Success', '✅');
                showLandingView('login');
                e.target.reset();
                if (typeof grecaptcha !== 'undefined' && typeof grecaptcha.reset === 'function') grecaptcha.reset();
            } else {
                await showSystemAlert(data.message, 'Registration Failed', '❌');
                if (typeof grecaptcha !== 'undefined' && typeof grecaptcha.reset === 'function') grecaptcha.reset();
            }
        } catch (err) {
            await showSystemAlert('Error connecting to server.', 'Connection Error', '🌐');
            if (typeof grecaptcha !== 'undefined' && typeof grecaptcha.reset === 'function') grecaptcha.reset();
        }
    };
}

const sendOtpBtn = document.getElementById('send-otp-btn');
if (sendOtpBtn) {
    sendOtpBtn.onclick = async () => {
        const email = document.getElementById('register-email').value;
        if (!email || !email.includes('@')) {
            await showSystemAlert('Please enter a valid email address first.', 'Validation Error', '📧');
            return;
        }

        try {
            sendOtpBtn.disabled = true;
            sendOtpBtn.textContent = 'Sending...';
            const res = await fetch(`${API_URL}/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (res.ok) {
                showNotification('OTP sent to your email!', 'success');
                let timer = 60;
                const interval = setInterval(() => {
                    timer--;
                    sendOtpBtn.textContent = `Resend (${timer}s)`;
                    if (timer <= 0) {
                        clearInterval(interval);
                        sendOtpBtn.disabled = false;
                        sendOtpBtn.textContent = 'Send OTP';
                    }
                }, 1000);
            } else {
                const data = await res.json();
                await showSystemAlert(data.message, 'Error', '❌');
                sendOtpBtn.disabled = false;
                sendOtpBtn.textContent = 'Send OTP';
            }
        } catch (err) {
            await showSystemAlert('Error connecting to server.', 'Connection Error', '🌐');
            sendOtpBtn.disabled = false;
            sendOtpBtn.textContent = 'Send OTP';
        }
    };
}

// --- Dashboard Logic ---
const initDashboard = async () => {
    if (!token) return;
    try {
        const res = await fetch(`${API_URL}/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            currentUser = await res.json();
            await updateUI();
            setupDashboardUI();
        } else {
            logout();
        }
    } catch (err) {
        console.error("Dashboard init failed", err);
    }
};

const updateUI = async () => {
    if (!currentUser) return;

    if (currentUser.email === 'admin@neobank.com') {
        showPage('admin-dashboard-page');
        await switchView('admin-dashboard');
        loadAdminUsers();
        loadAdminTransactions();
        updateAdminStats();
    } else {
        showPage('user-dashboard-page');
        await switchView('home');
        
        document.getElementById('welcome-msg').textContent = `Welcome back, ${currentUser.name.split(' ')[0]}!`;
        document.getElementById('acc-primary-balance-display').textContent = `₱${currentUser.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        document.getElementById('user-name-display').textContent = currentUser.name;
        
        const now = new Date();
        document.getElementById('current-date-display-user').textContent = `Today is ${now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}`;
        
        renderTransactions(document.getElementById('transaction-list-home'), 5);
        renderTransactions(document.getElementById('transaction-list-full'));
        renderTransactions(document.getElementById('transaction-list-full-accounts'));
        
        // Update Card status
        const hasCard = currentUser.hasCard;
        document.querySelector('.request-card-section').classList.toggle('hidden', hasCard);
        document.querySelector('.active-card-section').classList.toggle('hidden', !hasCard);
        
        if (hasCard) {
            document.getElementById('v-card-num-display').textContent = '**** **** **** ' + currentUser.cardDetails.number.slice(-4);
            document.getElementById('v-card-expiry-val').textContent = currentUser.cardDetails.expiry;
            document.getElementById('v-card-holder-name').textContent = currentUser.name.toUpperCase();
        }
    }
};

const renderTransactions = (container, limit = null) => {
    if (!container) return;
    let filteredTx = [...currentUser.transactions].reverse();
    if (limit) filteredTx = filteredTx.slice(0, limit);

    if (filteredTx.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>No transactions yet</p></div>`;
        return;
    }

    container.innerHTML = filteredTx.map(t => {
        const isPositive = t.type === 'Deposit';
        return `
            <div class="activity-item">
                <div class="act-icon" style="background: ${isPositive ? 'rgba(0,223,129,0.1)' : 'rgba(239,68,68,0.1)'}; color: ${isPositive ? 'var(--primary)' : 'var(--accent-red)'}">
                    ${isPositive ? '📥' : '📤'}
                </div>
                <div class="act-info">
                    <div class="act-title">${t.type}</div>
                    <div class="act-date">${new Date(t.date).toLocaleDateString()}</div>
                </div>
                <div class="act-amount ${isPositive ? 'positive' : 'negative'}">
                    ${isPositive ? '+' : '-'}₱${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
            </div>
        `;
    }).join('');
};

window.switchView = async (viewId) => {
    // Security check for Settings
    if (viewId === 'settings' || viewId === 'admin-settings') {
        const password = await showSystemPrompt('Enter admin password to access settings', 'Security Access');
        if (!password) {
            showNotification('Access denied', 'error');
            return;
        }
        
        // Verify with backend
        try {
            const res = await fetch(`${API_URL}/verify-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ password })
            });
            if (!res.ok) {
                await showSystemAlert('The password you entered is incorrect. Please try again.', 'Wrong Password', '❌');
                return;
            }
        } catch (err) {
            await showSystemAlert('Connection failed. Please check if the server is running.', 'Error', '🌐');
            return;
        }
    }

    // Hide all views
    document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden'));
    
    // Show target view
    const targetView = document.getElementById(`dashboard-${viewId}-view`);
    if (targetView) {
        targetView.classList.remove('hidden');
        
        // Update sidebar active state for both sidebars
        document.querySelectorAll('.nav-item').forEach(item => {
            const itemPage = item.dataset.page;
            item.classList.toggle('active', itemPage === viewId);
        });
        
        // Refresh view data
        if (viewId === 'admin-requests') loadCardRequests();
        if (viewId === 'admin-users') loadAdminUsers();
        if (viewId === 'admin-transactions') loadAdminTransactions();
        if (viewId === 'admin-messages') loadAdminMessages();
        if (viewId === 'admin-dashboard') updateAdminStats();
        if (viewId === 'savings') renderGoals();
        if (viewId === 'support') loadUserMessages();
        
        if (typeof feather !== 'undefined') feather.replace();
    } else {
        console.error(`View not found: dashboard-${viewId}-view`);
    }
};

const showPage = (pageId) => {
    landingContainer.classList.add('hidden');
    userDashboardPage.classList.add('hidden');
    adminDashboardPage.classList.add('hidden');
    const target = document.getElementById(pageId);
    if (target) target.classList.remove('hidden');
    if (typeof feather !== 'undefined') feather.replace();
};

const logout = async () => {
    const confirmLogout = await showSystemAlert('Are you sure you want to log out?', 'Confirm Logout', '🚪', true);
    if (!confirmLogout) return;

    token = null;
    currentUser = null;
    localStorage.removeItem('token');
    showPage('landing-container');
    showLandingView('home');
    showNotification('Logged out successfully', 'success');
};

// --- Banking Operations ---
window.validateUserAction = async (action) => {
    // Show transaction modal first to get amount and details
    const modal = document.getElementById('transaction-modal');
    const title = document.getElementById('trans-title');
    const transferFields = document.getElementById('transfer-fields');
    const payBillFields = document.getElementById('pay-bill-fields');
    const form = modal.querySelector('form');

    // Reset fields
    transferFields.classList.add('hidden');
    payBillFields.classList.add('hidden');
    form.reset();

    // Set title and show specific fields
    if (action === 'transfer') {
        title.textContent = 'Send Money';
        transferFields.classList.remove('hidden');
    } else if (action === 'withdraw') {
        title.textContent = 'Withdraw Funds';
    } else if (action === 'deposit') {
        title.textContent = 'Deposit Funds';
    } else if (action === 'pay-bill') {
        title.textContent = 'Pay Bills';
        payBillFields.classList.remove('hidden');
    }

    modal.classList.remove('hidden');

    // Handle form submission
    form.onsubmit = async (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('trans-amount').value);
        if (isNaN(amount) || amount <= 0) {
            showNotification('Please enter a valid amount', 'error');
            return;
        }

        const password = await showSystemPrompt(`Confirm your password to proceed with ${title.textContent}`, 'Security Verification');
        if (!password) return;

        let body = { amount, password };
        if (action === 'transfer') {
            body.recipient = document.getElementById('trans-recipient').value;
            if (!body.recipient) {
                showNotification('Please enter recipient details', 'error');
                return;
            }
        } else if (action === 'pay-bill') {
            body.biller = document.getElementById('biller-select').value;
            body.description = `Bill Payment to ${body.biller}`;
        }

        try {
            const res = await fetch(`${API_URL}/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (res.ok) {
                modal.classList.add('hidden');
                await showSystemAlert('Transaction successful!', 'Success', '✅');
                initDashboard();
            } else {
                await showSystemAlert(data.message || 'Transaction failed.', 'Action Failed', '❌');
            }
        } catch (err) {
            await showSystemAlert('Error connecting to server.', 'Connection Error', '🌐');
        }
    };
};

window.toggleFreeze = (btn) => {
    const isFrozen = btn.classList.toggle('active');
    btn.innerHTML = isFrozen ? '<i data-feather="unlock"></i> Unfreeze' : '<i data-feather="lock"></i> Freeze';
    showNotification(isFrozen ? 'Card frozen' : 'Card unfrozen', 'info');
    if (typeof feather !== 'undefined') feather.replace();
};

window.revealDetails = async (btn) => {
    const isRevealed = btn.dataset.revealed === 'true';
    if (isRevealed) {
        document.getElementById('v-card-num-display').textContent = '**** **** **** ' + currentUser.cardDetails.number.slice(-4);
        document.getElementById('v-card-cvv-val').textContent = '***';
        btn.innerHTML = '<i data-feather="eye"></i> Reveal Details';
        btn.dataset.revealed = 'false';
    } else {
        const password = await showSystemPrompt('Enter password to reveal card details', 'Security Verification');
        if (!password) return;

        try {
            const res = await fetch(`${API_URL}/verify-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ password })
            });
            
            if (res.ok) {
                document.getElementById('v-card-num-display').textContent = currentUser.cardDetails.number;
                document.getElementById('v-card-cvv-val').textContent = currentUser.cardDetails.cvv;
                btn.innerHTML = '<i data-feather="eye-off"></i> Hide Details';
                btn.dataset.revealed = 'true';
                showNotification('Card details revealed', 'success');
            } else {
                await showSystemAlert('The password you entered is incorrect. Please try again.', 'Wrong Password', '❌');
            }
        } catch (err) {
            await showSystemAlert('Verification failed. Please try again.', 'Error', '🌐');
        }
    }
    if (typeof feather !== 'undefined') feather.replace();
};

// --- Admin Operations ---
const loadAdminUsers = async () => {
    try {
        const res = await fetch(`${API_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const users = await res.json();
        const container = document.getElementById('admin-users-list');
        if (res.ok && container) {
            container.innerHTML = users.map(u => `
                <div class="user-row-premium">
                    <div class="user-info">
                        <div class="user-avatar-mini">${u.name[0]}</div>
                        <div><div class="user-name">${u.name}</div><div class="user-email">${u.email}</div></div>
                    </div>
                    <div class="user-stats">
                        <div class="stat"><span class="label">Balance</span><span class="value">₱****</span></div>
                        <div class="stat"><span class="label">TXs</span><span class="value">${u.transactionCount}</span></div>
                    </div>
                    <div class="user-actions">
                        <button class="btn btn-primary btn-sm" onclick="viewUserDetails('${u.id}')">View Details</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}', '${u.name}')" ${u.email === 'admin@neobank.com' ? 'disabled' : ''}>Delete</button>
                    </div>
                </div>
            `).join('');
        }
    } catch (err) { console.error(err); }
};

window.deleteUser = async (userId, userName) => {
    const confirm = await showSystemAlert(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`, 'Confirm Delete', '🗑️', true);
    if (!confirm) return;

    const password = await showSystemPrompt('Enter admin password to confirm deletion', 'Security Check');
    if (!password) return;

    try {
        const res = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ password })
        });
        const data = await res.json();
        if (res.ok) {
            showNotification('User deleted successfully', 'success');
            loadAdminUsers();
        } else {
            await showSystemAlert(data.message, 'Delete Failed', '❌');
        }
    } catch (err) {
        await showSystemAlert('Error connecting to server.', 'Error', '🌐');
    }
};

window.viewUserDetails = async (userId) => {
    try {
        const res = await fetch(`${API_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const users = await res.json();
        const user = users.find(u => u.id === userId);
        
        if (user) {
            const content = document.getElementById('user-details-content');
            content.innerHTML = `
                <div style="display: grid; gap: 15px; background: rgba(255,255,255,0.02); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px;">
                        <span style="color: var(--text-secondary);">Full Name:</span>
                        <span style="font-weight: 600; color: #fff;">${user.name}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px;">
                        <span style="color: var(--text-secondary);">Email:</span>
                        <span style="color: #fff;">${user.email}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px;">
                        <span style="color: var(--text-secondary);">Phone:</span>
                        <span style="color: #fff;">${user.phoneNumber || 'Not Provided'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px;">
                        <span style="color: var(--text-secondary);">Actual Balance:</span>
                        <span style="color: var(--primary); font-weight: 700; font-size: 1.1rem;">₱${user.balance.toLocaleString()}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px;">
                        <span style="color: var(--text-secondary);">Transactions:</span>
                        <span style="color: #fff;">${user.transactionCount}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--text-secondary);">Virtual Card:</span>
                        <span style="color: ${user.hasCard ? 'var(--primary)' : 'var(--text-muted)'};">${user.hasCard ? '✅ Active' : '❌ None'}</span>
                    </div>
                </div>
            `;
            document.getElementById('user-details-modal').classList.remove('hidden');
            if (typeof feather !== 'undefined') feather.replace();
        }
    } catch (err) {
        console.error("Failed to load user details", err);
        showNotification("Failed to load user details", "error");
    }
};

const loadAdminTransactions = async () => {
    try {
        const res = await fetch(`${API_URL}/admin/transactions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const txs = await res.json();
        const container = document.getElementById('admin-transactions-list');
        if (res.ok && container) {
            container.innerHTML = txs.map(t => `
                <div class="activity-item">
                    <div class="act-icon">📥</div>
                    <div class="act-info"><b>${t.userName}</b><br><small>${t.description}</small></div>
                    <div class="act-amount">₱${t.amount.toLocaleString()}</div>
                </div>
            `).join('');
        }
    } catch (err) { console.error(err); }
};

const updateAdminStats = async () => {
    try {
        const res = await fetch(`${API_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const users = await res.json();
            const totalBalance = users.reduce((sum, u) => sum + u.balance, 0);
            const statsGrid = document.querySelector('.admin-stats-grid');
            if (statsGrid) {
                statsGrid.style.display = 'grid';
                statsGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(300px, 1fr))';
                statsGrid.style.gap = '25px';
                statsGrid.style.marginTop = '20px';
                
                statsGrid.innerHTML = `
                    <div class="stat-card-premium" style="background: linear-gradient(135deg, rgba(23, 115, 234, 0.1) 0%, rgba(23, 115, 234, 0.05) 100%); border-left: 5px solid var(--accent-primary);">
                        <div style="display: flex; flex-direction: column;">
                            <span class="stat-label" style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 10px;">Total Registered Users</span>
                            <span class="stat-value" style="font-size: 2.5rem; font-weight: 800; color: #fff;">${users.length}</span>
                        </div>
                        <div style="font-size: 2.5rem; opacity: 0.2;">👥</div>
                    </div>
                    <div class="stat-card-premium" style="background: linear-gradient(135deg, rgba(0, 223, 129, 0.1) 0%, rgba(0, 223, 129, 0.05) 100%); border-left: 5px solid var(--primary);">
                        <div style="display: flex; flex-direction: column;">
                            <span class="stat-label" style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 10px;">Total Platform Balance</span>
                            <span class="stat-value" style="font-size: 2.5rem; font-weight: 800; color: var(--primary);">₱${totalBalance.toLocaleString()}</span>
                        </div>
                        <div style="font-size: 2.5rem; opacity: 0.2;">💰</div>
                    </div>
                `;
            }
        }
    } catch (err) { console.error(err); }
};

// --- Initialization ---
const setupDashboardUI = () => {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.onclick = (e) => {
            if (e) e.preventDefault();
            switchView(item.dataset.page);
        };
    });
    
    // Explicitly handle quick action buttons
    const quickActions = {
        'send-money-btn': 'transfer',
        'pay-bills-btn': 'pay-bill',
        'deposit-btn': 'deposit',
        'withdraw-btn': 'withdraw'
    };

    Object.entries(quickActions).forEach(([id, action]) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.onclick = (e) => {
                if (e) e.preventDefault();
                validateUserAction(action);
            };
        }
    });

    // Also support buttons using dataset.action if they exist
    document.querySelectorAll('.quick-action').forEach(btn => {
        if (btn.dataset.action) {
            btn.onclick = (e) => {
                if (e) e.preventDefault();
                validateUserAction(btn.dataset.action);
            };
        }
    });

    const logoutBtns = ['dropdown-logout-user', 'dropdown-logout-admin', 'logout-btn-sidebar', 'logout-btn-admin'];
    logoutBtns.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.onclick = (e) => {
            if (e) e.preventDefault();
            logout();
        };
    });
};

// --- Helper Functions ---
window.togglePassword = (id) => {
    const input = document.getElementById(id);
    if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
    }
};

// --- Admin Messages Logic ---
let activeChatId = null;

const loadAdminMessages = async () => {
    try {
        const res = await fetch(`${API_URL}/admin/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const messages = await res.json();
        const sidebar = document.getElementById('admin-chat-sidebar');
        
        if (res.ok && sidebar) {
            // Group messages by user email
            const conversations = {};
            messages.forEach(m => {
                if (!conversations[m.email]) {
                    conversations[m.email] = {
                        name: m.name,
                        email: m.email,
                        lastMsg: m.message,
                        date: m.date,
                        unread: m.status === 'unread'
                    };
                }
            });

            sidebar.innerHTML = Object.values(conversations).map(c => `
                <div class="chat-item ${activeChatId === c.email ? 'active' : ''}" data-email="${c.email}" onclick="selectChat('${c.email}', '${c.name}')">
                    <div class="chat-avatar">${c.name[0]}</div>
                    <div class="chat-info">
                        <div class="chat-user-name">
                            <span>${c.name}</span>
                            ${c.unread ? '<span class="unread-dot"></span>' : ''}
                        </div>
                        <div class="chat-last-msg">${c.lastMsg}</div>
                    </div>
                </div>
            `).join('') || '<div class="empty-msg">No messages yet</div>';
        }
    } catch (err) { console.error(err); }
};

window.selectChat = async (email, name) => {
    activeChatId = email;
    const headerUser = document.getElementById('active-chat-user');
    const headerStatus = document.getElementById('active-chat-status');
    const chatInput = document.getElementById('admin-chat-input');
    const sendBtn = document.getElementById('admin-chat-send-btn');

    if (headerUser) headerUser.textContent = name;
    if (headerStatus) headerStatus.textContent = email;
    if (chatInput) chatInput.disabled = false;
    if (sendBtn) sendBtn.disabled = false;
    
    // Highlight active chat in sidebar
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.toggle('active', item.dataset.email === email);
    });

    try {
        const res = await fetch(`${API_URL}/admin/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const messages = await res.json();
        const chatBody = document.getElementById('admin-chat-body');
        
        if (res.ok && chatBody) {
            const userMessages = messages.filter(m => m.email === email);
            chatBody.innerHTML = userMessages.map(m => `
                <div class="chat-msg user">
                    <div class="msg-content">${m.message}</div>
                    <small>${new Date(m.date).toLocaleTimeString()}</small>
                </div>
                ${m.replies.map(r => `
                    <div class="chat-msg bot">
                        <div class="msg-content">${r.message}</div>
                        <small>${new Date(r.date).toLocaleTimeString()}</small>
                    </div>
                `).join('')}
            `).join('');
            chatBody.scrollTop = chatBody.scrollHeight;
        }
    } catch (err) { console.error(err); }
};

window.sendAdminReply = async () => {
    const input = document.getElementById('admin-chat-input');
    const message = input.value.trim();
    if (!message || !activeChatId) return;

    try {
        const res = await fetch(`${API_URL}/admin/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const messages = await res.json();
        const msgToReply = messages.find(m => m.email === activeChatId && m.status !== 'replied');
        
        if (!msgToReply) {
            showNotification('No active message to reply to', 'error');
            return;
        }

        const replyRes = await fetch(`${API_URL}/messages/${msgToReply.id}/reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ message })
        });

        if (replyRes.ok) {
            input.value = '';
            selectChat(activeChatId, document.getElementById('active-chat-user').textContent);
            showNotification('Reply sent', 'success');
        }
    } catch (err) { console.error(err); }
};

// --- Card Management & Admin Requests ---
const loadCardRequests = async () => {
    try {
        const res = await fetch(`${API_URL}/admin/card-requests`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const requests = await res.json();
        const container = document.getElementById('admin-card-requests-list');
        if (res.ok && container) {
            if (requests.length === 0) {
                container.innerHTML = '<div class="empty-state">No pending requests</div>';
                return;
            }
            container.innerHTML = requests.map(r => `
                <div class="user-row-premium">
                    <div class="user-info">
                        <div class="user-avatar-mini">${r.userName[0]}</div>
                        <div><div class="user-name">${r.userName}</div><div class="user-email">${r.userEmail}</div></div>
                    </div>
                    <div class="user-actions">
                        <button class="btn btn-primary btn-sm" onclick="approveCard('${r.id}')">Approve</button>
                        <button class="btn btn-secondary btn-sm" onclick="rejectCard('${r.id}')">Reject</button>
                    </div>
                </div>
            `).join('');
        }
    } catch (err) { console.error(err); }
};

window.approveCard = async (requestId) => {
    if (!await showSystemAlert('Are you sure you want to approve this card request?', 'Approve Card', '💳', true)) return;
    try {
        const res = await fetch(`${API_URL}/admin/approve-card`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ requestId })
        });
        if (res.ok) {
            showNotification('Card request approved', 'success');
            loadCardRequests();
        }
    } catch (err) { console.error(err); }
};

window.rejectCard = async (requestId) => {
    if (!await showSystemAlert('Are you sure you want to reject this card request?', 'Reject Card', '❌', true)) return;
    try {
        const res = await fetch(`${API_URL}/admin/reject-card`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ requestId })
        });
        if (res.ok) {
            showNotification('Card request rejected', 'info');
            loadCardRequests();
        }
    } catch (err) { console.error(err); }
};

// --- Payments & Utilities ---
window.repeatPayment = (biller) => {
    const billerSelect = document.getElementById('biller-select');
    if (billerSelect) {
        billerSelect.value = biller;
        validateUserAction('pay-bill');
    }
};

window.updateLimitText = (val) => {
    const limitDisplay = document.getElementById('limit-val');
    if (limitDisplay) limitDisplay.textContent = `₱${parseInt(val).toLocaleString()}`;
};

// --- Investment Simulation ---
window.simulateInvest = () => {
    const amount = parseFloat(document.getElementById('invest-amount').value) || 0;
    const risk = document.getElementById('invest-risk').value;
    const profitEl = document.getElementById('sim-profit');
    const percentEl = document.getElementById('sim-percent');
    const badge = document.getElementById('risk-badge');
    const recText = document.getElementById('sim-rec-text');

    let multiplier = 0.05; // Low
    if (risk === 'medium') multiplier = 0.12;
    else if (risk === 'high') multiplier = 0.25;

    const profit = amount * multiplier;
    profitEl.textContent = `₱${profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    percentEl.textContent = `+${(multiplier * 100)}%`;
    
    badge.className = `risk-badge ${risk}`;
    badge.textContent = risk.charAt(0).toUpperCase() + risk.slice(1) + ' Risk';

    if (amount > 0) {
        recText.textContent = `Based on your ${risk} risk profile, you could earn ₱${profit.toLocaleString()} in a year.`;
    } else {
        recText.textContent = 'Enter an amount to see our AI recommendation.';
    }
};

// --- Savings Goals ---
let goals = JSON.parse(localStorage.getItem('savings_goals') || '[]');

window.renderGoals = () => {
    const container = document.getElementById('goals-container');
    const totalDisplay = document.getElementById('total-savings-display');
    const activeCount = document.getElementById('active-goals-count');
    const completedCount = document.getElementById('completed-goals-count');

    if (!container) return;

    if (goals.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>You haven\'t set any savings goals yet.</p></div>';
        totalDisplay.textContent = '₱0.00';
        activeCount.textContent = '0';
        completedCount.textContent = '0';
        return;
    }

    let totalSaved = 0;
    let active = 0;
    let completed = 0;

    container.innerHTML = goals.map((g, index) => {
        const percent = Math.min(100, Math.round((g.saved / g.target) * 100));
        totalSaved += g.saved;
        if (percent >= 100) completed++; else active++;

        return `
            <div class="card goal-card-premium">
                <div class="goal-header">
                    <h4>${g.name}</h4>
                    <button class="btn-icon-sm" onclick="deleteGoal(${index})">🗑️</button>
                </div>
                <div class="goal-progress-info">
                    <span>₱${g.saved.toLocaleString()} / ₱${g.target.toLocaleString()}</span>
                    <span>${percent}%</span>
                </div>
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${percent}%;"></div>
                </div>
                <div class="goal-actions" style="margin-top: 15px; display: flex; gap: 10px;">
                    <input type="number" id="add-saved-${index}" placeholder="Amount" class="form-input-sm" style="flex: 1;">
                    <button class="btn btn-primary btn-sm" onclick="updateGoalProgress(${index})">Add</button>
                </div>
            </div>
        `;
    }).join('');

    totalDisplay.textContent = `₱${totalSaved.toLocaleString()}`;
    activeCount.textContent = active;
    completedCount.textContent = completed;
};

window.openAddGoalModal = async () => {
    const name = await showSystemPrompt('Enter goal name (e.g. New Phone)', 'New Savings Goal', '🎯');
    if (!name) return;
    const targetStr = await showSystemPrompt('Enter target amount (₱)', 'Target Amount', '💰');
    const target = parseFloat(targetStr);
    
    if (isNaN(target) || target <= 0) {
        showNotification('Invalid target amount', 'error');
        return;
    }

    goals.push({ name, target, saved: 0 });
    localStorage.setItem('savings_goals', JSON.stringify(goals));
    renderGoals();
    showNotification('Goal added successfully', 'success');
};

window.updateGoalProgress = (index) => {
    const input = document.getElementById(`add-saved-${index}`);
    const amount = parseFloat(input.value);
    if (isNaN(amount) || amount <= 0) return;

    goals[index].saved += amount;
    localStorage.setItem('savings_goals', JSON.stringify(goals));
    renderGoals();
    input.value = '';
    showNotification('Progress updated', 'success');
};

window.deleteGoal = (index) => {
    goals.splice(index, 1);
    localStorage.setItem('savings_goals', JSON.stringify(goals));
    renderGoals();
    showNotification('Goal removed', 'info');
};

// --- User Support Chat ---
window.sendChatMessage = async () => {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    const chatBody = document.getElementById('chat-body');
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-msg user';
    userMsg.innerHTML = `<div>${message}</div><small>Just now</small>`;
    chatBody.appendChild(userMsg);
    input.value = '';
    chatBody.scrollTop = chatBody.scrollHeight;

    try {
        const res = await fetch(`${API_URL}/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name: currentUser.name, email: currentUser.email, message, userId: currentUser.id })
        });
        if (res.ok) {
            setTimeout(() => {
                const botMsg = document.createElement('div');
                botMsg.className = 'chat-msg bot';
                botMsg.innerHTML = `<div>Thank you for your message. An admin will review it and reply soon.</div><small>Now</small>`;
                chatBody.appendChild(botMsg);
                chatBody.scrollTop = chatBody.scrollHeight;
            }, 1000);
        }
    } catch (err) { console.error(err); }
};

window.loadUserMessages = async () => {
    try {
        const res = await fetch(`${API_URL}/user/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const messages = await res.json();
        const chatBody = document.getElementById('chat-body');
        if (res.ok && chatBody) {
            chatBody.innerHTML = messages.map(m => `
                <div class="chat-msg user">
                    <div>${m.message}</div>
                    <small>${new Date(m.date).toLocaleTimeString()}</small>
                </div>
                ${m.replies.map(r => `
                    <div class="chat-msg bot">
                        <div>${r.message}</div>
                        <small>${new Date(r.date).toLocaleTimeString()}</small>
                    </div>
                `).join('')}
            `).join('') || `
                <div class="chat-msg bot">
                    <div>Hello! I'm your Neo Support assistant. How can I help you today?</div>
                    <small>Just now</small>
                </div>
            `;
            chatBody.scrollTop = chatBody.scrollHeight;
        }
    } catch (err) { console.error(err); }
};

// Check connection and init
fetch(`${API_URL}/profile`).then(() => console.log("Backend OK")).catch(() => console.error("Backend Down"));
if (token) initDashboard();
else showLandingView('home');

// Add Card Request Listener
document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'request-card-btn') {
        const handleRequest = async () => {
            try {
                const res = await fetch(`${API_URL}/card-request`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok) {
                    await showSystemAlert('Card request submitted successfully! Please wait for admin approval.', 'Success', '💳');
                    initDashboard();
                } else {
                    showNotification(data.message, 'error');
                }
            } catch (err) { console.error(err); }
        };
        handleRequest();
    }
});
