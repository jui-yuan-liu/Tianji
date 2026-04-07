const db = require('./db');

/**
 * 人股命盤共振推薦引擎
 * 邏輯：
 * 1. 取得使用者財帛宮、田宅宮的「地支」與「主星」。
 * 2. 搜尋股票資料庫，尋找符合以下條件的股票：
 *    - 條件 A (星曜共振): 股票的命宮主星 = 使用者的財帛宮或田宅宮主星 (權重最高)。
 *    - 條件 B (宮位重疊): 股票的命宮地支 = 使用者的財帛宮或田宅宮地支。
 *    - 條件 C (五行相生): 使用者的五行局與股票的五行局相生。
 */
function recommendResonanceStocks(userNatalData) {
    const { wealthPalaceBranch, wealthStars, propertyPalaceBranch, propertyStars, bureau } = userNatalData;
    
    // 從資料庫抓取所有已預處理的股票特徵
    const stockFeatures = db.prepare('SELECT f.*, s.name FROM stock_features f JOIN tw_stocks s ON f.code = s.code').all();
    
    const results = stockFeatures.map(stock => {
        let score = 0;
        let reasons = [];

        const sLifeStars = stock.majorStars ? stock.majorStars.split(',') : [];
        const sLifeBranch = stock.lifePalaceBranch;
        
        // 1. 星曜共振 (使用者財帛宮主星與股票命宮主星感應)
        wealthStars.forEach(uStar => {
            if (sLifeStars.includes(uStar)) {
                score += 50;
                reasons.push(`${uStar}感應：此股命宮主星坐入您的財帛宮，具備強大財運同步率。`);
            }
        });

        // 2. 星曜共振 (使用者田宅宮主星與股票命宮主星感應)
        propertyStars.forEach(uStar => {
            if (sLifeStars.includes(uStar)) {
                score += 40;
                reasons.push(`${uStar}感應：此股命宮主星坐入您的田宅宮，有利於長期資產累積。`);
            }
        });

        // 3. 宮位地支共振
        if (sLifeBranch === wealthPalaceBranch) {
            score += 30;
            reasons.push(`地支共振：此股之「命」與您的「財」同在${sLifeBranch}宮。`);
        }
        if (sLifeBranch === propertyPalaceBranch) {
            score += 25;
            reasons.push(`地支共振：此股之「命」與您的「產」同在${sLifeBranch}宮。`);
        }

        // 4. 五行局相生 (簡化邏輯：相同加分，相生待擴充)
        if (stock.bureau === bureau) {
            score += 10;
            reasons.push(`氣場契合：兩者皆為${bureau}局。`);
        }

        return {
            code: stock.code,
            name: stock.name,
            score: score,
            reasons: reasons.slice(0, 2) // 取前兩個主因
        };
    });

    // 過濾無共振標的並排序
    return results
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
}

module.exports = { recommendResonanceStocks };
