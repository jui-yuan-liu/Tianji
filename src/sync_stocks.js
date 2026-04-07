const db = require('./db');

async function syncStocks() {
    try {
        console.log('Fetching stock list with setup dates using fetch...');
        // 使用證交所公司基本資料 API (t187ap03_L) 獲取成立日期與上市日期
        const response = await fetch('https://openapi.twse.com.tw/v1/opendata/t187ap03_L');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const stocks = await response.json();

        console.log(`Found ${stocks.length} stocks. Updating database...`);

        const insert = db.prepare(`
            INSERT OR REPLACE INTO tw_stocks (code, name, industry, setupYear, setupMonth, setupDay) 
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        const transaction = db.transaction((stockList) => {
            for (const stock of stockList) {
                const code = stock['公司代號'];
                const name = stock['公司名稱'];
                const industry = stock['產業別'];
                const setupDateStr = stock['成立日期']; // 格式 YYYYMMDD
                
                let sYear = null, sMonth = null, sDay = null;
                if (setupDateStr && setupDateStr.length === 8) {
                    sYear = parseInt(setupDateStr.substring(0, 4));
                    sMonth = parseInt(setupDateStr.substring(4, 6));
                    sDay = parseInt(setupDateStr.substring(6, 8));
                }

                if (code && name) {
                    insert.run(code, name, industry, sYear, sMonth, sDay);
                }
            }
        });

        transaction(stocks);
        console.log('Stock database sync with setup dates complete.');
    } catch (error) {
        console.error('Error syncing stocks:', error.message);
    }
}

if (require.main === module) {
    syncStocks();
}

module.exports = syncStocks;
