const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = 'tianji_secret_key_2026'; // Placeholder for demo

function registerUser(username, password, realName, birthYear, birthMonth, birthDay, birthHour) {
    const hash = bcrypt.hashSync(password, 10);
    const stmt = db.prepare('INSERT INTO users (username, password, realName, birthYear, birthMonth, birthDay, birthHour) VALUES (?, ?, ?, ?, ?, ?, ?)');
    try {
        const info = stmt.run(username, hash, realName, birthYear, birthMonth, birthDay, birthHour);
        return { success: true, userId: info.lastInsertRowid };
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return { success: false, error: 'Username already exists' };
        }
        throw err;
    }
}

function loginUser(username, password) {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    const user = stmt.get(username);
    if (!user) return { success: false, error: 'Invalid credentials' };

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) return { success: false, error: 'Invalid credentials' };

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    return { success: true, token, user: { id: user.id, username: user.username, realName: user.realName, birthYear: user.birthYear, birthMonth: user.birthMonth, birthDay: user.birthDay, birthHour: user.birthHour } };
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

function getUserProfile(userId) {
    const stmt = db.prepare('SELECT id, username, realName, birthYear, birthMonth, birthDay, birthHour FROM users WHERE id = ?');
    return stmt.get(userId);
}

module.exports = { registerUser, loginUser, authenticateToken, getUserProfile };
