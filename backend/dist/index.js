"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const nodemailer_1 = __importDefault(require("nodemailer"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';
// Email Transporter Configuration
const transporter = nodemailer_1.default.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
const sendEmail = (to, subject, text, html) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to,
            subject,
            text,
            html
        });
        console.log(`Email sent to: ${to}`);
        return true;
    }
    catch (error) {
        console.error(`Failed to send email to ${to}:`, error);
        return false;
    }
});
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const dataFile = path_1.default.join(__dirname, '../data.json');
let users = [];
let cardRequests = [];
let contactMessages = [];
let pendingOTPs = [];
const loadData = () => {
    try {
        if (fs_1.default.existsSync(dataFile)) {
            const fileData = fs_1.default.readFileSync(dataFile, 'utf8');
            const parsedData = JSON.parse(fileData);
            users = parsedData.users || [];
            cardRequests = parsedData.cardRequests || [];
            contactMessages = parsedData.contactMessages || [];
            console.log('Data loaded from data.json');
        }
        else {
            seedUsers();
            saveData();
        }
    }
    catch (error) {
        console.error('Error loading data:', error);
        seedUsers();
    }
};
const saveData = () => {
    try {
        const dataToSave = { users, cardRequests, contactMessages };
        fs_1.default.writeFileSync(dataFile, JSON.stringify(dataToSave, null, 2), 'utf8');
    }
    catch (error) {
        console.error('Error saving data:', error);
    }
};
// Seed dummy users for testing
const seedUsers = () => {
    const passwordHash = bcryptjs_1.default.hashSync('admin123', 10);
    // Admin User
    users.push({
        id: 'admin-id',
        name: 'Neo Admin',
        email: 'admin@neobank.com',
        passwordHash,
        balance: 1000000,
        hasCard: true,
        cardDetails: {
            number: '4532 7812 9901 8888',
            expiry: '12/28',
            cvv: '123'
        },
        transactions: [
            {
                id: 'tx-1',
                type: 'Deposit',
                amount: 1000000,
                date: new Date().toISOString(),
                description: 'Initial Balance'
            }
        ]
    });
    // Second Test User
    users.push({
        id: 'user-2-id',
        name: 'Test Receiver',
        email: 'zmin@gmail.com',
        passwordHash: bcryptjs_1.default.hashSync('password123', 10),
        balance: 5000,
        hasCard: false,
        transactions: [
            {
                id: 'tx-2',
                type: 'Deposit',
                amount: 5000,
                date: new Date().toISOString(),
                description: 'Initial Balance'
            }
        ]
    });
    console.log('Test users seeded:');
    console.log('- admin@neobank.com (password: admin123)');
    console.log('- zmin@gmail.com (password: password123)');
};
loadData();
// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);
// Middleware for Auth
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        console.log('No token provided');
        return res.status(401).json({ message: 'Unauthorized' });
    }
    jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.log('Token verification failed:', err.message);
            return res.status(403).json({ message: 'Forbidden' });
        }
        req.user = user;
        next();
    });
};
// --- AUTH ROUTES ---
// Send OTP
app.post('/api/send-otp', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    if (!email)
        return res.status(400).json({ message: 'Email is required' });
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiry
    // Remove existing OTP for this email
    pendingOTPs = pendingOTPs.filter(p => p.email !== email);
    // Store new OTP
    pendingOTPs.push({ email, otp, expiresAt });
    // Send Actual Email
    const subject = 'Your Verification Code - NEO BANK';
    const text = `Your verification code is: ${otp}. This code will expire in 5 minutes.`;
    const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #00df81; border-radius: 10px; background-color: #010202; color: #e2e8f0;">
      <h2 style="color: #00df81;">NEO BANK</h2>
      <p>Hello,</p>
      <p>Your verification code is:</p>
      <h1 style="color: #00df81; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
      <p>This code will expire in <b>5 minutes</b>. Please do not share this code with anyone.</p>
      <hr style="border: 0; border-top: 1px solid rgba(0,223,129,0.2);">
      <p style="font-size: 12px; color: #94a3b8;">This is an automated message. Please do not reply.</p>
    </div>
  `;
    const sent = yield sendEmail(email, subject, text, html);
    if (sent) {
        res.json({ message: 'OTP sent successfully' });
    }
    else {
        // If real email fails, still show in console for dev purposes
        console.log(`[OTP Backup Log] To: ${email} | Code: ${otp}`);
        res.status(500).json({ message: 'Failed to send email. Please check server configuration.' });
    }
}));
// Submit Contact Message
app.post('/api/contact', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, message, userId } = req.body;
    if (!name || !email || !message) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    const newMessage = {
        id: generateId(),
        userId,
        name,
        email,
        message,
        date: new Date().toISOString(),
        status: 'unread',
        replies: []
    };
    contactMessages.push(newMessage);
    saveData();
    // If it's a password change request, send a confirmation email to the user
    if (message.includes('PASSWORD CHANGE REQUEST')) {
        const subject = 'Password Change Request Received - NEO BANK';
        const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #00df81; border-radius: 10px; background-color: #010202; color: #e2e8f0;">
        <h2 style="color: #00df81;">NEO BANK</h2>
        <p>Hello ${name},</p>
        <p>Natanggap namin ang iyong request para magpalit ng password.</p>
        <p style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 5px; border-left: 4px solid #00df81;">
          <b>Status:</b> Under Review by Admin
        </p>
        <p>Mangyaring maghintay ng karagdagang notipikasyon kapag na-approve na ang iyong request.</p>
        <hr style="border: 0; border-top: 1px solid rgba(0,223,129,0.2);">
        <p style="font-size: 12px; color: #94a3b8;">Kung hindi mo ginawa ang request na ito, mangyaring makipag-ugnayan agad sa aming support.</p>
      </div>
    `;
        yield sendEmail(email, subject, message, html);
    }
    console.log(`New contact message received from ${email}`);
    res.status(201).json({ message: 'Message sent successfully' });
}));
// Verify Password for Sensitive Actions
app.post('/api/verify-password', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { password } = req.body;
    const user = users.find(u => u.id === req.user.id);
    if (!user)
        return res.status(404).json({ message: 'User not found' });
    if (!password)
        return res.status(400).json({ message: 'Password is required' });
    const isMatch = yield bcryptjs_1.default.compare(password, user.passwordHash);
    if (isMatch) {
        res.json({ success: true });
    }
    else {
        res.status(401).json({ success: false, message: 'Incorrect password' });
    }
}));
// Get Messages for Current User
app.get('/api/user/messages', authenticateToken, (req, res) => {
    const userMessages = contactMessages.filter(m => m.userId === req.user.id);
    res.json(userMessages);
});
// Reply to a message (Authenticated - User or Admin)
app.post('/api/messages/:id/reply', authenticateToken, (req, res) => {
    const { message } = req.body;
    const msgId = req.params.id;
    const user = users.find(u => u.id === req.user.id);
    if (!user)
        return res.status(404).json({ message: 'User not found' });
    const contactMsg = contactMessages.find(m => m.id === msgId);
    if (!contactMsg)
        return res.status(404).json({ message: 'Message not found' });
    const isUserAdmin = user.email === 'admin@neobank.com';
    // Security check: User can only reply to their own messages, Admin can reply to any
    if (!isUserAdmin && contactMsg.userId !== user.id) {
        return res.status(403).json({ message: 'Forbidden' });
    }
    contactMsg.replies.push({
        sender: isUserAdmin ? 'admin' : 'user',
        message,
        date: new Date().toISOString()
    });
    if (isUserAdmin) {
        contactMsg.status = 'replied';
    }
    saveData();
    res.json(contactMsg);
});
// Register
app.post('/api/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, password, phoneNumber, otp } = req.body;
    console.log(`Register attempt for: ${email}`);
    // Validate OTP
    const pendingOTP = pendingOTPs.find(p => p.email === email);
    if (!pendingOTP) {
        return res.status(400).json({ message: 'Please request an OTP first' });
    }
    if (pendingOTP.otp !== otp) {
        return res.status(400).json({ message: 'Invalid OTP code' });
    }
    if (Date.now() > pendingOTP.expiresAt) {
        pendingOTPs = pendingOTPs.filter(p => p.email !== email);
        return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }
    // Remove OTP after successful verification
    pendingOTPs = pendingOTPs.filter(p => p.email !== email);
    if (phoneNumber) {
        if (!/^\d+$/.test(phoneNumber)) {
            return res.status(400).json({ message: 'Phone number must contain only numbers' });
        }
        if (phoneNumber.length !== 11) {
            return res.status(400).json({ message: 'Phone number must be exactly 11 digits' });
        }
    }
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ message: 'User already exists' });
    }
    const passwordHash = yield bcryptjs_1.default.hash(password, 10);
    const newUser = {
        id: generateId(),
        name,
        email,
        phoneNumber,
        passwordHash,
        balance: 0,
        transactions: [],
        hasCard: false
    };
    users.push(newUser);
    saveData();
    console.log(`User registered: ${email}`);
    res.status(201).json({ message: 'User registered successfully' });
}));
// Login
app.post('/api/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    console.log(`Login attempt for: ${email}`);
    const user = users.find(u => u.email === email);
    if (!user) {
        console.log(`User not found: ${email}`);
        return res.status(400).json({ message: 'Invalid credentials' });
    }
    const isPasswordValid = yield bcryptjs_1.default.compare(password, user.passwordHash);
    if (!isPasswordValid) {
        console.log(`Invalid password for: ${email}`);
        return res.status(400).json({ message: 'Invalid credentials' });
    }
    const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
    console.log(`Login successful for: ${email}`);
    res.json({ token, user: { name: user.name, email: user.email } });
}));
// --- BANKING ROUTES ---
// Get Profile & Balance
app.get('/api/profile', authenticateToken, (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    if (!user)
        return res.status(404).json({ message: 'User not found' });
    const { passwordHash } = user, userWithoutPassword = __rest(user, ["passwordHash"]);
    res.json(Object.assign(Object.assign({}, userWithoutPassword), { notifications: user.notifications || [] }));
});
// Update Profile
app.put('/api/profile', authenticateToken, (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    if (!user)
        return res.status(404).json({ message: 'User not found' });
    const { name, email, phoneNumber } = req.body;
    if (phoneNumber) {
        if (!/^\d+$/.test(phoneNumber)) {
            return res.status(400).json({ message: 'Phone number must contain only numbers' });
        }
        if (phoneNumber.length !== 11) {
            return res.status(400).json({ message: 'Phone number must be exactly 11 digits' });
        }
    }
    if (name)
        user.name = name;
    if (email)
        user.email = email;
    if (phoneNumber)
        user.phoneNumber = phoneNumber;
    saveData();
    res.json({ message: 'Profile updated', user: { name: user.name, email: user.email, phoneNumber: user.phoneNumber } });
});
// Deposit
app.post('/api/deposit', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { amount, password } = req.body;
    const user = users.find(u => u.id === req.user.id);
    if (!user)
        return res.status(404).json({ message: 'User not found' });
    if (!password)
        return res.status(400).json({ message: 'Password is required' });
    const isPasswordValid = yield bcryptjs_1.default.compare(password, user.passwordHash);
    if (!isPasswordValid)
        return res.status(401).json({ message: 'Incorrect password' });
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0)
        return res.status(400).json({ message: 'Invalid amount' });
    user.balance += numAmount;
    user.transactions.unshift({
        id: generateId(),
        type: 'Deposit',
        amount: numAmount,
        date: new Date().toISOString(),
        description: 'Cash Deposit'
    });
    saveData();
    res.json({ balance: user.balance, message: 'Deposit successful' });
}));
// Withdraw
app.post('/api/withdraw', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { amount, method, account, password } = req.body;
    const user = users.find(u => u.id === req.user.id);
    if (!user)
        return res.status(404).json({ message: 'User not found' });
    if (!password)
        return res.status(400).json({ message: 'Password is required' });
    const isPasswordValid = yield bcryptjs_1.default.compare(password, user.passwordHash);
    if (!isPasswordValid)
        return res.status(401).json({ message: 'Incorrect password' });
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0)
        return res.status(400).json({ message: 'Invalid amount' });
    if (user.balance < numAmount)
        return res.status(400).json({ message: 'Insufficient funds' });
    user.balance -= numAmount;
    user.transactions.unshift({
        id: generateId(),
        type: 'Withdraw',
        amount: numAmount,
        date: new Date().toISOString(),
        description: `Withdrawal via ${method} (${account})`
    });
    saveData();
    res.json({ balance: user.balance, message: 'Withdrawal successful' });
}));
// Transfer
app.post('/api/transfer', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { toEmail, amount, password } = req.body;
    console.log(`Transfer attempt from ${req.user.email} to ${toEmail} for amount ${amount}`);
    const sender = users.find(u => u.id === req.user.id);
    const receiver = users.find(u => u.email === toEmail || (u.phoneNumber && u.phoneNumber === toEmail));
    if (!sender) {
        console.log(`Transfer failed: Sender not found`);
        return res.status(404).json({ message: 'Sender not found' });
    }
    if (!password)
        return res.status(400).json({ message: 'Password is required' });
    const isPasswordValid = yield bcryptjs_1.default.compare(password, sender.passwordHash);
    if (!isPasswordValid)
        return res.status(401).json({ message: 'Incorrect password' });
    if (!receiver) {
        console.log(`Transfer failed: Receiver ${toEmail} not found`);
        return res.status(404).json({ message: 'Receiver not found' });
    }
    if (sender.email === receiver.email) {
        console.log(`Transfer failed: Cannot transfer to self`);
        return res.status(400).json({ message: 'Cannot transfer to yourself' });
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
        console.log(`Transfer failed: Invalid amount ${amount}`);
        return res.status(400).json({ message: 'Invalid amount' });
    }
    if (sender.balance < numAmount) {
        console.log(`Transfer failed: Insufficient funds (${sender.balance} < ${numAmount})`);
        return res.status(400).json({ message: 'Insufficient funds' });
    }
    sender.balance -= numAmount;
    receiver.balance += numAmount;
    const transactionId = generateId();
    sender.transactions.unshift({
        id: transactionId,
        type: 'Transfer',
        amount: numAmount,
        date: new Date().toISOString(),
        description: `Transfer to ${receiver.email}`,
        to: receiver.email
    });
    receiver.transactions.unshift({
        id: transactionId,
        type: 'Deposit',
        amount: numAmount,
        date: new Date().toISOString(),
        description: `Received from ${sender.email}`
    });
    if (!receiver.notifications)
        receiver.notifications = [];
    receiver.notifications.unshift({
        id: generateId(),
        message: `You received ₱${numAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} from ${sender.email}`,
        date: new Date().toISOString(),
        read: false
    });
    if (!sender.notifications)
        sender.notifications = [];
    sender.notifications.unshift({
        id: generateId(),
        message: `You sent ₱${numAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} to ${receiver.email}`,
        date: new Date().toISOString(),
        read: false
    });
    saveData();
    console.log(`Transfer successful: ${sender.email} -> ${receiver.email} (₱${numAmount})`);
    res.json({ balance: sender.balance, message: 'Transfer successful' });
}));
// Pay Bills
app.post('/api/pay-bill', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { biller, amount, password } = req.body;
    const user = users.find(u => u.id === req.user.id);
    if (!user)
        return res.status(404).json({ message: 'User not found' });
    if (!password)
        return res.status(400).json({ message: 'Password is required' });
    const isPasswordValid = yield bcryptjs_1.default.compare(password, user.passwordHash);
    if (!isPasswordValid)
        return res.status(401).json({ message: 'Incorrect password' });
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0)
        return res.status(400).json({ message: 'Invalid amount' });
    if (user.balance < numAmount)
        return res.status(400).json({ message: 'Insufficient funds' });
    user.balance -= numAmount;
    user.transactions.unshift({
        id: generateId(),
        type: 'Bill',
        amount: numAmount,
        date: new Date().toISOString(),
        description: `Bill Payment: ${biller}`
    });
    saveData();
    res.json({ balance: user.balance, message: 'Bill paid successfully' });
}));
// --- ADMIN ROUTES ---
// Submit Card Request
app.post('/api/card-request', authenticateToken, (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    if (!user)
        return res.status(404).json({ message: 'User not found' });
    if (user.hasCard) {
        return res.status(400).json({ message: 'You already have a virtual card' });
    }
    const existingRequest = cardRequests.find(r => r.userId === user.id && r.status === 'pending');
    if (existingRequest) {
        return res.status(400).json({ message: 'You already have a pending card request' });
    }
    const newRequest = {
        id: generateId(),
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        status: 'pending',
        date: new Date().toISOString()
    };
    cardRequests.push(newRequest);
    saveData();
    res.status(201).json({ message: 'Card requested successfully', request: newRequest });
});
// Get All Card Requests (Admin only)
app.get('/api/admin/card-requests', authenticateToken, (req, res) => {
    if (req.user.email !== 'admin@neobank.com') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    res.json(cardRequests.filter(r => r.status === 'pending'));
});
// Approve Card Request (Admin only)
app.post('/api/admin/approve-card', authenticateToken, (req, res) => {
    if (req.user.email !== 'admin@neobank.com') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    const { requestId } = req.body;
    const request = cardRequests.find(r => r.id === requestId);
    if (!request)
        return res.status(404).json({ message: 'Request not found' });
    const user = users.find(u => u.id === request.userId);
    if (!user)
        return res.status(404).json({ message: 'User not found' });
    request.status = 'approved';
    user.hasCard = true;
    user.cardDetails = {
        number: Array.from({ length: 4 }, () => Math.floor(1000 + Math.random() * 9000)).join(' '),
        expiry: '12/28',
        cvv: Math.floor(100 + Math.random() * 900).toString()
    };
    saveData();
    res.json({ message: 'Card request approved and card generated' });
});
// Reject Card Request (Admin only)
app.post('/api/admin/reject-card', authenticateToken, (req, res) => {
    if (req.user.email !== 'admin@neobank.com') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    const { requestId } = req.body;
    const request = cardRequests.find(r => r.id === requestId);
    if (!request)
        return res.status(404).json({ message: 'Request not found' });
    request.status = 'rejected';
    saveData();
    res.json({ message: 'Card request rejected' });
});
// Get All Users (Admin only)
app.get('/api/admin/users', authenticateToken, (req, res) => {
    // Simple check for admin email
    if (req.user.email !== 'admin@neobank.com') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    const userList = users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        balance: u.balance,
        transactionCount: u.transactions.length
    }));
    res.json(userList);
});
// Delete User (Admin only)
app.delete('/api/admin/users/:id', authenticateToken, (req, res) => {
    if (req.user.email !== 'admin@neobank.com') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    const { id } = req.params;
    const index = users.findIndex(u => u.id === id);
    if (index === -1) {
        return res.status(404).json({ message: 'User not found' });
    }
    // Prevent deleting self
    if (users[index].email === 'admin@neobank.com') {
        return res.status(400).json({ message: 'Cannot delete admin account' });
    }
    users.splice(index, 1);
    saveData();
    res.json({ message: 'User deleted successfully' });
});
// Get Admin Messages
app.get('/api/admin/messages', authenticateToken, (req, res) => {
    if (req.user.email !== 'admin@neobank.com') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    res.json(contactMessages);
});
// Mark Message as Read
app.put('/api/admin/messages/:id/read', authenticateToken, (req, res) => {
    if (req.user.email !== 'admin@neobank.com') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    const { id } = req.params;
    const message = contactMessages.find(m => m.id === id);
    if (!message) {
        return res.status(404).json({ message: 'Message not found' });
    }
    message.status = 'read';
    saveData();
    res.json({ message: 'Message marked as read' });
});
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
