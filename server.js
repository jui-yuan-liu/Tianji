const fs = require('fs');

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { Solar, Lunar } = require('lunar-javascript');

// Import Core Logic
// getFullPalaceMapping is missing in require because I edited the file but not updated require here fully yet.
// Wait, I just edited the require line in previous step. Let's use it.
const { PALACES, calculateLifePalace, calculateWealthPalace, calculateFortunePalace, getInvestmentStrategy, getFullPalaceMapping } = require('./src/ziwei_core');
const { getFiveElementBureau, getZiWeiStarPosition, getTianFuStarPosition, getLifePalaceStemBranch, getAllMajorStars } = require('./src/ziwei_stars');
const { getAnnualTransformations, getAnnualLifePalace } = require('./src/ziwei_annual');
const { getDecadeLifePalace, getMonthlyLifePalace, getDailyLifePalace, getTimeTransformations } = require('./src/ziwei_periods');
const { getPalaceAdvice } = require('./src/ziwei_advice'); // Advice Module
const { matchStocks } = require('./src/stock_matcher'); // Stock Matcher Module
const { recommendResonanceStocks } = require('./src/resonance_engine'); // Resonance Engine
const { runBacktest } = require('./src/backtest'); // Backtest Module
const { trainModel } = require('./src/rl_train'); // RL Training Module
const { getFeatureCatalogForUI, parseFeatureConfig, getStateSize, getMarketDim } = require('./src/rl_features');
const { registerUser, loginUser, authenticateToken, getUserProfile } = require('./src/auth');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Serve static
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ================== User Authentication APIs ==================
app.post('/api/users/register', (req, res) => {
    try {
        const { username, password, realName, birthYear, birthMonth, birthDay, birthHour } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
        
        const result = registerUser(username, password, realName, parseInt(birthYear), parseInt(birthMonth), parseInt(birthDay), parseInt(birthHour));
        if (result.success) {
            res.json({ message: 'User registered successfully', userId: result.userId });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users/login', (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

        const result = loginUser(username, password);
        if (result.success) {
            res.json({ token: result.token, user: result.user });
        } else {
            res.status(401).json({ error: result.error });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users/me', authenticateToken, (req, res) => {
    try {
        console.log("Fetching profile for user:", req.user);
        const profile = getUserProfile(req.user.id);
        if (profile) {
            res.json(profile);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        console.error("Error fetching profile:", err);
        res.status(500).json({ error: err.message });
    }
});
// ==============================================================

// --- Advice Logic Helper ---
function getFlowAdvice(scope, branch, stars) {
    const starList = stars.map(s => s.split(' ')[0]); // Clean up stars
    let advice = "";

    // 1. Branch Nature (Simple Five Elements relation could be added here)
    const branchNature = {
        "子": "水旺之地，流動性強。", "丑": "金庫之地，保守穩健。", "寅": "木旺之地，生機勃勃。",
        "卯": "木旺之地，桃花人緣。", "辰": "水庫之地，變動潛藏。", "巳": "火旺之地，積極變動。",
        "午": "火旺之地，熱情奔放。", "未": "木庫之地，收斂沈澱。", "申": "金旺之地，肅殺果決。",
        "酉": "金旺之地，人緣桃花。", "戌": "火庫之地，守成不易。", "亥": "水旺之地，智慧流動。"
    };
    
    // 2. Star Meaning in Flow
    if (starList.some(s => s.includes('紫微'))) {
        advice = "帝星坐守，氣勢轉強。適合爭取主導權、規劃長遠目標，易得長輩或上司提攜。";
    } else if (starList.some(s => s.includes('天機'))) {
        advice = "機星入局，思緒奔騰。適合策劃、分析、變動，但需防思多行少，神經緊繃。";
    } else if (starList.some(s => s.includes('太陽'))) {
        advice = "陽星高照，貴人運旺。適合公開發表、社交活動、服務他人，名聲大於利益。";
    } else if (starList.some(s => s.includes('武曲'))) {
        advice = "財星當頭，執行力強。適合處理財務、落實計畫、剛毅果決，切忌猶豫不決。";
    } else if (starList.some(s => s.includes('天同'))) {
        advice = "福星降臨，心態安逸。適合協調溝通、享受生活、不宜過度競爭，順其自然。";
    } else if (starList.some(s => s.includes('廉貞'))) {
        advice = "囚星入度，人際複雜。專注力提升，適合精密作業，但需防人際糾紛或情緒波動。";
    } else if (starList.some(s => s.includes('天府'))) {
        advice = "庫星坐守，穩健踏實。適合資產配置、守成、享受成果，不宜冒進風險。";
    } else if (starList.some(s => s.includes('太陰'))) {
        advice = "富星入運，溫和漸進。適合財務規劃、房產佈局、與女性互動，財運涓滴成河。";
    } else if (starList.some(s => s.includes('貪狼'))) {
        advice = "桃花犯主，慾望增強。適合交際應酬、學習新知、投資投機，需防酒色財氣之災。";
    } else if (starList.some(s => s.includes('巨門'))) {
        advice = "暗曜入宮，口舌是非。適合鑽研學問、演講辯論，需防溝通誤會或隱憂浮現。";
    } else if (starList.some(s => s.includes('天相'))) {
        advice = "印星輔佐，形象提升。適合輔助他人、建立形象、協調事務，忌獨斷獨行。";
    } else if (starList.some(s => s.includes('天梁'))) {
        advice = "蔭星庇佑，逢凶化吉。適合排難解紛、學習醫藥/法律/命理，長輩緣佳。";
    } else if (starList.some(s => s.includes('七殺'))) {
        advice = "將星入命，變動激烈。適合開創、突破僵局、大刀闊斧，忌猶豫退縮。";
    } else if (starList.some(s => s.includes('破軍'))) {
        advice = "耗星當頭，破舊立新。適合轉型、大幅變動、冒險嘗試，先破後立之象。";
    } else {
        advice = "空宮無主，借對宮之力。運勢受環境牽引較大，宜隨遇而安，不宜強出頭。";
    }

    return `【${scope}在${branch}】${branchNature[branch]}<br>【運勢】${advice}`;
}

// API: Calculate Natal Chart
app.post('/api/calculate', (req, res) => {
    try {
        const { year, month, day, hour, targetDate } = req.body;
        
        let targetD = new Date();
        if (targetDate) {
            targetD = new Date(targetDate);
        }
        const currentYear = targetD.getFullYear();
        const tMonth = targetD.getMonth() + 1;
        const tDay = targetD.getDate();

        console.log(`Received request: Birth ${year}-${month}-${day} ${hour}:00 | Target Date ${currentYear}-${tMonth}-${tDay}`);
        
        // 1. Birth Lunar
        const solar = Solar.fromYmd(parseInt(year), parseInt(month), parseInt(day));
        const lunar = solar.getLunar();
        const lunarMonth = lunar.getMonth();
        const lunarDay = lunar.getDay();
        const birthHour = parseInt(hour);
        const yearGan = lunar.getYearGan();
        const yearGanIndex = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"].indexOf(yearGan);

        // Target Lunar
        const targetSolar = Solar.fromYmd(currentYear, tMonth, tDay);
        const targetLunar = targetSolar.getLunar();
        const targetLunarMonth = targetLunar.getMonth();
        const targetLunarDay = targetLunar.getDay();

        // 2. Natal Chart
        const lifePalaceIdx = calculateLifePalace(lunarMonth, birthHour);
        // Get Full Palace Names Mapping
        const palaceMapping = getFullPalaceMapping ? getFullPalaceMapping(lifePalaceIdx) : {};
        if (!getFullPalaceMapping) {
             // Fallback if not loaded
             palaceMapping[lifePalaceIdx] = "命宮";
             palaceMapping[calculateWealthPalace(lifePalaceIdx)] = "財帛";
             palaceMapping[calculateFortunePalace(calculateWealthPalace(lifePalaceIdx))] = "福德";
        }
        
        const wealthPalaceIdx = calculateWealthPalace(lifePalaceIdx); // Still needed for strategy
        const fortunePalaceIdx = calculateFortunePalace(wealthPalaceIdx);
        
        const fiveElementBureau = getFiveElementBureau(yearGanIndex, lifePalaceIdx);
        const ziWeiPos = getZiWeiStarPosition(fiveElementBureau, lunarDay);
        const tianFuPos = getTianFuStarPosition(ziWeiPos);
        const allStars = getAllMajorStars(ziWeiPos, tianFuPos);

        // 3. Periods
        // Annual
        const targetYearStemIdx = (currentYear - 4) % 10;
        const targetYearBranchIdx = (currentYear - 4) % 12;
        const targetYearStem = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"][targetYearStemIdx];
        const targetYearBranch = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"][targetYearBranchIdx];
        const annualTrans = getAnnualTransformations(targetYearStem);
        const annualLifePos = getAnnualLifePalace(targetYearBranchIdx);

        // Decade
        const age = currentYear - parseInt(year) + 1;
        const decadeLifePos = getDecadeLifePalace(lifePalaceIdx, fiveElementBureau, age);
        const decadeStemIdx = (fiveElementBureau + decadeLifePos) % 10; 
        const decadeStem = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"][decadeStemIdx];
        const decadeTrans = getTimeTransformations(decadeStem);

        // Monthly
        const monthlyTrans = getTimeTransformations("甲"); // Simplified
        const monthlyLifePos = getMonthlyLifePalace(annualLifePos, targetLunarMonth, birthHour, 6); // Uses target lunar month

        // Daily
        const dailyTrans = getTimeTransformations(targetLunar.getDayGan()); // Uses target day gan
        const dailyLifePos = getDailyLifePalace(monthlyLifePos, targetLunarDay); // Uses target lunar day

        // 4. Construct Chart
        const natalMapping = getFullPalaceMapping ? getFullPalaceMapping(lifePalaceIdx) : {};
        const decadeMapping = getFullPalaceMapping ? getFullPalaceMapping(decadeLifePos) : {};
        const annualMapping = getFullPalaceMapping ? getFullPalaceMapping(annualLifePos) : {};
        const monthlyMapping = getFullPalaceMapping ? getFullPalaceMapping(monthlyLifePos) : {};
        const dailyMapping = getFullPalaceMapping ? getFullPalaceMapping(dailyLifePos) : {};

        const chart = [];
        for (let i = 0; i < 12; i++) {
            const branchName = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"][i];
            const starsAtPos = allStars.filter(s => s.position === i);
            
            const buildLayerStars = (transList) => {
                let layerStars = [];
                starsAtPos.forEach(s => {
                    let starStr = s.name;
                    let tags = [];
                    transList.forEach(t => {
                        if (s.name === t.lu) tags.push({ type: 'lu', src: t.label });
                        if (s.name === t.ji) tags.push({ type: 'ji', src: t.label });
                    });
                    if (tags.length > 0) {
                        starStr += " " + tags.map(t => `(${t.src}${t.type === 'lu' ? '祿' : '忌'})`).join('');
                    }
                    layerStars.push(starStr);
                });
                return layerStars;
            };

            const natalStars = buildLayerStars([]);
            const decadeStars = buildLayerStars([{...decadeTrans, label: '運'}]);
            const annualStars = buildLayerStars([{...decadeTrans, label: '運'}, {...annualTrans, label: '年'}]);
            const monthlyStars = buildLayerStars([{...annualTrans, label: '年'}, {...monthlyTrans, label: '月'}]);
            const dailyStars = buildLayerStars([{...annualTrans, label: '年'}, {...monthlyTrans, label: '月'}, {...dailyTrans, label: '日'}]);

            const layers = {
                natal: { name: natalMapping[i] || "", stars: natalStars },
                decade: { name: decadeMapping[i] || "", stars: decadeStars },
                annual: { name: annualMapping[i] || "", stars: annualStars },
                monthly: { name: monthlyMapping[i] || "", stars: monthlyStars },
                daily: { name: dailyMapping[i] || "", stars: dailyStars },
                all: { name: "", stars: [] } // Placeholder
            };

            // Keep backwards compatibility
            let stars = buildLayerStars([
                {...decadeTrans, label: '運'}, 
                {...annualTrans, label: '年'}, 
                {...monthlyTrans, label: '月'},
                {...dailyTrans, label: '日'}
            ]);
            layers.all.stars = stars;
            
            // Palace Name
            let palaceName = palaceMapping[i] || "";
            let periods = [];
            if (i === annualLifePos) periods.push("流年");
            if (i === decadeLifePos) periods.push("大運");
            if (i === monthlyLifePos) periods.push("流月");
            if (i === dailyLifePos) periods.push("流日");
            
            if(periods.length > 0) {
                 if(!palaceName) palaceName = periods.join('/');
                 else palaceName += ` (${periods.join('/')})`;
            }
            layers.all.name = palaceName;

            // --- Advice Generation ---
            const advice = getPalaceAdvice(stars, palaceName);
            
            // --- Flow Summary Generation ---
            let flowSummaries = [];
            if (i === annualLifePos) {
                flowSummaries.push(getFlowAdvice("流年", branchName, stars));
            }
            if (i === monthlyLifePos) {
                flowSummaries.push(getFlowAdvice("流月", branchName, stars));
            }
            if (i === dailyLifePos) {
                flowSummaries.push(getFlowAdvice("流日", branchName, stars));
            }

            chart.push({
                index: i,
                earthlyBranch: branchName,
                functionName: palaceName,
                isAnnualLife: i === annualLifePos,
                isDecadeLife: i === decadeLifePos,
                isMonthlyLife: i === monthlyLifePos,
                isDailyLife: i === dailyLifePos,
                stars: stars,
                layers: layers,
                advice: advice,
                flowSummaries: flowSummaries
            });
        }
        
        const wealthPalaceData = chart[wealthPalaceIdx];
        let wealthStar = "空宮 (Empty)";
        if (wealthPalaceData.stars.length > 0) wealthStar = wealthPalaceData.stars.join(", ");

        // Match Stocks
        // Using calculation indices directly for more robustness
        const wealthIdx = calculateWealthPalace(lifePalaceIdx);
        const propertyIdx = (lifePalaceIdx - 9 + 12) % 12; // Property is 10th palace (index 9 CCW)
        
        const finalMatchedStocks = matchStocks({
            '財帛宮': chart[wealthIdx],
            '田宅宮': chart[propertyIdx]
        });

        // Resonance Recommendations
        const resonanceStocks = recommendResonanceStocks({
            wealthPalaceBranch: ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"][wealthIdx],
            wealthStars: chart[wealthIdx] ? chart[wealthIdx].stars.map(s => s.split(' ')[0]) : [],
            propertyPalaceBranch: ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"][propertyIdx],
            propertyStars: chart[propertyIdx] ? chart[propertyIdx].stars.map(s => s.split(' ')[0]) : [],
            bureau: fiveElementBureau
        });

        const strategy = getInvestmentStrategy(wealthStar, "Unknown");
        
        if(wealthStar.includes("忌")) {
            strategy.action = "SELL/HEDGE";
            strategy.riskLevel = "Extreme";
            strategy.analysis += `<br><br><span style="color:#ef4444;">[運勢警示]</span> 財帛宮逢忌星沖破，資金控管為上策。`;
        }
        if(wealthStar.includes("祿")) {
            strategy.action = "BUY MORE";
            strategy.riskLevel = "Low";
            strategy.analysis += `<br><br><span style="color:#fbbf24;">[運勢喜訊]</span> 財帛宮逢祿星拱照，獲利機會大增。`;
        }

        res.json({
            meta: {
                lunarDate: lunar.toString(),
                targetLunarDate: targetLunar.toString(),
                bureau: fiveElementBureau,
                targetYear: currentYear,
                targetYearStem: targetYearStem + targetYearBranch
            },
            chart: chart,
            strategy: {
                ...strategy,
                wealthStar: wealthStar,
                matchedStocks: finalMatchedStocks,
                resonanceStocks: resonanceStocks
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Mock Market Data (TAIEX-like)
function generateMockMarketData() {
    let data = [];
    let date = new Date('2024-01-01');
    let price = 18000;
    
    for (let i = 0; i < 700; i++) { // ~2 years
        if (date.getDay() === 0 || date.getDay() === 6) {
            date.setDate(date.getDate() + 1);
            continue;
        }

        let change = (Math.random() - 0.48) * 200;
        let open = price;
        let close = price + change;
        let high = Math.max(open, close) + Math.random() * 50;
        let low = Math.min(open, close) - Math.random() * 50;
        
        let dateStr = date.toISOString().split('T')[0];
        
        data.push({
            time: dateStr,
            open: parseFloat(open.toFixed(2)),
            high: parseFloat(high.toFixed(2)),
            low: parseFloat(low.toFixed(2)),
            close: parseFloat(close.toFixed(2))
        });
        
        price = close;
        date.setDate(date.getDate() + 1);
    }
    return data;
}

let MARKET_DATA_CACHE = null;
let LAST_FETCH_TIME = 0;
let MARKET_DATA_PROMISE = null;
const FETCH_INTERVAL_MS = 60 * 60 * 1000; // Cache for 1 hour to respect API limits

async function getMarketData(requestedStartDate, requestedEndDate) {
    const dataDir = path.resolve(__dirname, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
    const cacheFile = path.resolve(__dirname, 'data', 'market_data.json');
    
    let marketData = [];
    if (fs.existsSync(cacheFile)) {
        try {
            marketData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        } catch (e) {
            console.error("Error reading cache file:", e);
        }
    }

    // Check if we need to fetch more data
    const existingDates = new Set(marketData.map(d => d.time));
    const sortedExisting = marketData.map(d => d.time).sort();
    const earliestDate = sortedExisting[0];
    const latestDate = sortedExisting[sortedExisting.length - 1];

    const needsStart = requestedStartDate && (!earliestDate || requestedStartDate < earliestDate);
    const needsEnd = requestedEndDate && (!latestDate || requestedEndDate > latestDate);

    // If cache is empty or we need more data, fetch from Yahoo
    if (marketData.length === 0 || needsStart || needsEnd) {
        console.log(`Fetching TAIEX data from Yahoo Finance API for range...`);
        
        // Default to 2y if no range provided, otherwise try to fetch enough
        let rangeParam = "2y";
        if (requestedStartDate) {
            const startObj = new Date(requestedStartDate);
            const now = new Date();
            const diffYears = (now - startObj) / (1000 * 60 * 60 * 24 * 365.25);
            if (diffYears > 2 && diffYears <= 5) rangeParam = "5y";
            else if (diffYears > 5 && diffYears <= 10) rangeParam = "10y";
            else if (diffYears > 10) rangeParam = "max";
        }

        try {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/^TWII?range=${rangeParam}&interval=1d`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                const result = data.chart.result[0];
                const timestamps = result.timestamp;
                const indicators = result.indicators.quote[0];
                
                const fetchedData = [];
                for (let i = 0; i < timestamps.length; i++) {
                    if (indicators.open[i] == null) continue;
                    const dateStr = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
                    fetchedData.push({
                        time: dateStr,
                        open: parseFloat(indicators.open[i].toFixed(2)),
                        high: parseFloat(indicators.high[i].toFixed(2)),
                        low: parseFloat(indicators.low[i].toFixed(2)),
                        close: parseFloat(indicators.close[i].toFixed(2))
                    });
                }

                // Merge and deduplicate
                const allData = [...marketData, ...fetchedData];
                const uniqueMap = new Map();
                allData.forEach(d => uniqueMap.set(d.time, d));
                marketData = Array.from(uniqueMap.values()).sort((a, b) => a.time.localeCompare(b.time));
                
                fs.writeFileSync(cacheFile, JSON.stringify(marketData));
                console.log(`Market data updated. Total records: ${marketData.length}`);
            }
        } catch (e) {
            console.error("Yahoo Fetch Error:", e);
        }
    }
    
    return marketData;
}

// API: Get Market Data
app.get('/api/market-data', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const data = await getMarketData(startDate, endDate);
        
        let filtered = data;
        if (startDate) filtered = filtered.filter(d => d.time >= startDate);
        if (endDate) filtered = filtered.filter(d => d.time <= endDate);
        
        res.json(filtered);
    } catch (e) {
        console.error("Market data error:", e);
        res.status(500).json({error: e.message});
    }
});

// API: Get Daily Fortune for specific date (Enhanced)
function calculateDailyFortune(dateStr, bYear, bMonth, bDay, bHour) {
    const targetDate = new Date(dateStr);
    
    // 1. Target Date Lunar
    const solar = Solar.fromYmd(targetDate.getFullYear(), targetDate.getMonth() + 1, targetDate.getDate());
    const lunar = solar.getLunar();
    const lunarMonth = lunar.getMonth();
    const lunarDay = lunar.getDay();
    
    // 2. Birth Chart Basic Info
    const birthSolar = Solar.fromYmd(bYear, bMonth, bDay);
    const birthLunar = birthSolar.getLunar();
    const lifePalaceIdx = calculateLifePalace(birthLunar.getMonth(), bHour);
    const yearGanIndex = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"].indexOf(birthLunar.getYearGan());
    const fiveElementBureau = getFiveElementBureau(yearGanIndex, lifePalaceIdx);

    // 3. Locate Flow Palaces
    const currentYear = targetDate.getFullYear();
    const targetYearBranchIdx = (currentYear - 4) % 12;
    const annualLifePos = getAnnualLifePalace(targetYearBranchIdx);
    const monthlyLifePos = getMonthlyLifePalace(annualLifePos, lunar.getMonth(), bHour, 6);
    const dailyLifePos = getDailyLifePalace(monthlyLifePos, lunar.getDay());
    const dailyWealthPos = calculateWealthPalace(dailyLifePos);

    // 4. Transformations
    const targetYearStemIdx = (currentYear - 4) % 10;
    const annualStem = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"][targetYearStemIdx];
    const annualTrans = getAnnualTransformations(annualStem);
    
    const dailyStem = lunar.getDayGan();
    const dailyTrans = getTimeTransformations(dailyStem);

    // 5. Stars in Daily Palaces
    const ziWeiPos = getZiWeiStarPosition(fiveElementBureau, birthLunar.getDay());
    const tianFuPos = getTianFuStarPosition(ziWeiPos);
    const allStars = getAllMajorStars(ziWeiPos, tianFuPos);

    const dailyLifeStars = allStars.filter(s => s.position === dailyLifePos).map(s => s.name);
    const dailyWealthStars = allStars.filter(s => s.position === dailyWealthPos).map(s => s.name);

    // 6. Generate Personal Advice
    let advice = "平穩";
    let score = 50;
    let tips = [];
    let strategies = [];

    if(dailyWealthStars.includes(dailyTrans.lu) || dailyWealthStars.includes(annualTrans.lu)) {
        advice = "大吉";
        score += 30;
        tips.push("財帛宮化祿，資金流動順暢。");
        strategies.push("積極進場或加碼，可關注強勢權值股。");
    }
    if(dailyWealthStars.includes(dailyTrans.ji) || dailyWealthStars.includes(annualTrans.ji)) {
        advice = "凶險";
        score -= 30;
        tips.push("財帛宮化忌，注意破財決策。");
        strategies.push("建議空手觀望，或進行反向避險。");
    }
    
    if(dailyWealthStars.some(s => ['貪狼','七殺','破軍'].includes(s))) {
        tips.push("殺破狼入流日財帛，市場波動大。");
        strategies.push("適合極短線當沖，快進快出。");
    } else if (dailyWealthStars.some(s => ['天府','太陰','武曲'].includes(s))) {
        tips.push("財星坐守，財運相對穩定。");
        strategies.push("適合佈局防禦型或高殖利率標的。");
    }

    if(dailyLifeStars.length === 0) {
        tips.push("流日命宮無主星，易受大盤牽引。");
        strategies.push("跟隨大盤趨勢操作，不宜逆勢。");
    }

    if(strategies.length === 0) strategies.push("以觀望為主，靜待更明確的訊號。");

    return {
        date: dateStr,
        lunarDate: lunar.toString(),
        user: {
            annual: { stem: annualStem, lu: annualTrans.lu, ji: annualTrans.ji },
            daily: {
                stem: dailyStem, lu: dailyTrans.lu, ji: dailyTrans.ji,
                lifeStars: dailyLifeStars.length > 0 ? dailyLifeStars : ["空宮"],
                wealthStars: dailyWealthStars.length > 0 ? dailyWealthStars : ["空宮"],
                lifePosBranch: ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"][dailyLifePos],
                wealthPosBranch: ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"][dailyWealthPos]
            },
            advice: {
                summary: advice,
                score: score,
                details: tips.join(" ") || "今日運勢平平，順勢而為。",
                strategy: strategies.join(" ")
            }
        }
    };
}

app.get('/api/daily-fortune', (req, res) => {
    try {
        const { date, birthYear, birthMonth, birthDay, birthHour } = req.query;
        const bYear = parseInt(birthYear) || 1990;
        const bMonth = parseInt(birthMonth) || 1;
        const bDay = parseInt(birthDay) || 1;
        const bHour = parseInt(birthHour) || 0;
        
        const result = calculateDailyFortune(date, bYear, bMonth, bDay, bHour);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/weekly-fortune', (req, res) => {
    try {
        const { date, birthYear, birthMonth, birthDay, birthHour } = req.query;
        const bYear = parseInt(birthYear) || 1990;
        const bMonth = parseInt(birthMonth) || 1;
        const bDay = parseInt(birthDay) || 1;
        const bHour = parseInt(birthHour) || 0;
        
        const targetDate = new Date(date);
        let results = [];
        
        for (let i = 0; i < 7; i++) {
            let nextDate = new Date(targetDate);
            nextDate.setDate(targetDate.getDate() + i);
            let dateStr = nextDate.toISOString().split('T')[0];
            results.push(calculateDailyFortune(dateStr, bYear, bMonth, bDay, bHour));
        }
        
        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/backtest', async (req, res) => {
    try {
        const { userId, modelId, birthYear, birthMonth, birthDay, birthHour, startDate, endDate } = req.query;
        const bYear = parseInt(birthYear) || 1990;
        const bMonth = parseInt(birthMonth) || 1;
        const bDay = parseInt(birthDay) || 1;
        const bHour = parseInt(birthHour) || 0;
        
        let marketData = await getMarketData(startDate, endDate);
        if (startDate) marketData = marketData.filter(d => d.time >= startDate);
        if (endDate) marketData = marketData.filter(d => d.time <= endDate);
        const result = await runBacktest(marketData, bYear, bMonth, bDay, bHour, userId, modelId);
        res.json(result);
    } catch (error) {
        console.error("Backtest Error:", error);
        res.status(500).json({ error: error.message });
    }
});


// Phase 4: AI RL Training SSE Endpoint
app.get('/api/train/features', (req, res) => {
    res.json(getFeatureCatalogForUI());
});

app.get('/api/train', async (req, res) => {
    // 1. Establish SSE Connection
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    
    // Simulate auth user parameters (in production get from req.user/token)
    const { year, month, day, hour, epochs = 20, lr, gamma, decay, batch, baseModelId, startDate, endDate, features } = req.query;
    
    const hyperParams = {
        learningRate: lr ? parseFloat(lr) : 0.001,
        gamma: gamma ? parseFloat(gamma) : 0.95,
        epsilonDecay: decay ? parseFloat(decay) : 0.995,
        batchSize: batch ? parseInt(batch) : 32
    };
    const featureConfig = parseFeatureConfig(features);
    const stateSize = getStateSize(featureConfig);
    const marketDim = getMarketDim(featureConfig);
    const metaDim = stateSize - marketDim;
    if (stateSize < 3 || metaDim < 1) {
        res.write(`data: {"error": "至少需要一項命理特徵與一項市場特徵才能訓練雙塔模型"}\n\n`);
        return res.end();
    }
    if (!year || !month || !day || !hour) {
        res.write(`data: {"error": "Missing birth data"}\n\n`);
        return res.end();
    }
    const userBirth = { year, month, day, hour };
    const userId = req.query.userId || 1; // dummy fallback

    // 2. Ensure market data is loaded
    let marketData = await getMarketData(startDate, endDate);
    if (!marketData) {
        res.write(`data: {"error": "Failed to load market data"}\n\n`);
        return res.end();
    }
    
    // Apply Date Filters
    if (startDate) marketData = marketData.filter(d => d.time >= startDate);
    if (endDate) marketData = marketData.filter(d => d.time <= endDate);
    if (marketData.length === 0) {
        res.write(`data: {"error": "No market data in selected range"}\n\n`);
        return res.end();
    }
    
    res.write(`data: {"status": "starting", "epochs": ${epochs}, "stateSize": ${getStateSize(featureConfig)}}\n\n`);

    // 3. Start Training using imported trainModel
    try {
        await trainModel(userId, userBirth, marketData, parseInt(epochs), hyperParams, (progress) => {
            res.write(`data: ${JSON.stringify(progress)}\n\n`);
            if (typeof res.flush === 'function') res.flush();
        }, baseModelId, featureConfig);
        
        // Finalize
        res.write(`data: {"status": "done"}\n\n`);
        res.end();
    } catch (err) {
        console.error("Training error:", err);
        res.write(`data: {"error": "${err.message}"}\n\n`);
        res.end();
    }
});


// Phase 5: List trained AI Models
app.get('/api/models', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const indexFile = require('path').resolve(__dirname, 'models', `user_${userId}`, 'models.json');
        if (fs.existsSync(indexFile)) {
            let indexData = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
            // Ensure we don't reverse the array in place if we don't want to affect the file, but we just read it.
            // .reverse() mutates the array, which is fine here since it's just in memory.
            indexData.reverse();
            res.json({ models: indexData }); // latest first
        } else {
            res.json({ models: [] });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


app.delete('/api/models/:modelId', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const modelId = req.params.modelId;
        const userDir = require('path').resolve(__dirname, 'models', `user_${userId}`);
        const indexFile = require('path').join(userDir, 'models.json');
        
        if (fs.existsSync(indexFile)) {
            let indexData = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
            indexData = indexData.filter(m => m.id !== modelId);
            fs.writeFileSync(indexFile, JSON.stringify(indexData, null, 2));
        }
        
        const modelDir = require('path').join(userDir, modelId);
        if (fs.existsSync(modelDir)) {
            fs.rmSync(modelDir, { recursive: true, force: true });
        }
        
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tianji Server running on http://0.0.0.0:${PORT}`);
});
