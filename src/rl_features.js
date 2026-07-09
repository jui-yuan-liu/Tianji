/**
 * Tianji RL Feature Schema v3 — 可選特徵模組
 */
const { calculateLifePalace, calculateWealthPalace } = require('./ziwei_core');
const { getFiveElementBureau, getZiWeiStarPosition, getTianFuStarPosition, getAllMajorStars } = require('./ziwei_stars');
const { getAnnualLifePalace, getAnnualTransformations } = require('./ziwei_annual');
const { getDecadeLifePalace, getMonthlyLifePalace, getDailyLifePalace, getTimeTransformations } = require('./ziwei_periods');
const { Solar } = require('lunar-javascript');

const FEATURE_SCHEMA_VERSION = 3;

const MAJOR_STAR_NAMES = ['紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍'];
const WEALTH_STARS = ['武曲', '太陰', '天府'];
const RISK_STARS = ['破軍', '七殺', '貪狼'];

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

const FEATURE_CATALOG = {
    price_momentum: {
        size: 2,
        label: '價格動能',
        category: 'technical',
        categoryLabel: '技術指標',
        default: true,
        tower: 'market',
        hint: '價格位階與日漲跌幅，反映當前市場位階與短期動能。',
    },
    moving_average: {
        size: 2,
        label: '移動平均',
        category: 'technical',
        categoryLabel: '技術指標',
        default: true,
        tower: 'market',
        hint: 'MA5 / MA20 偏離度，衡量短中期趨勢方向。',
    },
    volatility: {
        size: 1,
        label: '波動率',
        category: 'technical',
        categoryLabel: '技術指標',
        default: true,
        tower: 'market',
        hint: '近 20 日報酬率標準差，衡量市場風險水準。',
    },
    rsi: {
        size: 1,
        label: 'RSI',
        category: 'technical',
        categoryLabel: '技術指標',
        default: false,
        tower: 'market',
        hint: '14 日相對強弱指標，辨識超買超賣區間。',
    },
    volume_change: {
        size: 1,
        label: '成交量變化',
        category: 'volume',
        categoryLabel: '量價數據',
        default: true,
        tower: 'market',
        hint: '相對前日的成交量增減幅度。',
    },
    volume_level: {
        size: 1,
        label: '量能位階',
        category: 'volume',
        categoryLabel: '量價數據',
        default: false,
        tower: 'market',
        hint: '當日成交量在近 20 日區間中的相對水準。',
    },
    price_volume_corr: {
        size: 1,
        label: '量價連動',
        category: 'volume',
        categoryLabel: '量價數據',
        default: false,
        tower: 'market',
        hint: '近期價格與成交量同向變動的傾向。',
    },
    portfolio: {
        size: 2,
        label: '持倉狀態',
        category: 'portfolio',
        categoryLabel: '持倉狀態',
        default: true,
        required: true,
        tower: 'market',
        hint: '現金與持倉佔初始資金比例，RL 必備特徵。',
    },
    natal: {
        size: 9,
        label: '生辰命盤',
        category: 'natal',
        categoryLabel: '生辰命盤',
        default: true,
        tower: 'meta',
        hint: '命宮、財帛宮、五行局與四柱干支。',
    },
    decade_wealth: {
        size: 8,
        label: '大運財帛',
        category: 'period',
        categoryLabel: '流年流月流日',
        default: true,
        tower: 'meta',
        hint: '大運層級財帛宮的四化與主星象。',
    },
    annual_wealth: {
        size: 8,
        label: '流年財帛',
        category: 'period',
        categoryLabel: '流年流月流日',
        default: true,
        tower: 'meta',
        hint: '流年層級財帛宮的四化與主星象。',
    },
    monthly_wealth: {
        size: 8,
        label: '流月財帛',
        category: 'period',
        categoryLabel: '流年流月流日',
        default: true,
        tower: 'meta',
        hint: '流月層級財帛宮的四化與主星象。',
    },
    daily_wealth: {
        size: 8,
        label: '流日財帛',
        category: 'period',
        categoryLabel: '流年流月流日',
        default: true,
        tower: 'meta',
        hint: '流日層級財帛宮的四化與主星象，與靜態策略核心對齊。',
    },
    calendar: {
        size: 2,
        label: '農曆節律',
        category: 'calendar',
        categoryLabel: '農曆節律',
        default: true,
        tower: 'meta',
        hint: '農曆月份與日期正規化值。',
    },
    moon_cycle: {
        size: 4,
        label: '滿月週期',
        category: 'calendar',
        categoryLabel: '滿月週期',
        default: false,
        tower: 'meta',
        hint: '農曆月相週期編碼（日序、sin/cos 相位、滿月接近度）。',
    },
};

const FEATURE_ORDER = Object.keys(FEATURE_CATALOG);

/** v2 固定 51 維模型的特徵配置（向後相容） */
const LEGACY_V2_CONFIG = {
    price_momentum: true,
    moving_average: true,
    volatility: true,
    rsi: false,
    volume_change: true,
    volume_level: false,
    price_volume_corr: false,
    portfolio: true,
    natal: true,
    decade_wealth: true,
    annual_wealth: true,
    monthly_wealth: true,
    daily_wealth: true,
    calendar: true,
    moon_cycle: false,
};

function norm(v, min = 0, max = 1) {
    if (max === min) return 0;
    return Math.max(0, Math.min(1, (v - min) / (max - min)));
}

function clamp(v, lo = -1, hi = 1) {
    return Math.max(lo, Math.min(hi, v));
}

function getDefaultFeatureConfig() {
    const cfg = {};
    for (const [key, meta] of Object.entries(FEATURE_CATALOG)) {
        cfg[key] = meta.default;
    }
    cfg.portfolio = true;
    return cfg;
}

function normalizeFeatureConfig(config) {
    const cfg = getDefaultFeatureConfig();
    if (!config) return cfg;
    for (const key of FEATURE_ORDER) {
        if (config[key] !== undefined) cfg[key] = Boolean(config[key]);
    }
    cfg.portfolio = true;
    return cfg;
}

function parseFeatureConfig(input) {
    if (!input) return getDefaultFeatureConfig();
    if (typeof input === 'object' && !Array.isArray(input)) {
        return normalizeFeatureConfig(input);
    }
    const enabled = String(input).split(',').map(s => s.trim()).filter(Boolean);
    const cfg = {};
    for (const key of FEATURE_ORDER) {
        cfg[key] = enabled.includes(key);
    }
    cfg.portfolio = true;
    return cfg;
}

function resolveFeatureConfig(modelMeta) {
    if (modelMeta?.enabledFeatures) {
        return normalizeFeatureConfig(modelMeta.enabledFeatures);
    }
    if (modelMeta?.featureSchemaVersion === 2 || modelMeta?.stateSize === 51) {
        return { ...LEGACY_V2_CONFIG };
    }
    return getDefaultFeatureConfig();
}

function getStateSize(featureConfig) {
    const cfg = normalizeFeatureConfig(featureConfig);
    let size = 0;
    for (const key of FEATURE_ORDER) {
        if (cfg[key]) size += FEATURE_CATALOG[key].size;
    }
    return size;
}

function getMarketDim(featureConfig) {
    const cfg = normalizeFeatureConfig(featureConfig);
    let dim = 0;
    for (const key of FEATURE_ORDER) {
        if (cfg[key] && FEATURE_CATALOG[key].tower === 'market') {
            dim += FEATURE_CATALOG[key].size;
        }
    }
    return dim;
}

function buildFeatureIndexMap(featureConfig) {
    const cfg = normalizeFeatureConfig(featureConfig);
    const map = {};
    let idx = 0;
    for (const key of FEATURE_ORDER) {
        if (cfg[key]) {
            map[key] = { start: idx, size: FEATURE_CATALOG[key].size };
            idx += FEATURE_CATALOG[key].size;
        }
    }
    return map;
}

function getFeatureCatalogForUI() {
    const categories = {};
    for (const [key, meta] of Object.entries(FEATURE_CATALOG)) {
        if (!categories[meta.category]) {
            categories[meta.category] = {
                id: meta.category,
                label: meta.categoryLabel,
                features: [],
            };
        }
        categories[meta.category].features.push({
            key,
            label: meta.label,
            size: meta.size,
            default: meta.default,
            required: meta.required || false,
            hint: meta.hint,
        });
    }
    return {
        schemaVersion: FEATURE_SCHEMA_VERSION,
        categories: Object.values(categories),
        defaults: getDefaultFeatureConfig(),
        order: FEATURE_ORDER,
    };
}

function getEnabledFeatureGroups(featureConfig) {
    const cfg = normalizeFeatureConfig(featureConfig);
    return FEATURE_ORDER
        .filter(key => cfg[key])
        .map(key => ({
            name: key,
            size: FEATURE_CATALOG[key].size,
            label: FEATURE_CATALOG[key].label,
            category: FEATURE_CATALOG[key].category,
        }));
}

function buildNatalContext(userBirth) {
    const bYear = parseInt(userBirth.year, 10);
    const bMonth = parseInt(userBirth.month, 10);
    const bDay = parseInt(userBirth.day, 10);
    const bHour = parseInt(userBirth.hour, 10);
    const hourBranchIdx = Math.floor(((bHour + 1) % 24) / 2);

    const birthSolar = Solar.fromYmd(bYear, bMonth, bDay);
    const birthLunar = birthSolar.getLunar();
    const lifePalaceIdx = calculateLifePalace(birthLunar.getMonth(), hourBranchIdx);
    const wealthPalaceIdx = calculateWealthPalace(lifePalaceIdx);
    const yearGanIndex = GAN.indexOf(birthLunar.getYearGan());
    const fiveElementBureau = getFiveElementBureau(yearGanIndex, lifePalaceIdx);
    const ziWeiPos = getZiWeiStarPosition(fiveElementBureau, birthLunar.getDay());
    const tianFuPos = getTianFuStarPosition(ziWeiPos);
    const allStars = getAllMajorStars(ziWeiPos, tianFuPos);

    return {
        birthLunar,
        hourBranchIdx,
        lifePalaceIdx,
        wealthPalaceIdx,
        fiveElementBureau,
        allStars,
        yearGanIndex,
        yearZhiIndex: ZHI.indexOf(birthLunar.getYearZhi()),
        monthGanIndex: GAN.indexOf(birthLunar.getMonthGan()),
        dayGanIndex: GAN.indexOf(birthLunar.getDayGan()),
        dayZhiIndex: ZHI.indexOf(birthLunar.getDayZhi()),
        birthMonth: birthLunar.getMonth(),
    };
}

function computeRsi(closes, period = 14) {
    if (closes.length < period + 1) return 0.5;
    let gains = 0;
    let losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff >= 0) gains += diff;
        else losses -= diff;
    }
    if (losses === 0) return 1;
    const rs = gains / losses;
    return clamp((rs / (1 + rs) - 0.5) * 2, -1, 1);
}

function getPriceMomentumFeatures(marketData, step, maxPrice) {
    const today = marketData[step];
    const prev = step > 0 ? marketData[step - 1] : today;
    const priceNorm = today.close / maxPrice;
    const priceChangePct = clamp(prev.close > 0 ? (today.close - prev.close) / prev.close : 0, -0.15, 0.15) / 0.15;
    return [priceNorm, priceChangePct];
}

function getMovingAverageFeatures(marketData, step) {
    const today = marketData[step];
    const closes = marketData.slice(Math.max(0, step - 19), step + 1).map(d => d.close);
    const ma5 = closes.length >= 5 ? closes.slice(-5).reduce((a, b) => a + b, 0) / 5 : today.close;
    const ma20 = closes.length >= 1 ? closes.reduce((a, b) => a + b, 0) / closes.length : today.close;
    return [
        clamp((today.close / ma5 - 1) / 0.1, -1, 1),
        clamp((today.close / ma20 - 1) / 0.15, -1, 1),
    ];
}

function getVolatilityFeature(marketData, step) {
    const closes = marketData.slice(Math.max(0, step - 19), step + 1).map(d => d.close);
    let volatility = 0;
    if (closes.length >= 3) {
        const rets = [];
        for (let i = 1; i < closes.length; i++) {
            rets.push((closes[i] - closes[i - 1]) / closes[i - 1]);
        }
        const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
        volatility = Math.sqrt(rets.reduce((s, r) => s + (r - mean) ** 2, 0) / rets.length);
    }
    return [clamp(volatility / 0.03, 0, 1)];
}

function getRsiFeature(marketData, step) {
    const closes = marketData.slice(Math.max(0, step - 30), step + 1).map(d => d.close);
    return [computeRsi(closes)];
}

function getVolumeChangeFeature(marketData, step) {
    const today = marketData[step];
    const prev = step > 0 ? marketData[step - 1] : today;
    let volumeChange = 0;
    if (today.volume != null && prev.volume) {
        volumeChange = clamp((today.volume - prev.volume) / prev.volume / 2, -1, 1);
    }
    return [volumeChange];
}

function getVolumeLevelFeature(marketData, step) {
    const today = marketData[step];
    const window = marketData.slice(Math.max(0, step - 19), step + 1);
    const maxVol = Math.max(...window.map(d => d.volume || 0), 1);
    const volumeLevel = today.volume != null ? clamp(today.volume / maxVol, 0, 1) : 0;
    return [volumeLevel];
}

function getPriceVolumeCorrFeature(marketData, step) {
    const window = marketData.slice(Math.max(0, step - 9), step + 1);
    let pvCorr = 0;
    if (window.length >= 5) {
        let sum = 0;
        let count = 0;
        for (let i = 1; i < window.length; i++) {
            const dp = window[i].close - window[i - 1].close;
            const dv = (window[i].volume || 0) - (window[i - 1].volume || 0);
            if (dp !== 0 && dv !== 0) {
                sum += Math.sign(dp) === Math.sign(dv) ? 1 : -1;
                count++;
            }
        }
        pvCorr = count > 0 ? sum / count : 0;
    }
    return [pvCorr];
}

function getPortfolioFeatures(capital, shares, price, initialCapital) {
    return [
        capital / initialCapital,
        (shares * price) / initialCapital,
    ];
}

function getNatalFeatures(ctx) {
    return [
        ctx.lifePalaceIdx / 11,
        ctx.wealthPalaceIdx / 11,
        norm(ctx.fiveElementBureau, 2, 6),
        ctx.yearGanIndex / 9,
        ctx.yearZhiIndex / 11,
        ctx.monthGanIndex / 9,
        ctx.dayGanIndex / 9,
        ctx.dayZhiIndex / 11,
        ctx.hourBranchIdx / 11,
    ];
}

function starsAtPalace(allStars, palacePos) {
    return allStars.filter(s => s.position === palacePos).map(s => s.name);
}

function getWealthPalaceFeatures(allStars, lifePos, stemForTrans) {
    const wealthPos = calculateWealthPalace(lifePos);
    const stars = starsAtPalace(allStars, wealthPos);
    const trans = getTimeTransformations(stemForTrans) || getAnnualTransformations(stemForTrans) || {};

    return [
        wealthPos / 11,
        stars.includes(trans.lu) ? 1 : 0,
        stars.includes(trans.quan) ? 1 : 0,
        stars.includes(trans.ke) ? 1 : 0,
        stars.includes(trans.ji) ? 1 : 0,
        Math.min(stars.length, 5) / 5,
        stars.some(s => WEALTH_STARS.includes(s)) ? 1 : 0,
        stars.some(s => RISK_STARS.includes(s)) ? 1 : 0,
    ];
}

function getPeriodContext(targetDate, ctx) {
    const solar = Solar.fromYmd(targetDate.getFullYear(), targetDate.getMonth() + 1, targetDate.getDate());
    const lunar = solar.getLunar();
    const virtualAge = solar.getYear() - ctx.birthLunar.getYear() + 1;

    const yearBranchIdx = (targetDate.getFullYear() - 4) % 12;
    const annualLifePos = getAnnualLifePalace(yearBranchIdx);
    const monthlyLifePos = getMonthlyLifePalace(annualLifePos, ctx.birthMonth, ctx.hourBranchIdx, lunar.getMonth());
    const dailyLifePos = getDailyLifePalace(monthlyLifePos, lunar.getDay());
    const decadeLifePos = getDecadeLifePalace(ctx.lifePalaceIdx, ctx.fiveElementBureau, virtualAge, 1);

    return {
        lunar,
        solar,
        annualLifePos,
        monthlyLifePos,
        dailyLifePos,
        decadeLifePos,
        yearStem: lunar.getYearGan(),
        monthStem: lunar.getMonthGan(),
        dayStem: lunar.getDayGan(),
    };
}

function getCalendarFeatures(period) {
    return [
        period.lunar.getMonth() / 12,
        period.lunar.getDay() / 30,
    ];
}

function getMoonCycleFeatures(period) {
    const day = period.lunar.getDay();
    const phase = (2 * Math.PI * day) / 29.53059;
    const distToFull = Math.abs(day - 15) / 15;
    return [
        day / 30,
        Math.sin(phase),
        Math.cos(phase),
        1 - distToFull,
    ];
}

function buildStateVector({ marketData, step, maxPrice, capital, shares, initialCapital, natalCtx, featureConfig }) {
    const cfg = normalizeFeatureConfig(featureConfig);
    const today = marketData[step];
    const period = getPeriodContext(new Date(today.time), natalCtx);
    const parts = [];

    if (cfg.price_momentum) parts.push(...getPriceMomentumFeatures(marketData, step, maxPrice));
    if (cfg.moving_average) parts.push(...getMovingAverageFeatures(marketData, step));
    if (cfg.volatility) parts.push(...getVolatilityFeature(marketData, step));
    if (cfg.rsi) parts.push(...getRsiFeature(marketData, step));
    if (cfg.volume_change) parts.push(...getVolumeChangeFeature(marketData, step));
    if (cfg.volume_level) parts.push(...getVolumeLevelFeature(marketData, step));
    if (cfg.price_volume_corr) parts.push(...getPriceVolumeCorrFeature(marketData, step));
    if (cfg.portfolio) parts.push(...getPortfolioFeatures(capital, shares, today.close, initialCapital));
    if (cfg.natal) parts.push(...getNatalFeatures(natalCtx));
    if (cfg.decade_wealth) parts.push(...getWealthPalaceFeatures(natalCtx.allStars, period.decadeLifePos, period.yearStem));
    if (cfg.annual_wealth) parts.push(...getWealthPalaceFeatures(natalCtx.allStars, period.annualLifePos, period.yearStem));
    if (cfg.monthly_wealth) parts.push(...getWealthPalaceFeatures(natalCtx.allStars, period.monthlyLifePos, period.monthStem));
    if (cfg.daily_wealth) parts.push(...getWealthPalaceFeatures(natalCtx.allStars, period.dailyLifePos, period.dayStem));
    if (cfg.calendar) parts.push(...getCalendarFeatures(period));
    if (cfg.moon_cycle) parts.push(...getMoonCycleFeatures(period));

    return parts;
}

function getExplainabilityFactors(state, featureConfig) {
    if (!state || state.length === 0) return [];
    const cfg = normalizeFeatureConfig(featureConfig);
    const map = buildFeatureIndexMap(cfg);
    const factors = [];

    const read = (key, offset = 0) => {
        const entry = map[key];
        if (!entry) return null;
        return state[entry.start + offset];
    };

    const priceNorm = read('price_momentum', 0);
    if (priceNorm != null) factors.push({ name: '價格位階', value: clamp((priceNorm - 0.5) * 2) });

    const momentum = read('price_momentum', 1);
    if (momentum != null) factors.push({ name: '短期動能', value: momentum });

    const ma5 = read('moving_average', 0);
    if (ma5 != null) factors.push({ name: 'MA5 偏離', value: ma5 });

    const ma20 = read('moving_average', 1);
    if (ma20 != null) factors.push({ name: 'MA20 趨勢', value: ma20 });

    const vol = read('volatility', 0);
    if (vol != null) factors.push({ name: '波動率', value: vol });

    const exposure = read('portfolio', 1);
    if (exposure != null) factors.push({ name: '持倉曝險', value: clamp((exposure - 0.5) * 2) });

    const dailyLu = read('daily_wealth', 1);
    if (dailyLu != null) factors.push({ name: '流日化祿', value: dailyLu ? 0.9 : -0.1 });

    const dailyJi = read('daily_wealth', 4);
    if (dailyJi != null) factors.push({ name: '流日化忌', value: dailyJi ? -0.9 : 0.1 });

    const wealthStar = read('daily_wealth', 6);
    if (wealthStar != null) factors.push({ name: '正財星象', value: wealthStar ? 0.7 : 0 });

    const riskStar = read('daily_wealth', 7);
    if (riskStar != null) factors.push({ name: '破軍七殺', value: riskStar ? -0.7 : 0 });

    const moonProx = read('moon_cycle', 3);
    if (moonProx != null) factors.push({ name: '滿月接近度', value: moonProx * 2 - 1 });

    return factors;
}

// 向後相容舊版 FEATURE_GROUPS 匯出
const FEATURE_GROUPS = getEnabledFeatureGroups(getDefaultFeatureConfig());

module.exports = {
    FEATURE_SCHEMA_VERSION,
    FEATURE_CATALOG,
    FEATURE_ORDER,
    FEATURE_GROUPS,
    LEGACY_V2_CONFIG,
    MAJOR_STAR_NAMES,
    buildNatalContext,
    buildStateVector,
    buildFeatureIndexMap,
    getStateSize,
    getMarketDim,
    getDefaultFeatureConfig,
    normalizeFeatureConfig,
    parseFeatureConfig,
    resolveFeatureConfig,
    getFeatureCatalogForUI,
    getEnabledFeatureGroups,
    getExplainabilityFactors,
    getPeriodContext,
};
