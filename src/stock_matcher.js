const db = require('./db');
const {
    STAR_INVESTMENT_GUIDE,
    PALACE_INVEST_GUIDE,
    STOCK_MATCH_METHODOLOGY,
} = require('../public/star_investment_guide.js');

function normalizePalaceKey(palaceLabel) {
    if (!palaceLabel) return '財帛';
    return String(palaceLabel).replace(/宮$/, '');
}

function buildMatchEntry(starName, palaceLabel, branch) {
    const meta = STAR_INVESTMENT_GUIDE[starName];
    if (!meta) return null;
    const palaceKey = normalizePalaceKey(palaceLabel);
    return {
        palace: palaceKey,
        palaceDesc: PALACE_INVEST_GUIDE[palaceKey] || '',
        branch: branch || '',
        star: starName,
        starTitle: meta.title,
        starGlossary: meta.glossary,
        invest: meta.invest,
        industries: meta.industries,
        line: `${palaceKey}宮${branch ? `（${branch}）` : ''}見「${starName}」${meta.title} → ${meta.industries}`,
    };
}

function buildReasonDetail(codeMatches, context) {
    const {
        periodLabel = '本命',
        wealthBranch = '',
        propertyBranch = '',
    } = context;

    const uniqueMatches = [];
    const seen = new Set();
    codeMatches.forEach((entry) => {
        const key = `${entry.palace}:${entry.star}`;
        if (seen.has(key)) return;
        seen.add(key);
        uniqueMatches.push(entry);
    });

    return {
        periodLabel,
        wealthBranch,
        propertyBranch,
        matches: uniqueMatches,
        methodology: STOCK_MATCH_METHODOLOGY,
    };
}

/**
 * 根據財帛／田宅宮星曜推薦台股，並附與排盤室辭典一致的詳細推薦原因
 */
function matchStocks(palaceData, context = {}) {
    const wealthStars = palaceData['財帛宮']?.stars || palaceData['財帛']?.stars || [];
    const propertyStars = palaceData['田宅宮']?.stars || palaceData['田宅']?.stars || [];
    const wealthBranch = context.wealthBranch || palaceData['財帛宮']?.branch || palaceData['財帛']?.branch || '';
    const propertyBranch = context.propertyBranch || palaceData['田宅宮']?.branch || palaceData['田宅']?.branch || '';

    const codeReasons = {};
    const codeMatchEntries = {};

    const collectMatches = (stars, palaceLabel, branch) => {
        stars.forEach((starStr) => {
            const starBase = String(starStr).split(' ')[0].replace(/[祿權科忌]/g, '').trim();
            for (const [starName, meta] of Object.entries(STAR_INVESTMENT_GUIDE)) {
                if (!starBase.includes(starName)) continue;
                const entry = buildMatchEntry(starName, palaceLabel, branch);
                if (!entry) continue;

                meta.codes.forEach((code) => {
                    if (!codeReasons[code]) codeReasons[code] = [];
                    if (!codeReasons[code].includes(entry.line)) {
                        codeReasons[code].push(entry.line);
                    }
                    if (!codeMatchEntries[code]) codeMatchEntries[code] = [];
                    const dupKey = `${entry.palace}:${entry.star}`;
                    if (!codeMatchEntries[code].some((e) => `${e.palace}:${e.star}` === dupKey)) {
                        codeMatchEntries[code].push(entry);
                    }
                });
            }
        });
    };

    collectMatches(wealthStars, '財帛', wealthBranch);
    collectMatches(propertyStars, '田宅', propertyBranch);

    const stmt = db.prepare('SELECT code, name FROM tw_stocks WHERE code = ?');

    if (Object.keys(codeReasons).length === 0) {
        const defaultStock = stmt.get('0050') || { code: '0050', name: '元大台灣50' };
        const neutralDetail = {
            periodLabel: context.periodLabel || '本命',
            wealthBranch,
            propertyBranch,
            matches: [],
            methodology: STOCK_MATCH_METHODOLOGY,
            neutral: true,
            neutralReason:
                '財帛／田宅無明顯主星對應產業。依排盤室指南，此時宜以大盤指數為中性配置參考。',
        };
        return {
            status: 'neutral',
            reason: '命盤特徵不顯著，建議以大盤指數為主',
            stocks: [{
                ...defaultStock,
                reason: '財帛／田宅無明顯主星 → 改推薦大盤型 ETF（與排盤室：星曜不顯著時保守觀望一致）',
                reasonDetail: neutralDetail,
            }],
        };
    }

    const stocks = Object.keys(codeReasons)
        .slice(0, 5)
        .map((code) => {
            const row = stmt.get(code);
            if (!row) return null;
            const reasonDetail = buildReasonDetail(codeMatchEntries[code] || [], {
                ...context,
                wealthBranch,
                propertyBranch,
            });
            return {
                ...row,
                reason: codeReasons[code].join('；'),
                reasonDetail,
            };
        })
        .filter(Boolean);

    return {
        status: 'matched',
        reason: '依排盤室辭典：財帛宮（資金運用）與田宅宮（資產庫存）主星定性產業方向',
        stocks,
    };
}

module.exports = { matchStocks };
