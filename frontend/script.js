const API_URL = window.location.origin.includes('localhost') 
    ? 'http://localhost:5000/api' 
    : window.location.origin + '/api';
let currentUser = null;
let token = localStorage.getItem('token');

// Page Elements
const landingContainer = document.getElementById('landing-container');
const userDashboardPage = document.getElementById('user-dashboard-page');
const adminDashboardPage = document.getElementById('admin-dashboard-page');

// Check Server Connection
const checkConnection = async () => {
    try {
        const res = await fetch(`${API_URL}/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log("Server connected");
    } catch (err) {
        console.warn("Server connection failed", err);
    }
};
checkConnection();

// Landing Page Navigation
window.showLandingView = (viewId) => {
    // Hide all landing views
    document.querySelectorAll('.landing-view').forEach(v => v.classList.add('hidden'));
    
    // Show requested view
    const targetView = document.getElementById(`landing-${viewId}`) || document.getElementById(`${viewId}-page`);
    if (targetView) {
        targetView.classList.remove('hidden');
    }

    // Update nav active state
    document.querySelectorAll('.nav-link').forEach(link => {
        const text = link.textContent.toLowerCase().replace(/\s/g, '');
        if (text.includes(viewId)) link.classList.add('active');
        else link.classList.remove('active');
    });

    // Special case for login/register from buttons
    if (viewId === 'login' || viewId === 'register') {
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    }

    // Refresh icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
};

// Show Password Logic
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

// Global toggle for password visibility
window.togglePassword = (inputId) => {
    const input = document.getElementById(inputId);
    if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
    }
};

window.requestAdminPasswordChange = async () => {
    const currentPass = document.getElementById('admin-current-pass').value;
    const newPass = document.getElementById('admin-new-pass').value;

    if (!currentPass || !newPass) {
        await showSystemAlert('Please fill in both current and new password fields.', 'Input Required', '⚠️');
        return;
    }

    const confirm = await showSystemAlert('Ang request na ito ay magsesend muna sa Admin. Itutuloy mo ba?', 'Confirm Request', '📩', true);
    if (!confirm) return;

    try {
        const res = await fetch(`${API_URL}/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: currentUser ? currentUser.name : 'System User',
                email: currentUser ? currentUser.email : 'system@neobank.com',
                message: `PASSWORD CHANGE REQUEST: Gusto kong palitan ang aking password. Current: ${currentPass} | New: ${newPass}`
            })
        });

        if (res.ok) {
            await showSystemAlert('Naisend na ang iyong request sa Admin. Mangyaring maghintay ng kumpirmasyon.', 'Request Sent', '✅');
            document.getElementById('admin-current-pass').value = '';
            document.getElementById('admin-new-pass').value = '';
            // Reset checkboxes
            document.getElementById('show-admin-current-pass').checked = false;
            document.getElementById('show-admin-new-pass').checked = false;
            document.getElementById('admin-current-pass').type = 'password';
            document.getElementById('admin-new-pass').type = 'password';
        } else {
            await showSystemAlert('Failed to send request. Please try again.', 'Error', '❌');
        }
    } catch (err) {
        await showSystemAlert('Connection error. Please check your server.', 'Error', '🌐');
    }
};

// Prevent numbers in name fields
const setupAlphaOnly = (inputId) => {
    const input = document.getElementById(inputId);
    if (input) {
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
        });
    }
};
setupAlphaOnly('register-fname');
setupAlphaOnly('register-lname');

window.adminSettingsUnlocked = false;

// Dashboard Switch View Logic
window.switchView = (viewId, title = '') => {
    // Intercept admin settings for password protection
    if (viewId === 'admin-settings' && !window.adminSettingsUnlocked) {
        const modal = document.getElementById('admin-password-modal');
        const submitBtn = document.getElementById('admin-auth-submit');
        const cancelBtn = document.getElementById('admin-auth-cancel');
        const passInput = document.getElementById('admin-auth-password');
        
        if (modal) {
            passInput.value = '';
            modal.classList.remove('hidden');
            
            // Temporary handlers for the modal
            const cleanup = () => {
                modal.classList.add('hidden');
                submitBtn.onclick = null;
                cancelBtn.onclick = null;
            };

            cancelBtn.onclick = () => {
                cleanup();
            };

            submitBtn.onclick = () => {
                if (passInput.value === 'admin123') { // Example admin password
                    window.adminSettingsUnlocked = true;
                    cleanup();
                    showNotification('Authentication successful', 'success');
                    switchView('admin-settings');
                } else {
                    showNotification('Incorrect admin password', 'error');
                }
            };
        }
        return;
    }

    document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden'));
    
    let targetView = document.getElementById(`dashboard-${viewId}-view`);
    
    // Fallback logic for admin/user mode
    if (!targetView) {
        if (currentUser && currentUser.email === 'admin@neobank.com') {
            targetView = document.getElementById('dashboard-admin-dashboard-view');
        } else {
            targetView = document.getElementById('dashboard-home-view');
        }
    }

    if (targetView) {
        targetView.classList.remove('hidden');
        
        // Load data for specific views
        if (viewId === 'admin-requests') {
            loadCardRequests();
        }
        if (viewId === 'admin-users') {
            loadAdminUsers();
        }
        if (viewId === 'admin-messages') {
            loadAdminMessages();
        }
        if (viewId === 'admin-transactions') {
            loadAdminTransactions();
        }
        if (viewId === 'savings') {
            renderGoals();
        }
        if (viewId === 'support') {
            loadUserMessages();
        }
        
        // Update sidebar active state
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.dataset.page === viewId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Close mobile sidebar if open
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.classList.remove('show');
    }
};

// Handle sidebar nav clicks
// --- Savings Goals Logic ---
let userGoals = [
    { id: 'goal-1', name: 'New Car Fund', target: 200000, current: 150000, completed: false },
    { id: 'goal-2', name: 'Travel Goal', target: 50000, current: 12500, completed: false }
];

window.openAddGoalModal = () => {
    document.getElementById('goal-modal').classList.remove('hidden');
};

window.createNewGoal = () => {
    const name = document.getElementById('goal-name-input').value;
    const target = parseFloat(document.getElementById('goal-target-input').value);
    const initial = parseFloat(document.getElementById('goal-initial-input').value) || 0;

    if (!name || isNaN(target) || target <= 0) {
        showNotification('Mangyaring ilagay ang tamang detalye ng goal.', 'error');
        return;
    }

    const newGoal = {
        id: 'goal-' + Date.now(),
        name,
        target,
        current: initial,
        completed: initial >= target
    };

    userGoals.push(newGoal);
    document.getElementById('goal-modal').classList.add('hidden');
    renderGoals();
    showNotification('Savings goal created successfully!', 'success');
};

window.renderGoals = () => {
    const container = document.getElementById('goals-container');
    const totalSavingsEl = document.getElementById('total-savings-display');
    const activeGoalsEl = document.getElementById('active-goals-count');
    const completedGoalsEl = document.getElementById('completed-goals-count');

    if (!container) return;

    if (userGoals.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>You haven\'t set any savings goals yet.</p></div>';
        return;
    }

    let totalSavings = 0;
    let activeCount = 0;
    let completedCount = 0;

    container.innerHTML = userGoals.map(goal => {
        totalSavings += goal.current;
        if (goal.completed) completedCount++; else activeCount++;

        const percent = Math.min(Math.round((goal.current / goal.target) * 100), 100);
        
        return `
            <div class="card goal-card" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 25px; border-radius: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
                    <div>
                        <h4 style="font-size: 1.2rem; margin: 0;">${goal.name}</h4>
                        <span style="font-size: 0.85rem; color: var(--text-secondary);">Target: ₱${goal.target.toLocaleString()}</span>
                    </div>
                    <div class="percent-badge" style="background: rgba(0,223,129,0.1); color: var(--primary); padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 700;">
                        ${percent}%
                    </div>
                </div>
                
                <div class="progress-container" style="background: rgba(255,255,255,0.05); height: 8px; border-radius: 10px; overflow: hidden; margin-bottom: 15px;">
                    <div class="progress-bar" style="width: ${percent}%; height: 100%; background: var(--primary); box-shadow: 0 0 10px var(--primary-glow); transition: width 1s ease-in-out;"></div>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600;">₱${goal.current.toLocaleString()} saved</span>
                    <button class="btn btn-sm btn-secondary" onclick="openAddFunds('${goal.id}')">Add Funds</button>
                </div>
            </div>
        `;
    }).join('');

    if (totalSavingsEl) totalSavingsEl.textContent = `₱${totalSavings.toLocaleString()}`;
    if (activeGoalsEl) activeGoalsEl.textContent = activeCount;
    if (completedGoalsEl) completedGoalsEl.textContent = completedCount;
};

window.openAddFunds = (goalId) => {
    const modal = document.getElementById('add-funds-modal');
    const confirmBtn = document.getElementById('confirm-add-funds-btn');
    const input = document.getElementById('add-funds-input');

    if (modal) {
        modal.classList.remove('hidden');
        input.value = '';
        
        confirmBtn.onclick = () => {
            const amount = parseFloat(input.value);
            if (isNaN(amount) || amount <= 0) {
                showNotification('Invalid amount', 'error');
                return;
            }

            const goal = userGoals.find(g => goalId === goalId); // Simplified for simulation
            const targetGoal = userGoals.find(g => g.id === goalId);
            
            if (targetGoal) {
                targetGoal.current += amount;
                if (targetGoal.current >= targetGoal.target) targetGoal.completed = true;
                
                modal.classList.add('hidden');
                renderGoals();
                showNotification(`Successfully added ₱${amount.toLocaleString()} to ${targetGoal.name}`, 'success');
            }
        };
    }
};

const setupNavItems = () => {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            switchView(page);
        });
    });
};

// Profile dropdown logic
const setupDropdowns = () => {
    const logoutBtn = document.getElementById('dropdown-logout');
    if (logoutBtn) {
        logoutBtn.onclick = (e) => {
            e.preventDefault();
            document.getElementById('logout-btn-sidebar').click();
        };
    }
};

// Initialize Feather Icons and setup nav
const setupDashboardUI = () => {
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
    setupNavItems();
    setupDropdownListeners();
    setupActionListeners();
};

const setupActionListeners = () => {
    const requestCardBtn = document.getElementById('request-card-btn');
    if (requestCardBtn) {
        requestCardBtn.onclick = async () => {
            const confirm = await showSystemAlert('Are you sure you want to request a new virtual card?', 'Request Card', '💳', true);
            if (confirm) {
                try {
                    const res = await fetch(`${API_URL}/card-request`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (res.ok) {
                        showNotification('Virtual card request submitted! Our team will review it.', 'success');
                    } else {
                        const data = await res.json();
                        showNotification(data.message || 'Failed to submit request', 'error');
                    }
                } catch (err) {
                    showNotification('Error connecting to server', 'error');
                }
            }
        };
    }
};

const loadCardRequests = async () => {
    try {
        const res = await fetch(`${API_URL}/admin/card-requests`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const requests = await res.json();
        const container = document.getElementById('admin-card-requests-list');
        if (!container) return;

        if (res.ok && requests.length > 0) {
            container.innerHTML = requests.map(r => `
                <div class="request-row-premium">
                    <div class="request-info">
                        <div class="user-avatar-mini">${r.userName[0]}</div>
                        <div>
                            <div class="user-name">${r.userName}</div>
                            <div class="user-email">${r.userEmail}</div>
                        </div>
                    </div>
                    <div class="request-status status-pending">Pending</div>
                    <div class="user-actions">
                        <button class="btn btn-primary btn-sm" onclick="approveCardRequest('${r.id}')">Approve</button>
                        <button class="btn btn-danger btn-sm" onclick="rejectCardRequest('${r.id}')">Reject</button>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="empty-state">No pending requests</div>';
        }
    } catch (err) {
        console.error('Failed to load card requests', err);
    }
};

window.approveCardRequest = async (id) => {
    const confirm = await showSystemAlert('Approve this card request?', 'Confirm Approval', '💳', true);
    if (confirm) {
        try {
            const res = await fetch(`${API_URL}/admin/approve-card`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ requestId: id })
            });
            if (res.ok) {
                showNotification('Card request approved!', 'success');
                loadCardRequests();
            }
        } catch (err) {
            showNotification('Error approving request', 'error');
        }
    }
};

window.rejectCardRequest = async (id) => {
    const confirm = await showSystemAlert('Reject this card request?', 'Confirm Rejection', '❌', true);
    if (confirm) {
        try {
            const res = await fetch(`${API_URL}/admin/reject-card`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ requestId: id })
            });
            if (res.ok) {
                showNotification('Card request rejected', 'info');
                loadCardRequests();
            }
        } catch (err) {
            showNotification('Error rejecting request', 'error');
        }
    }
};

// --- New Features (Premium Views) ---
window.validateUserAction = (action) => {
    openTransactionModal(action);
};

window.repeatPayment = (biller) => {
    validateUserAction('pay-bill');
    const billerSelect = document.getElementById('biller-select');
    if (billerSelect) {
        // Find option by text
        for (let i = 0; i < billerSelect.options.length; i++) {
            if (billerSelect.options[i].text.includes(biller)) {
                billerSelect.selectedIndex = i;
                break;
            }
        }
    }
};

window.toggleFreeze = (btn) => {
    const isFrozen = btn.classList.contains('active');
    if (isFrozen) {
        btn.classList.remove('active');
        btn.innerHTML = '<i data-feather="lock"></i> Freeze';
        showNotification('Card unfrozen', 'success');
    } else {
        btn.classList.add('active');
        btn.innerHTML = '<i data-feather="unlock"></i> Unfreeze';
        showNotification('Card frozen', 'info');
    }
    if (typeof feather !== 'undefined') feather.replace();
};

window.revealDetails = async (btn) => {
    const cardNum = document.getElementById('v-card-num-display');
    const cvvVal = document.getElementById('v-card-cvv-val');
    const isRevealed = btn.dataset.revealed === 'true';

    if (isRevealed) {
        cardNum.textContent = '**** **** **** ' + (currentUser.cardDetails ? currentUser.cardDetails.number.slice(-4) : '8888');
        cvvVal.textContent = '***';
        btn.innerHTML = '<i data-feather="eye"></i> Reveal Details';
        btn.dataset.revealed = 'false';
        if (typeof feather !== 'undefined') feather.replace();
    } else {
        // Prompt for password
        const password = await showSystemPrompt('Para i-reveal ang card details, mangyaring ilagay ang iyong password:', 'Security Verification', '🔐', true);
        
        if (!password) return;

        try {
            const res = await fetch(`${API_URL}/verify-password`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ password })
            });

            if (res.ok) {
                cardNum.textContent = currentUser.cardDetails ? currentUser.cardDetails.number : '4532 7812 9901 8888';
                cvvVal.textContent = currentUser.cardDetails ? currentUser.cardDetails.cvv : '123';
                btn.innerHTML = '<i data-feather="eye-off"></i> Hide Details';
                btn.dataset.revealed = 'true';
                if (typeof feather !== 'undefined') feather.replace();
            } else {
                await showSystemAlert('Maling password. Hindi maaring ipakita ang card details.', 'Security Error', '❌');
            }
        } catch (err) {
            await showSystemAlert('Error connecting to server.', 'Connection Error', '🌐');
        }
    }
};

const setupDropdownListeners = () => {
    const ids = ['dropdown-logout-user', 'dropdown-logout-admin', 'logout-btn-sidebar', 'logout-btn-admin'];
    ids.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.onclick = (e) => {
                e.preventDefault();
                logout();
            };
        }
    });

    const profileBtnUser = document.getElementById('profile-btn-user');
    if (profileBtnUser) {
        profileBtnUser.onclick = () => switchView('profile');
    }
    
    const profileBtnAdmin = document.getElementById('profile-btn-admin');
    if (profileBtnAdmin) {
        profileBtnAdmin.onclick = () => switchView('admin-dashboard');
    }
};

// Call this after any view change that might add new icons
window.refreshIcons = () => {
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
};

setupDashboardUI();

// Logout logic
const logout = async () => {
    const confirm = await showSystemAlert('Are you sure you want to log out?', 'Confirm Logout', '🚪', true);
    if (confirm) {
        token = null;
        currentUser = null;
        window.adminSettingsUnlocked = false; // Reset admin settings lock
        localStorage.removeItem('token');
        showPage('landing-container');
        showLandingView('home');
        showNotification('Logged out successfully', 'success');
    }
};

// Contact form handler
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.onsubmit = async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('contact-name').value;
        const email = document.getElementById('contact-email').value;
        const message = document.getElementById('contact-message').value;

        try {
            const res = await fetch(`${API_URL}/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, message })
            });

            if (res.ok) {
                await showSystemAlert('Thank you for your message! Our team will get back to you shortly.', 'Message Sent', '📩');
                contactForm.reset();
            } else {
                const data = await res.json();
                showSystemAlert(data.message || 'Failed to send message', 'Error', '❌');
            }
        } catch (err) {
            showSystemAlert('Connection error while sending message', 'Error', '🌐');
        }
    };
}

const showPage = (pageId) => {
    landingContainer.classList.add('hidden');
    userDashboardPage.classList.add('hidden');
    adminDashboardPage.classList.add('hidden');

    const target = document.getElementById(pageId);
    if (target) {
        target.classList.remove('hidden');
        if (typeof feather !== 'undefined') feather.replace();
    }
};

// --- Auth ---
const sendOtpBtn = document.getElementById('send-otp-btn');
if (sendOtpBtn) {
    sendOtpBtn.onclick = async () => {
        const email = document.getElementById('register-email').value;
        if (!email || !email.includes('@') || !email.toLowerCase().endsWith('.com')) {
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
            const data = await res.json();
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
        const captchaResponse = grecaptcha.getResponse(1); // 1 for the second widget (register)

        if (!captchaResponse) {
            await showSystemAlert('Please complete the reCAPTCHA verification.', 'Verification Required', '🛡️');
            return;
        }

        if (!otp || otp.length !== 6) {
            await showSystemAlert('Please enter the 6-digit OTP code sent to your email.', 'OTP Required', '🔑');
            return;
        }

        // Email Validation: Must have @ and .com
        if (!email.includes('@') || !email.toLowerCase().endsWith('.com')) {
            await showSystemAlert('Email must be valid and end with .com (e.g., example@gmail.com)', 'Validation Error', '📧');
            return;
        }

        // Phone Number Validation: Must be exactly 11 digits
        if (!/^\d{11}$/.test(phone)) {
            await showSystemAlert('Phone number must be exactly 11 digits.', 'Validation Error', '📱');
            return;
        }

        // Password Complexity: Must have letters, numbers, and symbols
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSymbol = /[!@#$%^&*()_+[\]{};':"\\|,.<>/?]/.test(password);

        if (!hasLetter || !hasNumber || !hasSymbol) {
            await showSystemAlert('Password must be a mix of letters, numbers, and symbols.', 'Security Error', '🔐');
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
                    name: `${fname} ${lname}`, 
                    email, 
                    password,
                    phoneNumber: phone,
                    otp: otp,
                    captchaToken: captchaResponse
                })
            });
            const data = await res.json();
            if (res.ok) {
                await showSystemAlert('Registration successful! Please login.', 'Success', '✅');
                showLandingView('login');
                e.target.reset();
                grecaptcha.reset(1);
            } else {
                await showSystemAlert(data.message, 'Registration Failed', '❌');
                grecaptcha.reset(1);
            }
        } catch (err) {
            await showSystemAlert('Error connecting to server. Make sure backend is running.', 'Connection Error', '🌐');
            grecaptcha.reset(1);
        }
    };
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const captchaResponse = grecaptcha.getResponse(0); // 0 for the first widget (login)

        if (!captchaResponse) {
            await showSystemAlert('Please complete the reCAPTCHA verification.', 'Verification Required', '🛡️');
            return;
        }

        // Email Validation: Must have @ and .com
        if (!email.includes('@') || !email.toLowerCase().endsWith('.com')) {
            await showSystemAlert('Please enter a valid email address ending in .com', 'Validation Error', '📧');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, captchaToken: captchaResponse })
            });
            const data = await res.json();
            if (res.ok) {
                token = data.token;
                localStorage.setItem('token', token);
                initDashboard();
                grecaptcha.reset(0);
            } else {
                await showSystemAlert(data.message, 'Login Failed', '❌');
                grecaptcha.reset(0);
            }
        } catch (err) {
            await showSystemAlert('Error connecting to server. Please check your connection.', 'Connection Error', '🌐');
            grecaptcha.reset(0);
        }
    };
}

// Admin Tracking Logic
const loadAdminUsers = async () => {
    try {
        const res = await fetch(`${API_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const users = await res.json();
        const container = document.getElementById('admin-users-list');
        if (!container) return;

        if (res.ok) {
            container.innerHTML = users.map(u => `
                <div class="user-row-premium">
                    <div class="user-info">
                        <div class="user-avatar-mini">${u.name[0]}</div>
                        <div>
                            <div class="user-name">${u.name}</div>
                            <div class="user-email">${u.email}</div>
                        </div>
                    </div>
                    <div class="user-stats">
                        <div class="stat">
                            <span class="label">Balance</span>
                            <span class="value">₱***</span>
                        </div>
                        <div class="stat">
                            <span class="label">TXs</span>
                            <span class="value">${u.transactionCount}</span>
                        </div>
                    </div>
                    <div class="user-actions">
                        <button class="btn-icon" onclick="viewUserDetails('${u.id}')"><i data-feather="eye"></i></button>
                    </div>
                </div>
            `).join('');
            feather.replace();
        }
    } catch (err) {
        console.error('Failed to load admin users', err);
    }
};

const loadAdminTransactions = async () => {
    try {
        const res = await fetch(`${API_URL}/admin/transactions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const transactions = await res.json();
        const container = document.getElementById('admin-transactions-list');
        if (!container) return;

        if (res.ok) {
            if (transactions.length === 0) {
                container.innerHTML = '<div class="empty-state"><p>No transactions found in the system.</p></div>';
                return;
            }

            container.innerHTML = transactions.map(t => {
                const isPositive = t.type === 'Deposit';
                const date = new Date(t.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                return `
                    <div class="activity-item">
                        <div class="act-icon" style="background: ${isPositive ? 'rgba(0,223,129,0.1)' : 'rgba(239,68,68,0.1)'}; color: ${isPositive ? 'var(--primary)' : 'var(--accent-red)'}">
                            ${isPositive ? '📥' : '📤'}
                        </div>
                        <div class="act-details">
                            <div class="act-title">${t.description}</div>
                            <div class="act-date">${date} • <span style="color: var(--primary)">${t.userName}</span></div>
                        </div>
                        <div class="act-amount ${isPositive ? 'positive' : 'negative'}">
                            ${isPositive ? '+' : '-'}₱${t.amount.toLocaleString()}
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (err) {
        console.error('Failed to load system transactions', err);
    }
};

const viewUserDetails = async (userId) => {
    try {
        const res = await fetch(`${API_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const users = await res.json();
        const user = users.find(u => u.id === userId);

        if (user) {
            const container = document.getElementById('user-details-content');
            container.innerHTML = `
                <div style="background: rgba(255,255,255,0.02); padding: 15px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
                            <span style="color: var(--text-secondary);">Full Name</span>
                            <span style="font-weight: 600;">${user.name}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
                            <span style="color: var(--text-secondary);">Email Address</span>
                            <span style="font-weight: 600;">${user.email}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
                            <span style="color: var(--text-secondary);">Current Balance</span>
                            <span style="font-weight: 600; color: var(--accent-success);">₱${user.balance.toLocaleString()}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
                            <span style="color: var(--text-secondary);">Total Transactions</span>
                            <span style="font-weight: 600;">${user.transactionCount}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-secondary);">User ID</span>
                            <span style="font-family: monospace; font-size: 0.8rem;">${user.id}</span>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('user-details-modal').classList.remove('hidden');
        }
    } catch (err) {
        console.error('Failed to view user details', err);
        showNotification('Failed to load user details', 'error');
    }
};

// Reports Download Functions
window.downloadPDFReport = async () => {
    const confirm = await showSystemAlert('Generate and download PDF report?', 'Download Report', '📄', true);
    if (confirm) {
        showNotification('Generating PDF report...', 'info');
        setTimeout(() => {
            showNotification('Report downloaded successfully!', 'success');
            // Mocking download behavior
            const a = document.createElement('a');
            a.href = 'data:application/pdf;base64,';
            a.download = `NeoBank_Report_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }, 1500);
    }
};

window.exportCSVReport = async () => {
    const confirm = await showSystemAlert('Export transaction data as CSV?', 'Export Data', '📊', true);
    if (confirm) {
        showNotification('Preparing CSV export...', 'info');
        setTimeout(() => {
            showNotification('Data exported successfully!', 'success');
            // Mocking download behavior
            const csvContent = "data:text/csv;charset=utf-8,Type,Amount,Percentage\nDeposits,8200000,45%\nWithdrawals,3450000,25%\nTransfers,2100000,15%\nBill Payments,1500000,15%";
            const encodedUri = encodeURI(csvContent);
            const a = document.createElement('a');
            a.href = encodedUri;
            a.download = `NeoBank_Data_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }, 1500);
    }
};

// Admin Settings IP Whitelist Functions
window.openIPWhitelistModal = () => {
    const modal = document.getElementById('ip-whitelist-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
};

window.closeIPWhitelistModal = () => {
    const modal = document.getElementById('ip-whitelist-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

window.addIPWhitelist = () => {
    const input = document.getElementById('new-ip-input');
    const ipList = document.getElementById('ip-list-container');
    const ipValue = input.value.trim();

    if (!ipValue) {
        showNotification('Please enter an IP address', 'error');
        return;
    }

    // Basic IP validation regex
    const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(ipValue)) {
        showNotification('Invalid IP address format', 'error');
        return;
    }

    const rowId = 'ip-row-' + Date.now();
    const newRow = document.createElement('div');
    newRow.id = rowId;
    newRow.style = 'display: flex; justify-content: space-between; padding: 12px 15px; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05);';
    newRow.innerHTML = `
        <span style="font-weight: 500;">${ipValue}</span>
        <button class="btn-icon danger btn-sm" onclick="removeIPWhitelist('${rowId}')"><i data-feather="trash-2"></i></button>
    `;

    ipList.appendChild(newRow);
    input.value = '';
    
    if (typeof feather !== 'undefined') feather.replace();
    showNotification('IP Address added to whitelist', 'success');
};

window.removeIPWhitelist = async (rowId) => {
    const confirm = await showSystemAlert('Remove this IP from the whitelist?', 'Confirm Removal', '🗑️', true);
    if (confirm) {
        const row = document.getElementById(rowId);
        if (row) {
            row.remove();
            showNotification('IP removed from whitelist', 'info');
        }
    }
};

// Chat Simulation (Now Real Conversation)
window.sendChatMessage = async () => {
    const input = document.getElementById('chat-input');
    const body = document.getElementById('chat-body');
    if (!input || !body || !input.value.trim() || !currentUser) return;

    const userMsg = input.value.trim();
    input.value = '';

    // Add user message locally for instant feedback
    const userDiv = document.createElement('div');
    userDiv.className = 'chat-msg user';
    userDiv.textContent = userMsg;
    body.appendChild(userDiv);
    body.scrollTop = body.scrollHeight;

    try {
        const res = await fetch(`${API_URL}/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: currentUser.name,
                email: currentUser.email,
                message: userMsg,
                userId: currentUser.id
            })
        });

        if (res.ok) {
            setTimeout(loadUserMessages, 1000);
        }
    } catch (err) {
        showNotification('Error connecting to server', 'error');
    }
};

window.loadUserMessages = async () => {
    const body = document.getElementById('chat-body');
    if (!body || !currentUser) return;

    try {
        const res = await fetch(`${API_URL}/user/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const messages = await res.json();

        body.innerHTML = '';
        
        if (messages.length === 0) {
            body.innerHTML = '<div class="chat-msg bot">Hello! How can I assist you with your banking today?</div>';
            return;
        }

        messages.forEach(m => {
            // Main message
            const msgDiv = document.createElement('div');
            msgDiv.className = 'chat-msg user';
            msgDiv.innerHTML = `
                <div style="font-size: 0.9rem;">${m.message}</div>
                <small style="font-size: 0.65rem; opacity: 0.6;">${new Date(m.date).toLocaleTimeString()}</small>
            `;
            body.appendChild(msgDiv);

            // Replies
            const replies = m.replies || [];
            replies.forEach(r => {
                const replyDiv = document.createElement('div');
                replyDiv.className = r.sender === 'admin' ? 'chat-msg bot' : 'chat-msg user';
                replyDiv.innerHTML = `
                    <div style="font-size: 0.9rem;">${r.message}</div>
                    <small style="font-size: 0.65rem; opacity: 0.6;">${new Date(r.date).toLocaleTimeString()}</small>
                `;
                body.appendChild(replyDiv);
            });
        });

        body.scrollTop = body.scrollHeight;
    } catch (err) {
        console.error('Failed to load messages', err);
    }
};

// --- Dashboard Logic ---
const setupQuickActions = () => {
    document.querySelectorAll('.quick-action').forEach(btn => {
        btn.onclick = () => {
            const action = btn.dataset.action;
            openTransactionModal(action);
        };
    });
};

const promptTransactionPassword = (callback) => {
    const modal = document.getElementById('user-password-modal');
    const submitBtn = document.getElementById('user-password-submit');
    const cancelBtn = document.getElementById('user-password-cancel');
    const passInput = document.getElementById('user-action-password');
    
    if (modal && currentUser) {
        passInput.value = '';
        modal.classList.remove('hidden');
        setTimeout(() => passInput.focus(), 100);
        
        const cleanup = () => {
            modal.classList.add('hidden');
            submitBtn.onclick = null;
            cancelBtn.onclick = null;
            passInput.onkeypress = null;
        };

        cancelBtn.onclick = () => {
            cleanup();
            if (callback) callback(false);
        };

        const verifyPassword = async () => {
            const password = passInput.value;
            if (!password) {
                showNotification('Please enter your password', 'error');
                return;
            }
            
            submitBtn.textContent = 'Verifying...';
            submitBtn.disabled = true;
            
            try {
                const res = await fetch(`${API_URL}/verify-password`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ password })
                });
                
                if (res.ok) {
                    cleanup();
                    if (callback) callback(true);
                } else {
                    showNotification('Incorrect password', 'error');
                }
            } catch (err) {
                showNotification('Validation failed. Please try again.', 'error');
            } finally {
                submitBtn.textContent = 'Confirm';
                submitBtn.disabled = false;
            }
        };

        submitBtn.onclick = verifyPassword;

        passInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                verifyPassword();
            }
        };
    }
};

window.revealDetails = async (btn) => {
    const cardNum = document.getElementById('v-card-num-display');
    const cvvVal = document.getElementById('v-card-cvv-val');
    const isRevealed = btn.dataset.revealed === 'true';

    if (isRevealed) {
        cardNum.textContent = '**** **** **** ' + (currentUser.cardDetails ? currentUser.cardDetails.number.slice(-4) : '8888');
        cvvVal.textContent = '***';
        btn.innerHTML = '<i data-feather="eye"></i> Reveal Details';
        btn.dataset.revealed = 'false';
        if (typeof feather !== 'undefined') feather.replace();
    } else {
        // Use promptTransactionPassword for verification
        promptTransactionPassword(async (isVerified) => {
            if (isVerified) {
                cardNum.textContent = currentUser.cardDetails ? currentUser.cardDetails.number : '4532 7812 9901 8888';
                cvvVal.textContent = currentUser.cardDetails ? currentUser.cardDetails.cvv : '123';
                btn.innerHTML = '<i data-feather="eye-off"></i> Hide Details';
                btn.dataset.revealed = 'true';
                if (typeof feather !== 'undefined') feather.replace();
            }
        });
    }
};

const openTransactionModal = (type) => {
    const modal = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const field = document.getElementById('transfer-field');
    const billerField = document.getElementById('biller-field');
    const withdrawField = document.getElementById('withdraw-field');
    const confirmBtn = document.getElementById('confirm-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const amountInput = document.getElementById('amount-input');
    const recipientInput = document.getElementById('recipient-input');
    const withdrawMethod = document.getElementById('withdraw-method');
    const withdrawAccount = document.getElementById('withdraw-account');
    const passwordInput = document.getElementById('transaction-password');

    if (!modal) return;

    title.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    field.classList.toggle('hidden', type !== 'transfer');
    if (billerField) billerField.classList.toggle('hidden', type !== 'pay-bill');
    if (withdrawField) withdrawField.classList.toggle('hidden', type !== 'withdraw');
    
    amountInput.value = '';
    if (recipientInput) recipientInput.value = '';
    if (withdrawAccount) withdrawAccount.value = '';
    if (passwordInput) passwordInput.value = '';

    modal.classList.remove('hidden');

    confirmBtn.onclick = async () => {
        const amount = parseFloat(amountInput.value);
        if (isNaN(amount) || amount <= 0) {
            await showSystemAlert('Please enter a valid amount.', 'Error', '❌');
            return;
        }

        const password = passwordInput ? passwordInput.value : '';
        if (!password) {
            await showSystemAlert('Please enter your password to confirm.', 'Error', '❌');
            return;
        }

        let endpoint = `${API_URL}/${type.toLowerCase()}`;
        let body = { amount, password };

        if (type === 'transfer') {
            const recipient = recipientInput.value.trim();
            
            const isEmail = recipient.includes('@') && recipient.includes('.com');
            const isPhone = /^\d{11}$/.test(recipient);
            
            if (!recipient || (!isEmail && !isPhone)) {
                await showSystemAlert('Please enter a valid recipient email (must contain @ and .com) or an 11-digit phone number.', 'Error', '❌');
                return;
            }
            body.toEmail = recipient;
        }

        if (type === 'pay-bill') {
            const biller = document.getElementById('biller-select').value;
            body.biller = biller;
        }

        if (type === 'withdraw') {
            const method = withdrawMethod.value;
            const account = withdrawAccount.value;
            if (!account) {
                await showSystemAlert('Please enter withdrawal details.', 'Error', '❌');
                return;
            }
            body.method = method;
            body.account = account;
        }

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (res.ok) {
                modal.classList.add('hidden');
                await showSystemAlert(`${type.charAt(0).toUpperCase() + type.slice(1)} successful!`, 'Success', '✅');
                initDashboard(); // Refresh data
            } else {
                await showSystemAlert(data.message, 'Transaction Failed', '❌');
            }
        } catch (err) {
            await showSystemAlert('Error processing transaction.', 'Error', '❌');
        }
    };

    cancelBtn.onclick = () => modal.classList.add('hidden');
};

const initDashboard = async () => {
    if (!token) return;
    try {
        const res = await fetch(`${API_URL}/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            currentUser = await res.json();
            updateUI();
            setupQuickActions();
        } else {
            token = null;
            localStorage.removeItem('token');
            showPage('landing-container');
            showLandingView('login');
        }
    } catch (err) {
        await showSystemAlert('Error loading dashboard. Server may be down.', 'System Error', '❌');
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

const updateUI = () => {
    if (!currentUser) return;

    if (currentUser.email === 'admin@neobank.com') {
        showPage('admin-dashboard-page');
        switchView('admin-dashboard');
        loadAdminUsers();
        updateAdminStats();

        const dateDisplay = document.getElementById('current-date-display-admin');
        if (dateDisplay) {
            const now = new Date();
            dateDisplay.textContent = `System Status: Operational | ${now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}`;
        }
    } else {
        showPage('user-dashboard-page');
        switchView('home');
        
        // Update user specific UI
        const welcomeMsg = document.getElementById('welcome-msg');
        if (welcomeMsg) welcomeMsg.textContent = `Welcome back, ${currentUser.name.split(' ')[0]}!`;
        
        const summaryBalance = document.getElementById('acc-primary-balance-display');
        if (summaryBalance) summaryBalance.textContent = `₱${currentUser.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        
        // Update Card View based on status
        const cardArea = document.getElementById('dashboard-cards-view');
        if (cardArea) {
            const requestCardSection = cardArea.querySelector('.request-card-section');
            const activeCardSection = cardArea.querySelector('.active-card-section');
            
            if (currentUser.hasCard) {
                if (requestCardSection) requestCardSection.classList.add('hidden');
                if (activeCardSection) {
                    activeCardSection.classList.remove('hidden');
                    // Set card details
                    const cardNum = document.getElementById('v-card-num-display');
                    const cardExp = document.getElementById('v-card-expiry-val');
                    const cardName = document.getElementById('v-card-holder-name');
                    
                    if (cardNum) cardNum.textContent = '**** **** **** ' + currentUser.cardDetails.number.slice(-4);
                    if (cardExp) cardExp.textContent = currentUser.cardDetails.expiry;
                    if (cardName) cardName.textContent = currentUser.name.toUpperCase();
                }
            } else {
                if (requestCardSection) requestCardSection.classList.remove('hidden');
                if (activeCardSection) activeCardSection.classList.add('hidden');
            }
        }

        const nameDisplay = document.getElementById('user-name-display');
        if (nameDisplay) nameDisplay.textContent = currentUser.name;
        
        const dateDisplay = document.getElementById('current-date-display-user');
        if (dateDisplay) {
            const now = new Date();
            dateDisplay.textContent = `Today is ${now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}`;
        }
        
        const listDash = document.getElementById('transaction-list-home');
        const listFull = document.getElementById('transaction-list-full');
        const listFullAccounts = document.getElementById('transaction-list-full-accounts');
        
        if (listDash) listDash.innerHTML = '';
        if (listFull) listFull.innerHTML = '';
        if (listFullAccounts) listFullAccounts.innerHTML = '';
        
        renderTransactions(listDash, 5);
        renderTransactions(listFull);
        renderTransactions(listFullAccounts);
        
        // Update Notifications
        const notifIndicator = document.querySelector('.notification-indicator');
        const notifContent = document.querySelector('.dropdown-content');
        
        if (notifIndicator && notifContent && currentUser.notifications) {
            const unreadCount = currentUser.notifications.filter(n => !n.read).length;
            
            if (unreadCount > 0) {
                notifIndicator.style.display = 'block';
            } else {
                notifIndicator.style.display = 'none';
            }
            
            if (currentUser.notifications.length > 0) {
                notifContent.innerHTML = currentUser.notifications.map(n => `
                    <div class="notification-item" style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); ${!n.read ? 'background: rgba(0,223,129,0.05);' : ''}">
                        <p style="margin: 0; font-size: 0.9rem;">${n.message}</p>
                        <small style="color: var(--text-secondary); font-size: 0.75rem;">${new Date(n.date).toLocaleString()}</small>
                    </div>
                `).join('');
            } else {
                notifContent.innerHTML = '<p class="empty-msg">No new notifications</p>';
            }
        }
    }
};

const updateAdminStats = async () => {
    try {
        const res = await fetch(`${API_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const users = await res.json();
            const totalBalance = users.reduce((sum, u) => sum + u.balance, 0);
            const totalTXs = users.reduce((sum, u) => sum + u.transactionCount, 0);
            
            const statsGrid = document.querySelector('.admin-stats-grid');
            if (statsGrid) {
                statsGrid.innerHTML = `
                    <div class="stat-card-premium">
                        <span class="stat-label">Total Users</span>
                        <span class="stat-value">${users.length}</span>
                    </div>
                    <div class="stat-card-premium">
                        <span class="stat-label">System Balance</span>
                        <span class="stat-value">₱${totalBalance.toLocaleString()}</span>
                    </div>
                    <div class="stat-card-premium">
                        <span class="stat-label">Total Transactions</span>
                        <span class="stat-value">${totalTXs}</span>
                    </div>
                    <div class="stat-card-premium">
                        <span class="stat-label">System Status</span>
                        <span class="stat-value" style="color: var(--primary)">ONLINE</span>
                    </div>
                `;
            }
        }
    } catch (err) {
        console.error('Failed to update admin stats', err);
    }
};

// --- Investment Simulation ---
window.simulateInvest = () => {
    const amount = parseFloat(document.getElementById('invest-amount').value) || 0;
    const risk = document.getElementById('invest-risk').value;
    const profitEl = document.getElementById('sim-profit');
    const percentEl = document.getElementById('sim-percent');
    const badgeEl = document.getElementById('risk-badge');
    const recText = document.getElementById('sim-rec-text');

    if (amount <= 0) {
        profitEl.textContent = '₱0.00';
        percentEl.textContent = '+0%';
        recText.textContent = 'Enter an amount to see our AI recommendation.';
        return;
    }

    let rate = 0;
    let riskName = 'Low';
    let riskClass = 'low';

    if (risk === 'low') {
        rate = 0.05;
        riskName = 'Low Risk';
        riskClass = 'low';
    } else if (risk === 'medium') {
        rate = 0.12;
        riskName = 'Medium Risk';
        riskClass = 'medium';
    } else if (risk === 'high') {
        rate = 0.25;
        riskName = 'High Risk';
        riskClass = 'high';
    }

    const profit = amount * rate;
    profitEl.textContent = `₱${profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    percentEl.textContent = `+${(rate * 100)}%`;
    
    badgeEl.textContent = riskName;
    badgeEl.className = `risk-badge ${riskClass}`;

    recText.textContent = `Based on your ${riskName} tolerance, we recommend a diversified portfolio to maximize your estimated ₱${profit.toLocaleString()} growth.`;
};

// --- Admin Actions ---
window.deleteUser = async (userId) => {
    const confirm = await showSystemAlert('Are you sure you want to delete this user? This action cannot be undone.', 'Confirm Deletion', '⚠️', true);
    if (confirm) {
        const modal = document.getElementById('admin-password-modal');
        const submitBtn = document.getElementById('admin-auth-submit');
        const cancelBtn = document.getElementById('admin-auth-cancel');
        const passInput = document.getElementById('admin-auth-password');
        
        if (modal) {
            passInput.value = '';
            modal.classList.remove('hidden');
            
            const cleanup = () => {
                modal.classList.add('hidden');
                submitBtn.onclick = null;
                cancelBtn.onclick = null;
            };

            cancelBtn.onclick = () => {
                cleanup();
            };

            submitBtn.onclick = async () => {
                if (passInput.value === 'admin123') {
                    cleanup();
                    try {
                        const res = await fetch(`${API_URL}/admin/users/${userId}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (res.ok) {
                            showNotification('User deleted successfully', 'success');
                            loadAdminUsers();
                        } else {
                            const data = await res.json();
                            showSystemAlert(data.message, 'Deletion Failed', '❌');
                        }
                    } catch (err) {
                        showSystemAlert('Connection error', 'Error', '🌐');
                    }
                } else {
                    showNotification('Incorrect admin password', 'error');
                }
            };
        }
    }
};

// --- Admin Messages Management ---
let activeAdminChatId = null;

window.loadAdminMessages = async () => {
    const sidebar = document.getElementById('admin-chat-sidebar');
    if (!sidebar) return;

    try {
        const res = await fetch(`${API_URL}/admin/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const messages = await res.json();

        sidebar.innerHTML = '';
        
        if (messages.length === 0) {
            sidebar.innerHTML = '<div class="empty-msg" style="padding: 20px; text-align: center;">No messages yet</div>';
            return;
        }

        messages.forEach(msg => {
            const item = document.createElement('div');
            item.className = `chat-list-item ${activeAdminChatId === msg.id ? 'active' : ''}`;
            item.onclick = () => selectAdminChat(msg);
            
            const replies = msg.replies || [];
            const lastMsg = replies.length > 0 ? replies[replies.length - 1].message : msg.message;
            
            item.innerHTML = `
                <h6>${msg.name} ${msg.status === 'unread' ? '<span style="color: var(--primary);">•</span>' : ''}</h6>
                <p>${lastMsg}</p>
            `;
            sidebar.appendChild(item);
        });
        
        // Update badge
        const unreadCount = messages.filter(m => m.status === 'unread').length;
        const badge = document.getElementById('unread-messages-badge');
        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
        }

        // If a chat is active, update its body too
        if (activeAdminChatId) {
            const activeMsg = messages.find(m => m.id === activeAdminChatId);
            if (activeMsg) renderAdminChatBody(activeMsg);
        }
    } catch (err) {
        console.error('Failed to load admin messages', err);
    }
};

window.selectAdminChat = async (msg) => {
    activeAdminChatId = msg.id;
    const headerName = document.getElementById('active-chat-user');
    const headerStatus = document.getElementById('active-chat-status');
    const input = document.getElementById('admin-chat-input');
    const sendBtn = document.getElementById('admin-chat-send-btn');

    headerName.textContent = msg.name;
    headerStatus.textContent = msg.email;
    input.disabled = false;
    sendBtn.disabled = false;
    
    // Refresh sidebar to show active state
    loadAdminMessages();

    // Mark as read if unread
    if (msg.status === 'unread') {
        await fetch(`${API_URL}/admin/messages/${msg.id}/read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }

    renderAdminChatBody(msg);
};

const renderAdminChatBody = (msg) => {
    const body = document.getElementById('admin-chat-body');
    if (!body) return;

    body.innerHTML = '';
    
    // Original message
    const origDiv = document.createElement('div');
    origDiv.className = 'chat-msg bot'; 
    origDiv.style.background = 'rgba(255,255,255,0.05)';
    origDiv.innerHTML = `
        <div>${msg.message}</div>
        <small>${new Date(msg.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>
    `;
    body.appendChild(origDiv);

    // Replies
    const replies = msg.replies || [];
    replies.forEach(r => {
        const replyDiv = document.createElement('div');
        replyDiv.className = r.sender === 'admin' ? 'chat-msg user' : 'chat-msg bot';
        replyDiv.innerHTML = `
            <div>${r.message}</div>
            <small>${new Date(r.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>
        `;
        body.appendChild(replyDiv);
    });

    body.scrollTop = body.scrollHeight;
};

window.sendAdminReply = async () => {
    const input = document.getElementById('admin-chat-input');
    if (!input || !input.value.trim() || !activeAdminChatId) return;

    const message = input.value.trim();
    input.value = '';

    try {
        const res = await fetch(`${API_URL}/messages/${activeAdminChatId}/reply`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message })
        });

        if (res.ok) {
            loadAdminMessages();
        }
    } catch (err) {
        showNotification('Failed to send reply', 'error');
    }
};

window.markMessageRead = async (id) => {
    try {
        const res = await fetch(`${API_URL}/admin/messages/${id}/read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showNotification('Message marked as read', 'success');
            loadAdminMessages();
        }
    } catch (err) {
        showSystemAlert('Connection error', 'Error', '🌐');
    }
};

window.viewMessage = (id, name, email, message) => {
    showSystemAlert(`From: ${name} (${email})\n\nMessage:\n${message}`, 'Contact Message', '📩');
    markMessageRead(id);
};

window.replyToMessage = (id, name, originalMsg) => {
    const modal = document.getElementById('admin-reply-modal');
    const nameEl = document.getElementById('reply-user-name');
    const msgEl = document.getElementById('reply-original-msg');
    const replyInput = document.getElementById('admin-reply-text');
    const submitBtn = document.getElementById('admin-reply-submit-btn');

    if (!modal || !replyInput || !submitBtn) return;

    nameEl.textContent = name;
    msgEl.textContent = `"${originalMsg}"`;
    replyInput.value = '';
    modal.classList.remove('hidden');
    setTimeout(() => replyInput.focus(), 100);

    submitBtn.onclick = async () => {
        const reply = replyInput.value.trim();
        if (!reply) {
            showNotification('Please enter a reply', 'error');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';

        try {
            const res = await fetch(`${API_URL}/messages/${id}/reply`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: reply })
            });

            if (res.ok) {
                modal.classList.add('hidden');
                showNotification('Reply sent successfully!', 'success');
                loadAdminMessages();
            } else {
                showNotification('Failed to send reply', 'error');
            }
        } catch (err) {
            showNotification('Connection error', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Reply';
        }
    };
};

// --- Custom Notification System ---
window.showSystemAlert = (message, title = 'System Message', icon = '🔔', showCancel = false) => {
    const modal = document.getElementById('system-alert-modal');
    const titleEl = document.getElementById('alert-title');
    const msgEl = document.getElementById('alert-message');
    const iconEl = document.getElementById('alert-icon');
    const okBtn = document.getElementById('alert-ok-btn');
    const cancelBtn = document.getElementById('alert-cancel-btn');

    titleEl.textContent = title;
    msgEl.textContent = message;
    
    if (icon === '🔔') {
        if (message.toLowerCase().includes('success')) icon = '✅';
        else if (message.toLowerCase().includes('error') || message.toLowerCase().includes('failed') || message.toLowerCase().includes('not match')) icon = '❌';
        else if (message.toLowerCase().includes('wait') || message.toLowerCase().includes('processing')) icon = '⏳';
        else if (showCancel) icon = '❓';
    }
    iconEl.textContent = icon;

    if (showCancel) {
        cancelBtn.classList.remove('hidden');
        okBtn.textContent = 'Confirm';
    } else {
        cancelBtn.classList.add('hidden');
        okBtn.textContent = 'OK';
    }

    modal.classList.remove('hidden');

    return new Promise((resolve) => {
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

window.showNotification = (message, type = 'success') => {
    const container = document.getElementById('notification-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `notification-toast ${type}`;
    const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : '🔔');
    toast.innerHTML = `
        <span class="notif-icon">${icon}</span>
        <span class="notif-msg">${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
};

// Auto-init if token exists
if (token) initDashboard();