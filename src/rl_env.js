const { Solar } = require('lunar-javascript');
const {
    FEATURE_SCHEMA_VERSION,
    buildNatalContext,
    buildStateVector,
    getStateSize,
    normalizeFeatureConfig,
} = require('./rl_features');

const TRADING_DAYS_PER_YEAR = 252;
const DEFAULT_ANNUAL_INFLATION_RATE = 0.02; // 台灣近年通膨約 2%
const DEFAULT_INACTION_PENALTY_RATE = 0.00003; // 每日未交易額外懲罰（佔初始資金）

class TianjiEnv {
    constructor(marketData, userBirth, featureConfig, rewardConfig = {}) {
        this.marketData = [...marketData].sort((a, b) => new Date(a.time) - new Date(b.time));
        this.userBirth = userBirth;
        this.featureConfig = normalizeFeatureConfig(featureConfig);
        this.currentStep = 0;
        this.initialCapital = 100000;
        this.capital = this.initialCapital;
        this.shares = 0;
        this.portfolioValue = this.initialCapital;
        this.featureSchemaVersion = FEATURE_SCHEMA_VERSION;

        this.annualInflationRate = rewardConfig.annualInflationRate ?? DEFAULT_ANNUAL_INFLATION_RATE;
        this.tradingDaysPerYear = rewardConfig.tradingDaysPerYear ?? TRADING_DAYS_PER_YEAR;
        this.inactionPenaltyRate = rewardConfig.inactionPenaltyRate ?? DEFAULT_INACTION_PENALTY_RATE;
        this.dailyInflationRate = this.annualInflationRate / this.tradingDaysPerYear;
        this.cumulativeInflationLoss = 0;
        this.cumulativeInactionPenalty = 0;

        this.natalCtx = buildNatalContext(userBirth);
        this.maxPrice = Math.max(...this.marketData.map(d => d.close), 1);

        // 福德宮風險偏好代理：命宮與財帛宮地支差異
        const riskSpread = Math.abs(this.natalCtx.lifePalaceIdx - this.natalCtx.wealthPalaceIdx);
        this.fortuneRiskFactor = riskSpread <= 3 ? 1.15 : 1.0;

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
            { type: 'SELL', ratio: 1.00 },
        ];
    }

    reset() {
        this.currentStep = 0;
        this.capital = this.initialCapital;
        this.shares = 0;
        this.portfolioValue = this.initialCapital;
        this.cumulativeInflationLoss = 0;
        this.cumulativeInactionPenalty = 0;
        return this._getState();
    }

    _getState() {
        if (this.currentStep >= this.marketData.length) {
            return Array(this.getStateSize()).fill(0);
        }
        const today = this.marketData[this.currentStep];
        return buildStateVector({
            marketData: this.marketData,
            step: this.currentStep,
            maxPrice: this.maxPrice,
            capital: this.capital,
            shares: this.shares,
            initialCapital: this.initialCapital,
            natalCtx: this.natalCtx,
            featureConfig: this.featureConfig,
        });
    }

    getStateSize() {
        return getStateSize(this.featureConfig);
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
        const buyFeeRate = 0.001425;
        const sellFeeRate = 0.004425;
        let traded = false;

        if (action.type === 'BUY') {
            const cappedRatio = Math.min(action.ratio, 0.20);
            const amountToSpend = this.capital * cappedRatio;
            const sharesToBuy = Math.floor(amountToSpend / (currentPrice * (1 + buyFeeRate)));
            if (sharesToBuy > 0) {
                const tradeCost = sharesToBuy * currentPrice;
                const feeCost = tradeCost * buyFeeRate;
                this.shares += sharesToBuy;
                this.capital -= tradeCost + feeCost;
                traded = true;
            }
        } else if (action.type === 'SELL') {
            const cappedRatio = Math.min(action.ratio, 0.50);
            const sharesToSell = Math.floor(this.shares * cappedRatio);
            if (sharesToSell > 0) {
                const revenue = sharesToSell * currentPrice;
                const feeCost = revenue * sellFeeRate;
                this.capital += revenue - feeCost;
                this.shares -= sharesToSell;
                traded = true;
            }
        }

        // 現金購買力因通膨每日萎縮（僅影響閒置現金）
        const inflationLoss = this.capital * this.dailyInflationRate;
        this.capital -= inflationLoss;
        this.cumulativeInflationLoss += inflationLoss;

        this.portfolioValue = this.capital + this.shares * currentPrice;

        let reward = (this.portfolioValue - prevPortfolioValue) / this.initialCapital;

        // 未實際成交（觀望 / 空手）額外懲罰，鼓勵適度參與市場
        let inactionPenalty = 0;
        if (!traded) {
            const cashRatio = this.capital / this.initialCapital;
            inactionPenalty = this.inactionPenaltyRate * Math.max(cashRatio, 0);
            reward -= inactionPenalty;
            this.cumulativeInactionPenalty += inactionPenalty * this.initialCapital;
        }

        if (this.shares > 0 && reward < 0) {
            reward *= this.fortuneRiskFactor;
        }

        this.currentStep++;
        const done = this.currentStep >= this.marketData.length - 1;
        const exposure = this.portfolioValue > 0 ? (this.shares * currentPrice) / this.portfolioValue : 0;

        return {
            state: this._getState(),
            reward,
            done,
            info: {
                portfolioValue: this.portfolioValue,
                capital: this.capital,
                shares: this.shares,
                exposure,
                price: currentPrice,
                traded,
                inflationLoss,
                inactionPenalty,
                cumulativeInflationLoss: this.cumulativeInflationLoss,
            },
        };
    }
}

module.exports = TianjiEnv;
module.exports.TRADING_DAYS_PER_YEAR = TRADING_DAYS_PER_YEAR;
module.exports.DEFAULT_ANNUAL_INFLATION_RATE = DEFAULT_ANNUAL_INFLATION_RATE;
module.exports.DEFAULT_INACTION_PENALTY_RATE = DEFAULT_INACTION_PENALTY_RATE;
