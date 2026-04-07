const db = require('./db');
const { calculateLifePalace, getFullPalaceMapping } = require('./ziwei_core');
const { getFiveElementBureau, getZiWeiStarPosition, getTianFuStarPosition, getAllMajorStars } = require('./ziwei_stars');
const { Solar } = require('lunar-javascript');

/**
 * 為資料庫中的所有股票預先計算先天命盤特徵
 */
async function generateStockFeatures() {
    console.log('Generating stock features (natal charts)...');
    
    // 建立特徵表
    db.exec(`
        CREATE TABLE IF NOT EXISTS stock_features (
            code TEXT PRIMARY KEY,
            bureau INTEGER,
            lifePalaceBranch TEXT,
            majorStars TEXT,
            wealthPalaceStars TEXT,
            propertyPalaceStars TEXT
        );
    `);

    const stocks = db.prepare('SELECT * FROM tw_stocks WHERE setupYear IS NOT NULL').all();
    const insert = db.prepare(`
        INSERT OR REPLACE INTO stock_features (code, bureau, lifePalaceBranch, majorStars, wealthPalaceStars, propertyPalaceStars)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((stockList) => {
        for (const stock of stockList) {
            try {
                const { setupYear, setupMonth, setupDay, setupHour, code } = stock;
                
                // 1. Convert to Lunar
                const solar = Solar.fromYmd(setupYear, setupMonth, setupDay);
                const lunar = solar.getLunar();
                const lMonth = lunar.getMonth();
                const lDay = lunar.getDay();
                const lHour = setupHour || 12; // Default to Noon
                const yearGan = lunar.getYearGan();
                const yearGanIdx = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"].indexOf(yearGan);

                // 2. Calculate Chart
                const lifeIdx = calculateLifePalace(lMonth, lHour);
                const bureau = getFiveElementBureau(yearGanIdx, lifeIdx);
                const ziWeiPos = getZiWeiStarPosition(bureau, lDay);
                const tianFuPos = getTianFuStarPosition(ziWeiPos);
                const allStars = getAllMajorStars(ziWeiPos, tianFuPos);
                
                const palaceMap = getFullPalaceMapping(lifeIdx);
                const branches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
                
                // Extract Stars for key palaces
                const getStars = (pName) => {
                    const idx = Object.keys(palaceMap).find(k => palaceMap[k] === pName);
                    return allStars.filter(s => s.position === parseInt(idx)).map(s => s.name).join(',');
                };

                const lifeStars = getStars("命宮");
                const wealthStars = getStars("財帛");
                const propertyStars = getStars("田宅");

                insert.run(
                    code,
                    bureau,
                    branches[lifeIdx],
                    lifeStars,
                    wealthStars,
                    propertyStars
                );
            } catch (e) {
                // console.error(`Failed for ${stock.code}: ${e.message}`);
            }
        }
    });

    transaction(stocks);
    console.log(`Stock features generated for ${stocks.length} stocks.`);
}

if (require.main === module) {
    generateStockFeatures();
}

module.exports = generateStockFeatures;
