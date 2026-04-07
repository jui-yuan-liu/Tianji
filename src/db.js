const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(__dirname, '../tianji.db');
const db = new Database(dbPath, { verbose: console.log });

// Initialize DB schema
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        realName TEXT,
        birthYear INTEGER,
        birthMonth INTEGER,
        birthDay INTEGER,
        birthHour INTEGER
    );

    CREATE TABLE IF NOT EXISTS tw_stocks (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        industry TEXT,
        description TEXT,
        setupYear INTEGER,
        setupMonth INTEGER,
        setupDay INTEGER,
        setupHour INTEGER DEFAULT 12
    );

    CREATE TABLE IF NOT EXISTS stock_features (
        code TEXT PRIMARY KEY,
        bureau INTEGER,
        lifePalaceBranch TEXT,
        majorStars TEXT,
        wealthPalaceStars TEXT,
        propertyPalaceStars TEXT
    );
`);

module.exports = db;
