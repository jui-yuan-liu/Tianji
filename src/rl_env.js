const {
    FEATURE_SCHEMA_VERSION,
    buildNatalContext,
    buildStateVector,
    getStateSize,
    normalizeFeatureConfig,
    ADAPTIVE_LOOKBACK_DAYS,
    DEFAULT_REWARD_CLIP_PCT,
} = require('./rl_features');

const TRADING_DAYS_PER_YEAR = 252;
const DEFAULT_ANNUAL_INFLATION_RATE = 0.02;
const DEFAULT_INACTION_PENALTY_RATE = 0.00003;

function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
}

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
        this.lookbackDays = rewardConfig.lookbackDays ?? ADAPTIVE_LOOKBACK_DAYS;
        this.rewardClipPct = rewardConfig.rewardClipPct ?? DEFAULT_REWARD_CLIP_PCT;
        this.dailyInflationRate = this.annualInflationRate / this.tradingDaysPerYear;
        this.cumulativeInflationLoss = 0;
        this.cumulativeInactionPenalty = 0;

        this.normConfig = {
            lookbackDays: this.lookbackDays,
            rewardClipPct: this.rewardClipPct,
        };

        this.natalCtx = buildNatalContext(userBirth);

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
        return buildStateVector({
            marketData: this.marketData,
            step: this.currentStep,
            capital: this.capital,
            shares: this.shares,
            portfolioValue: this.portfolioValue,
            natalCtx: this.natalCtx,
            featureConfig: this.featureConfig,
            normConfig: this.normConfig,
        });
    }

    getStateSize() {
        return getStateSize(this.featureConfig);
    }

    getActionSize() {
        return this.actionMap.length;
    }

    _computeDailyReturn(prevPortfolioValue, nextPortfolioValue) {
        if (prevPortfolioValue <= 0) return 0;
        const rawPct = (nextPortfolioValue - prevPortfolioValue) / prevPortfolioValue;
        return clamp(rawPct, -this.rewardClipPct, this.rewardClipPct) / this.rewardClipPct;
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

        const inflationLoss = this.capital * this.dailyInflationRate;
        this.capital -= inflationLoss;
        this.cumulativeInflationLoss += inflationLoss;

        this.portfolioValue = this.capital + this.shares * currentPrice;

        let reward = this._computeDailyReturn(prevPortfolioValue, this.portfolioValue);

        let inactionPenalty = 0;
        if (!traded) {
            const cashWeight = this.portfolioValue > 0 ? this.capital / this.portfolioValue : 0;
            inactionPenalty = this.inactionPenaltyRate * Math.max(cashWeight, 0);
            reward -= inactionPenalty;
            this.cumulativeInactionPenalty += inactionPenalty * prevPortfolioValue;
        }

        if (this.shares > 0 && reward < 0) {
            reward *= this.fortuneRiskFactor;
        }

        this.currentStep++;
        const done = this.currentStep >= this.marketData.length - 1;
        const exposure = this.portfolioValue > 0 ? (this.shares * currentPrice) / this.portfolioValue : 0;
        const dailyReturnPct = prevPortfolioValue > 0
            ? ((this.portfolioValue - prevPortfolioValue) / prevPortfolioValue) * 100
            : 0;

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
                dailyReturnPct,
            },
        };
    }
}

module.exports = TianjiEnv;
module.exports.TRADING_DAYS_PER_YEAR = TRADING_DAYS_PER_YEAR;
module.exports.DEFAULT_ANNUAL_INFLATION_RATE = DEFAULT_ANNUAL_INFLATION_RATE;
module.exports.DEFAULT_INACTION_PENALTY_RATE = DEFAULT_INACTION_PENALTY_RATE;
