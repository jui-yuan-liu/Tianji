const { calculateLifePalace, calculateWealthPalace } = require('./ziwei_core');
const { getFiveElementBureau, getZiWeiStarPosition, getTianFuStarPosition, getAllMajorStars } = require('./ziwei_stars');
const { getAnnualLifePalace, getAnnualTransformations } = require('./ziwei_annual');
const { getMonthlyLifePalace, getDailyLifePalace, getTimeTransformations } = require('./ziwei_periods');
const { Solar } = require('lunar-javascript');

class TianjiEnv {
    constructor(marketData, userBirth) {
        this.marketData = [...marketData].sort((a, b) => new Date(a.time) - new Date(b.time));
        this.userBirth = userBirth;
        this.currentStep = 0;
        this.initialCapital = 100000;
        this.capital = this.initialCapital;
        this.shares = 0;
        this.portfolioValue = this.initialCapital;
        
        // Compute base astrology data once
        const bYear = parseInt(userBirth.year);
        const bMonth = parseInt(userBirth.month);
        const bDay = parseInt(userBirth.day);
        const bHour = parseInt(userBirth.hour);
        const bHourBranchIdx = Math.floor(((bHour + 1) % 24) / 2); // 0=Zi, 1=Chou...

        const birthSolar = Solar.fromYmd(bYear, bMonth, bDay);
        const birthLunar = birthSolar.getLunar();
        const lifePalaceIdx = calculateLifePalace(birthLunar.getMonth(), bHourBranchIdx);
        const yearGanIndex = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"].indexOf(birthLunar.getYearGan());
        const fiveElementBureau = getFiveElementBureau(yearGanIndex, lifePalaceIdx);
        const ziWeiPos = getZiWeiStarPosition(fiveElementBureau, birthLunar.getDay());
        const tianFuPos = getTianFuStarPosition(ziWeiPos);
        this.allStars = getAllMajorStars(ziWeiPos, tianFuPos);
        
        this.birthHourBranchIdx = bHourBranchIdx;
        this.birthMonth = birthLunar.getMonth();

        // Find max price for normalization
        this.maxPrice = Math.max(...this.marketData.map(d => d.close));
        
        // Calculate fortune penalty factor (simple proxy for Fortune Palace)
        this.fortuneRiskFactor = (lifePalaceIdx % 3 === 0) ? 1.2 : 1.0; 
        
        // Action definitions: [0=Hold, 1-5=Buy, 6-10=Sell]
        this.actionMap = [
            { type: 'HOLD', ratio: 0 },
            { type: 'BUY', ratio: 0.05 },
            { type: 'BUY', ratio: 0.10 },
            { type: 'BUY', ratio: 0.20 },
            { type: 'BUY', ratio: 0.50 },
            { type: 'BUY', ratio: 1.00 },
            { type: 'SELL', ratio: 0.05 },
            { type: 'SELL', ratio: 0.10 },
            { type: 'SELL', ratio: 0.20 },
            { type: 'SELL', ratio: 0.50 },
            { type: 'SELL', ratio: 1.00 }
        ];

        this.majorStarNames = ["紫微", "天機", "太陽", "武曲", "天同", "廉貞", "天府", "太陰", "貪狼", "巨門", "天相", "天梁", "七殺", "破軍"];
    }

    reset() {
        this.currentStep = 0;
        this.capital = this.initialCapital;
        this.shares = 0;
        this.portfolioValue = this.initialCapital;
        return this._getState();
    }

    _getState() {
        if (this.currentStep >= this.marketData.length) return Array(this.getStateSize()).fill(0);
        
        const todayData = this.marketData[this.currentStep];
        const prevData = this.currentStep > 0 ? this.marketData[this.currentStep - 1] : todayData;
        
        const priceNorm = todayData.close / this.maxPrice;
        const priceChangePct = prevData.close > 0 ? (todayData.close - prevData.close) / prevData.close : 0;
        
        // Portfolio features
        const capitalNorm = this.capital / this.initialCapital;
        const sharesNorm = (this.shares * todayData.close) / this.initialCapital;
        
        // Calculate daily astrology features
        const targetDate = new Date(todayData.time);
        const solar = Solar.fromYmd(targetDate.getFullYear(), targetDate.getMonth() + 1, targetDate.getDate());
        const lunar = solar.getLunar();
        
        // 1. Earthly Branches (De-zhi) changes
        const currentYear = targetDate.getFullYear();
        const targetYearBranchIdx = (currentYear - 4) % 12; // 0=Zi
        const annualLifePos = getAnnualLifePalace(targetYearBranchIdx);
        // Correcting parameters: pass current lunar month
        const monthlyLifePos = getMonthlyLifePalace(annualLifePos, this.birthMonth, this.birthHourBranchIdx, lunar.getMonth());
        const dailyLifePos = getDailyLifePalace(monthlyLifePos, lunar.getDay());
        
        const annPosNorm = annualLifePos / 11.0;
        const monPosNorm = monthlyLifePos / 11.0;
        const dayPosNorm = dailyLifePos / 11.0;

        // 2. Transformations (Four Transformations: Lu, Quan, Ke, Ji)
        const yearTrans = getAnnualTransformations(lunar.getYearGan());
        const monthTrans = getTimeTransformations(lunar.getMonthGan()); 
        const dayTrans = getTimeTransformations(lunar.getDayGan());

        const getTransFeatures = (trans, palacePos) => {
            const starsAtPalace = this.allStars.filter(s => s.position === palacePos).map(s => s.name);
            return [
                starsAtPalace.includes(trans.lu) ? 1 : 0,
                starsAtPalace.includes(trans.quan) ? 1 : 0,
                starsAtPalace.includes(trans.ke) ? 1 : 0,
                starsAtPalace.includes(trans.ji) ? 1 : 0
            ];
        };

        const yearTransFeatures = getTransFeatures(yearTrans, annualLifePos);
        const monthTransFeatures = getTransFeatures(monthTrans, monthlyLifePos);
        const dayTransFeatures = getTransFeatures(dayTrans, dailyLifePos);

        // 3. Fourteen Major Stars (presence in life palaces)
        const getStarFeatures = (palacePos) => {
            const starsAtPalace = this.allStars.filter(s => s.position === palacePos).map(s => s.name);
            return this.majorStarNames.map(name => starsAtPalace.includes(name) ? 1 : 0);
        };

        const yearStarFeatures = getStarFeatures(annualLifePos);
        const monthStarFeatures = getStarFeatures(monthlyLifePos);
        const dayStarFeatures = getStarFeatures(dailyLifePos);

        // Concatenate all features
        return [
            priceNorm, priceChangePct, 
            capitalNorm, sharesNorm,
            annPosNorm, monPosNorm, dayPosNorm,
            ...yearTransFeatures, ...monthTransFeatures, ...dayTransFeatures,
            ...yearStarFeatures, ...monthStarFeatures, ...dayStarFeatures
        ];
    }

    getStateSize() {
        return 2 + 2 + 3 + (4 * 3) + (14 * 3);
    }

    getActionSize() {
        return this.actionMap.length;
    }

    step(actionIdx) {
        const action = this.actionMap[actionIdx] || { type: 'HOLD', ratio: 0 };
        
        if (this.currentStep >= this.marketData.length) {
            return { state: this._getState(), reward: 0, done: true, info: {} };
        }

        const currentPrice = this.marketData[this.currentStep].close;
        const prevPortfolioValue = this.portfolioValue;

        // Execute Action
        const buyFeeRate = 0.001425;
        const sellFeeRate = 0.004425;

        if (action.type === 'BUY') {
            // Constraint: single buy max 20% of current cash
            const cappedRatio = Math.min(action.ratio, 0.20);
            const amountToSpend = this.capital * cappedRatio;
            const sharesToBuy = Math.floor(amountToSpend / (currentPrice * (1 + buyFeeRate)));
            
            if (sharesToBuy > 0) {
                const tradeCost = sharesToBuy * currentPrice;
                const feeCost = tradeCost * buyFeeRate;
                this.shares += sharesToBuy;
                this.capital -= (tradeCost + feeCost);
            }
        } else if (action.type === 'SELL') {
            // Constraint: sell cap limited to 50% of current position
            const cappedRatio = Math.min(action.ratio, 0.50);
            const sharesToSell = Math.floor(this.shares * cappedRatio);
            
            if (sharesToSell > 0) {
                const revenue = sharesToSell * currentPrice;
                const feeCost = revenue * sellFeeRate;
                this.capital += (revenue - feeCost);
                this.shares -= sharesToSell;
            }
        }

        // Calculate new portfolio value
        this.portfolioValue = this.capital + (this.shares * currentPrice);
        
        // Calculate reward: simple change in portfolio value
        let reward = (this.portfolioValue - prevPortfolioValue) / this.initialCapital;
        
        // Inaction/Inflation Penalty: Simulate inflation by penalizing uninvested cash.
        // Approx 2.5% annual inflation over 250 trading days = 0.0001 daily penalty.
        // This encourages the agent to find trading opportunities rather than just holding cash.
        const dailyInflationRate = 0.0001;
        const inflationPenalty = (this.capital / this.initialCapital) * dailyInflationRate;
        reward -= inflationPenalty;
        
        // If holding stock during a price drop and fortune is weak, add penalty
        if (this.shares > 0 && reward < 0) {
            reward *= this.fortuneRiskFactor; 
        }
        
        this.currentStep++;
        const done = this.currentStep >= this.marketData.length - 1;
        const state = this._getState();
        
        return { state, reward, done, info: { portfolioValue: this.portfolioValue, capital: this.capital, shares: this.shares } };
    }
}

module.exports = TianjiEnv;
