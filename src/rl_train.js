const TianjiEnv = require('./rl_env');
const DqnAgent = require('./rl_agent');
const {
    FEATURE_SCHEMA_VERSION,
    getMarketDim,
    getEnabledFeatureGroups,
    normalizeFeatureConfig,
} = require('./rl_features');
const fs = require('fs');
const path = require('path');

function buildProgressPayload(base) {
    return {
        type: 'tick',
        ...base,
    };
}

async function trainModel(userId, userBirth, marketData, epochs, hyperParams = {}, onProgress, baseModelId, featureConfig) {
    const normalizedFeatures = normalizeFeatureConfig(featureConfig);
    const env = new TianjiEnv(marketData, userBirth, normalizedFeatures);
    const stateSize = env.getStateSize();
    const actionSize = env.getActionSize();
    const marketDim = getMarketDim(normalizedFeatures);
    const agent = new DqnAgent(stateSize, actionSize, {
        ...hyperParams,
        marketDim,
    });

    if (baseModelId) {
        const oldDir = path.resolve(__dirname, '../models', `user_${userId}`, baseModelId);
        await agent.loadWeights(oldDir);
    }
    const batchSize = hyperParams.batchSize !== undefined ? hyperParams.batchSize : 32;
    const initialCapital = env.initialCapital;
    const totalStepsPerEpoch = Math.max(env.marketData.length - 1, 1);
    const tickInterval = Math.max(1, Math.floor(totalStepsPerEpoch / 50));

    let totalRewards = [];
    let globalTick = 0;

    for (let e = 0; e < epochs; e++) {
        let state = env.reset();
        let totalReward = 0;
        let done = false;
        let episodeTrades = 0;
        let episodePeak = initialCapital;
        let episodeMaxDrawdown = 0;
        let lastLoss = null;

        while (!done) {
            const prevShares = env.shares;
            const action = agent.act(state);
            const nextStep = env.step(action);

            if (env.shares !== prevShares) episodeTrades++;

            agent.remember(state, action, nextStep.reward, nextStep.state, nextStep.done);
            state = nextStep.state;
            totalReward += nextStep.reward;
            done = nextStep.done;

            episodePeak = Math.max(episodePeak, env.portfolioValue);
            const drawdown = episodePeak > 0 ? (episodePeak - env.portfolioValue) / episodePeak : 0;
            episodeMaxDrawdown = Math.max(episodeMaxDrawdown, drawdown);

            const step = env.currentStep;
            const shouldReport = done || step % tickInterval === 0 || step === 1;
            if (shouldReport && onProgress) {
                globalTick++;
                const roi = ((env.portfolioValue - initialCapital) / initialCapital) * 100;
                const exposure = nextStep.info.exposure ?? 0;
                onProgress(buildProgressPayload({
                    tick: globalTick,
                    epoch: e + 1,
                    totalEpochs: epochs,
                    step,
                    totalSteps: totalStepsPerEpoch,
                    progress: Number(((step / totalStepsPerEpoch) * 100).toFixed(1)),
                    totalReward: Number(totalReward.toFixed(6)),
                    epsilon: Number(agent.epsilon.toFixed(4)),
                    portfolio: Number(env.portfolioValue.toFixed(2)),
                    roi: Number(roi.toFixed(2)),
                    exposure: Number(exposure.toFixed(4)),
                    maxDrawdown: Number((episodeMaxDrawdown * 100).toFixed(2)),
                    trades: episodeTrades,
                    loss: lastLoss,
                    memorySize: agent.memory.length,
                }));
                await new Promise(resolve => setImmediate(resolve));
            }
        }

        const replayLoss = await agent.replay(batchSize);
        if (replayLoss != null) lastLoss = Number(replayLoss.toFixed(6));

        totalRewards.push(totalReward);

        if (onProgress) {
            globalTick++;
            const roi = ((env.portfolioValue - initialCapital) / initialCapital) * 100;
            const lastIdx = Math.min(env.currentStep, env.marketData.length - 1);
            const lastPrice = env.marketData[lastIdx]?.close || 0;
            const exposure = env.portfolioValue > 0 ? (env.shares * lastPrice) / env.portfolioValue : 0;
            onProgress({
                type: 'epoch',
                tick: globalTick,
                epoch: e + 1,
                totalEpochs: epochs,
                step: totalStepsPerEpoch,
                totalSteps: totalStepsPerEpoch,
                progress: 100,
                totalReward: Number(totalReward.toFixed(6)),
                epsilon: Number(agent.epsilon.toFixed(4)),
                portfolio: Number(env.portfolioValue.toFixed(2)),
                roi: Number(roi.toFixed(2)),
                exposure: Number(exposure.toFixed(4)),
                maxDrawdown: Number((episodeMaxDrawdown * 100).toFixed(2)),
                trades: episodeTrades,
                loss: lastLoss,
                memorySize: agent.memory.length,
            });
        }
    }

    const timestamp = Date.now().toString();
    const modelDir = path.resolve(__dirname, '../models', `user_${userId}`, timestamp);
    const userDir = path.resolve(__dirname, '../models', `user_${userId}`);

    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
    }
    if (!fs.existsSync(modelDir)) {
        fs.mkdirSync(modelDir, { recursive: true });
    }

    try {
        const modelJson = agent.model.toJSON();
        fs.writeFileSync(path.join(modelDir, 'model.json'), JSON.stringify(modelJson));
        await agent.saveWeights(modelDir);

        const finalPortfolio = env.portfolioValue;
        const roi = (((finalPortfolio - initialCapital) / initialCapital) * 100).toFixed(2);

        const indexFile = path.join(userDir, 'models.json');
        let indexData = [];
        if (fs.existsSync(indexFile)) {
            indexData = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
        }

        const modelMeta = {
            id: timestamp,
            name: baseModelId ? `AI 微調 #${indexData.length + 1} (${epochs} 世代)` : `AI 訓練 #${indexData.length + 1} (${epochs} 世代)`,
            createdAt: new Date().toISOString(),
            epochs: epochs,
            featureSchemaVersion: FEATURE_SCHEMA_VERSION,
            stateSize,
            marketDim,
            enabledFeatures: normalizedFeatures,
            featureGroups: getEnabledFeatureGroups(normalizedFeatures),
            architecture: 'dual-tower-dqn-v3',
            rewardConfig: {
                annualInflationRate: env.annualInflationRate,
                tradingDaysPerYear: env.tradingDaysPerYear,
                inactionPenaltyRate: env.inactionPenaltyRate,
                dailyInflationRate: env.dailyInflationRate,
            },
            hyperParams: {
                batchSize: batchSize,
                learningRate: agent.learningRate,
                gamma: agent.gamma,
                epsilonDecay: agent.epsilonDecay,
            },
            baseModelId: baseModelId || null,
            finalPortfolio: finalPortfolio.toFixed(2),
            roi: roi,
        };

        indexData.push(modelMeta);
        fs.writeFileSync(indexFile, JSON.stringify(indexData, null, 2));

        onProgress({ status: 'completed', message: 'Model saved successfully', path: modelDir, meta: modelMeta });
    } catch (err) {
        console.error('Save error:', err);
    }

    return totalRewards;
}

module.exports = { trainModel };
