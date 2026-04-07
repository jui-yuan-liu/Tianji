const db = require('./db');
const { getPalaceAdvice } = require('./ziwei_advice');

/**
 * 根據使用者的宮位星曜組合，推薦適合的台股標的類型。
 * 邏輯：
 * 1. 取得財帛宮、田宅宮的星曜。
 * 2. 判斷星曜屬性 (例如：武曲-金融/金屬, 太陽-能源/光電, 太陰-房地產/軟體)
 * 3. 匹配對應的台股板塊或特定代碼。
 */
function matchStocks(palaceData) {
    // 假設 palaceData 格式為 { 財帛宮: { stars: [...] }, 田宅宮: { stars: [...] } }
    const wealthStars = palaceData['財帛宮']?.stars || palaceData['財帛']?.stars || [];
    const propertyStars = palaceData['田宅宮']?.stars || palaceData['田宅']?.stars || [];
    
    const combinedStars = [...new Set([...wealthStars, ...propertyStars])];
    const recommendations = [];

    // 簡單的匹配邏輯
    const starToIndustryMap = {
        '紫微': ['0050', '2330'], // 權重股、龍頭
        '天機': ['2454', '2317'], // 高科技、組裝
        '太陽': ['6443', '6477'], // 太陽能、光電、能源
        '武曲': ['2881', '2882', '2002'], // 金融、鋼鐵
        '天同': ['2912', '5903'], // 百貨零售、民生
        '廉貞': ['2408', '2303'], // 半導體、精密電子
        '天府': ['0056', '2886'], // 配息、穩健、金融
        '太陰': ['2542', '2412'], // 房產、電信、軟體
        '貪狼': ['2633', '2707'], // 觀光、數位休閒
        '巨門': ['2412', '4904'], // 電信、通訊、研究
        '天相': ['2308', '2382'], // 服務、中介、代工
        '天梁': ['1760', '4147'], // 醫藥、生技、保險
        '七殺': ['2603', '2609'], // 航運、鋼鐵、重工
        '破軍': ['3008', '3406'], // 創新、光學、突破
    };

    const industries = [];
    combinedStars.forEach(star => {
        for (let key in starToIndustryMap) {
            if (star.includes(key)) {
                industries.push(...starToIndustryMap[key]);
            }
        }
    });

    const uniqueCodes = [...new Set(industries)].slice(0, 5); // 取前五名
    
    const stmt = db.prepare('SELECT code, name FROM tw_stocks WHERE code = ?');
    
    if (uniqueCodes.length === 0) {
        const defaultStock = stmt.get('0050') || { code: '0050', name: '元大台灣50' };
        return {
            status: 'neutral',
            reason: '命盤特徵不顯著，建議以大盤指數為主',
            stocks: [defaultStock]
        };
    }

    // 從資料庫查詢名稱
    const stocks = uniqueCodes.map(code => stmt.get(code)).filter(Boolean);

    return {
        status: 'matched',
        reason: '基於財帛宮與田宅宮主星特徵推薦',
        stocks: stocks
    };
}

module.exports = { matchStocks };
