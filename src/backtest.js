const { calculateLifePalace, calculateWealthPalace } = require('./ziwei_core');
const { getFiveElementBureau, getZiWeiStarPosition, getTianFuStarPosition, getAllMajorStars } = require('./ziwei_stars');
const { getAnnualLifePalace, getAnnualTransformations } = require('./ziwei_annual');
const { getMonthlyLifePalace, getDailyLifePalace, getTimeTransformations } = require('./ziwei_periods');
const { Solar, Lunar } = require('lunar-javascript');
const fs = require('fs');
const path = require('path');
const tf = require('@tensorflow/tfjs');
const TianjiEnv = require('./rl_env');
const DqnAgent = require('./rl_agent');
const { getExplainabilityFactors, resolveFeatureConfig, getMarketDim } = require('./rl_features');

async function runBacktest(marketData, birthYear, birthMonth, birthDay, birthHour, userId, modelId) {
    // Basic setup for user
    const bYear = parseInt(birthYear);
    const bMonth = parseInt(birthMonth);
    const bDay = parseInt(birthDay);
    const bHour = parseInt(birthHour);
    const userBirth = { year: bYear, month: bMonth, day: bDay, hour: bHour };
    
    let initialCapital = 100000;
    let capital = initialCapital;
    let shares = 0;
    let history = [];
    let markers = []; // For frontend Lightweight Charts
    
    // Sort market data chronologically
    const sortedData = [...marketData].sort((a, b) => new Date(a.time) - new Date(b.time));

    // Check if AI model exists
    let modelDir = '';
    let hasAIModel = false;
    
    if (userId && modelId && modelId !== 'static' && modelId !== 'latest') {
        modelDir = path.resolve(__dirname, '../models', `user_${userId}`, modelId);
        hasAIModel = fs.existsSync(path.join(modelDir, 'model.json'));
    } else if (userId && modelId === 'latest') {
        const userDir = path.resolve(__dirname, '../models', `user_${userId}`);
        const indexFile = path.join(userDir, 'models.json');
        if (fs.existsSync(indexFile)) {
            const indexData = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
            if (indexData.length > 0) {
                const latest = indexData[indexData.length - 1];
                modelDir = path.resolve(userDir, latest.id);
                hasAIModel = fs.existsSync(path.join(modelDir, 'model.json'));
            }
        }
    }

    let env = null;
    let agent = null;
    let currentState = null;
    let modelMeta = null;

    if (hasAIModel) {
        const userDir = path.resolve(__dirname, '../models', `user_${userId}`);
        const indexFile = path.join(userDir, 'models.json');
        if (fs.existsSync(indexFile)) {
            const indexData = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
            modelMeta = indexData.find(m => path.basename(modelDir) === m.id) || indexData[indexData.length - 1];
        }
    }

    const featureConfig = resolveFeatureConfig(modelMeta);
    const marketDim = modelMeta?.marketDim ?? getMarketDim(featureConfig);

    if (hasAIModel) {
        console.log(`[Backtest] AI Model found for user_${userId}. Using RL Agent for inference.`);
        env = new TianjiEnv(sortedData, userBirth, featureConfig);
        const stateSize = env.getStateSize();
        const actionSize = env.getActionSize();
        agent = new DqnAgent(stateSize, actionSize, { marketDim });
        
        await agent.loadWeights(modelDir);
        agent.epsilon = 0; 
        currentState = env.reset();
    } else {
        console.log(`[Backtest] No AI Model found for user_${userId}. Using Static Strategy.`);
    }

    // Static Setup
    const birthSolar = Solar.fromYmd(bYear, bMonth, bDay);
    const birthLunar = birthSolar.getLunar();
    const bHourBranchIdx = Math.floor(((bHour + 1) % 24) / 2); // 0=Zi, 1=Chou...
    const lifePalaceIdx = calculateLifePalace(birthLunar.getMonth(), bHourBranchIdx);
    const yearGanIndex = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"].indexOf(birthLunar.getYearGan());
    const fiveElementBureau = getFiveElementBureau(yearGanIndex, lifePalaceIdx);
    const ziWeiPos = getZiWeiStarPosition(fiveElementBureau, birthLunar.getDay());
    const tianFuPos = getTianFuStarPosition(ziWeiPos);
    const allStars = getAllMajorStars(ziWeiPos, tianFuPos);

    let maxDrawdown = 0;
    let peakValue = initialCapital;
    let winningTrades = 0;
    let totalTrades = 0;
    let lastBuyPrice = 0;

    for (let i = 0; i < sortedData.length; i++) {
        const dayData = sortedData[i];
        const targetDate = new Date(dayData.time);
        const solar = Solar.fromYmd(targetDate.getFullYear(), targetDate.getMonth() + 1, targetDate.getDate());
        const lunar = solar.getLunar();
        
        let signal = 'HOLD';
        let reason = '依據當前市場與命理特徵綜合評估，暫無明顯進出場訊號。';
        let factors = [];
        const price = dayData.close;
        let actionIdx = 0; // Default HOLD

        if (hasAIModel) {
            // AI Inference
            actionIdx = agent.act(currentState);
            const action = env.actionMap[actionIdx] || { type: 'HOLD', ratio: 0 };
            signal = action.type;
            
            // Explainability from v2 feature schema
            factors = getExplainabilityFactors(currentState, featureConfig);

            const ratioPct = (action.ratio * 100).toFixed(0) + "%";
            if (signal === 'BUY') {
                reason = `AI 模型分析市場動能與您的個人命盤軌跡後，建議執行階梯加碼（比例 ${ratioPct}）。當前現金充足且流日宮位展現上行能量。`;
            } else if (signal === 'SELL') {
                reason = `AI 模型偵測到市場波幅轉劇且流時盤出現避險訊號，建議階梯減碼（比例 ${ratioPct}）以保全獲利。`;
            } else {
                reason = `綜合評估大盤位階與流日四化現象，AI 認為當前應維持現狀，靜待更佳的操作時機。`;
            }
            
            // Advance environment
            const stepResult = env.step(actionIdx);
            currentState = stepResult.state;
            
        } else {
            // Static Inference (Backwards compatibility)
            const currentYear = targetDate.getFullYear();
            const targetYearBranchIdx = (currentYear - 4) % 12;
            const targetYearStemIdx = (currentYear - 4) % 10;
            const annualStem = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"][targetYearStemIdx];
            
            const annualLifePos = getAnnualLifePalace(targetYearBranchIdx);
            const monthlyLifePos = getMonthlyLifePalace(annualLifePos, birthLunar.getMonth(), bHourBranchIdx, lunar.getMonth());
            const dailyLifePos = getDailyLifePalace(monthlyLifePos, lunar.getDay());
            const dailyWealthPos = calculateWealthPalace(dailyLifePos);

            const annualTrans = getAnnualTransformations(annualStem);
            const dailyTrans = getTimeTransformations(lunar.getDayGan());
            const dailyWealthStars = allStars.filter(s => s.position === dailyWealthPos).map(s => s.name);
            
            factors = [
                { name: '四化連動 (Transformations)', value: 0 },
                { name: '財帛宮星曜 (Wealth Stars)', value: 0 },
                { name: '流日方位 (Daily Position)', value: 0 }
            ];

            if (dailyWealthStars.includes(dailyTrans.lu) || dailyWealthStars.includes(annualTrans.lu)) {
                signal = 'BUY';
                actionIdx = 5; // BUY 100% for static
                reason = `今日財帛宮逢祿（${dailyTrans.lu || annualTrans.lu}化祿），資金流動順暢，為進場訊號。`;
                factors[0].value = 0.9;
            } else if (dailyWealthStars.includes(dailyTrans.ji) || dailyWealthStars.includes(annualTrans.ji)) {
                signal = 'SELL';
                actionIdx = 10; // SELL 100% for static
                reason = `今日財帛宮逢忌（${dailyTrans.ji || annualTrans.ji}化忌），有破財風險，建議出場。`;
                factors[0].value = -0.9;
            } else {
                if (dailyWealthStars.some(s => ['武曲', '太陰', '天府'].includes(s))) {
                    signal = 'BUY';
                    actionIdx = 3; // BUY 20%
                    reason = `財帛宮見正財星，利於小額佈局。`;
                } else if (dailyWealthStars.some(s => ['破軍', '七殺'].includes(s))) {
                    signal = 'SELL';
                    actionIdx = 8; // SELL 20%
                    reason = `財帛宮星曜動盪，建議適度減碼。`;
                }
            }
        }

        let actionTaken = 'NONE';
        const currentPrice = dayData.close;
        const buyFeeRate = 0.001425;
        const sellFeeRate = 0.004425;

        // Manual execution logic for backtest (tracking markers)
        if (signal === 'BUY') {
            const action = hasAIModel ? env.actionMap[actionIdx] : { ratio: 0.20 };
            const cappedRatio = Math.min(action.ratio, 0.20);
            const amountToSpend = capital * cappedRatio;
            const sharesToBuy = Math.floor(amountToSpend / (currentPrice * (1 + buyFeeRate)));
            
            if (sharesToBuy > 0) {
                const tradeCost = sharesToBuy * currentPrice;
                const feeCost = tradeCost * buyFeeRate;
                shares += sharesToBuy;
                capital -= (tradeCost + feeCost);
                actionTaken = `BUY ${sharesToBuy} shares`;
                lastBuyPrice = currentPrice;
                
                markers.push({
                    time: dayData.time,
                    position: 'belowBar',
                    color: '#10b981',
                    shape: 'arrowUp',
                    text: 'BUY'
                });
                totalTrades++;
            }
        } else if (signal === 'SELL' && shares > 0) {
            const action = hasAIModel ? env.actionMap[actionIdx] : { ratio: 0.50 };
            const cappedRatio = Math.min(action.ratio, 0.50);
            const sharesToSell = Math.floor(shares * cappedRatio);
            
            if (sharesToSell > 0) {
                const revenue = sharesToSell * currentPrice;
                const feeCost = revenue * sellFeeRate;
                capital += (revenue - feeCost);
                shares -= sharesToSell;
                actionTaken = `SELL ${sharesToSell} shares`;
                
                if (currentPrice > lastBuyPrice) winningTrades++;
                
                markers.push({
                    time: dayData.time,
                    position: 'aboveBar',
                    color: '#ef4444',
                    shape: 'arrowDown',
                    text: 'SELL'
                });
                totalTrades++;
            }
        }

        const currentPortfolioValue = capital + (shares * currentPrice);
        if (currentPortfolioValue > peakValue) peakValue = currentPortfolioValue;
        const drawdown = (peakValue - currentPortfolioValue) / peakValue;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;

        history.push({
            date: dayData.time,
            price: currentPrice,
            signal: signal,
            reason: reason,
            factors: factors,
            action: actionTaken,
            portfolioValue: currentPortfolioValue
        });
    }

    const finalValue = capital + (shares * (sortedData[sortedData.length - 1]?.close || 0));
    const roi = ((finalValue - initialCapital) / initialCapital) * 100;
    const firstPrice = sortedData[0].close;
    const lastPrice = sortedData[sortedData.length - 1].close;
    const marketRoi = ((lastPrice - firstPrice) / firstPrice) * 100;
    
    const alpha = roi - marketRoi;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    return {
        initialCapital,
        finalValue,
        roi: roi.toFixed(2),
        marketRoi: marketRoi.toFixed(2),
        alpha: alpha.toFixed(2),
        maxDrawdown: (maxDrawdown * 100).toFixed(2),
        winRate: winRate.toFixed(2),
        trades: history.filter(h => h.action !== 'NONE'),
        markers,
        isAI: hasAIModel,
        lastSignal: history.length > 0 ? history[history.length - 1].signal : 'HOLD',
        lastReason: history.length > 0 ? history[history.length - 1].reason : '查無歷史訊號。',
        lastFactors: history.length > 0 ? history[history.length - 1].factors : []
    };
}

module.exports = { runBacktest };
