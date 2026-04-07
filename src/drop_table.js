const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(__dirname, '../tianji.db');
const db = new Database(dbPath);

try {
    db.exec('DROP TABLE IF EXISTS tw_stocks;');
    console.log('Table tw_stocks dropped.');
} catch (err) {
    console.error('Error dropping table:', err.message);
} finally {
    db.close();
}
