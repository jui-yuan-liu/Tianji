const TianjiEnv = require('./rl_env');
const DqnAgent = require('./rl_agent');
const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const path = require('path');

async function trainModel(userId, userBirth, marketData, epochs, hyperParams = {}, onProgress, baseModelId) {
    const env = new TianjiEnv(marketData, userBirth);
    const stateSize = env.getStateSize();
    const actionSize = env.getActionSize();
    const agent = new DqnAgent(stateSize, actionSize, hyperParams);
    
    if (baseModelId) {
        const oldDir = path.resolve(__dirname, '../models', `user_${userId}`, baseModelId);
        await agent.loadWeights(oldDir);
    }
    const batchSize = hyperParams.batchSize !== undefined ? hyperParams.batchSize : 32;

    let totalRewards = [];

    for (let e = 0; e < epochs; e++) {
        let state = env.reset();
        let totalReward = 0;
        let done = false;

        while (!done) {
            const action = agent.act(state);
            const nextStep = env.step(action);
            
            agent.remember(state, action, nextStep.reward, nextStep.state, nextStep.done);
            state = nextStep.state;
            totalReward += nextStep.reward;
            done = nextStep.done;

            if (done) {
                totalRewards.push(totalReward);
                // Report progress
                if (onProgress) {
                    onProgress({
                        epoch: e + 1,
                        totalEpochs: epochs,
                        totalReward: totalReward.toFixed(4),
                        epsilon: agent.epsilon.toFixed(4),
                        finalPortfolio: env.portfolioValue.toFixed(2)
                    });
                }
            }
        }
        await agent.replay(batchSize);
    }

    // Save model to disk
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
        
        // Final ROI
        const initialCapital = env.initialCapital;
        const finalPortfolio = env.portfolioValue;
        const roi = (((finalPortfolio - initialCapital) / initialCapital) * 100).toFixed(2);
        
        // Update models.json index
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
            hyperParams: {
                batchSize: batchSize,
                learningRate: agent.learningRate,
                gamma: agent.gamma,
                epsilonDecay: agent.epsilonDecay
            },
            baseModelId: baseModelId || null,
            finalPortfolio: finalPortfolio.toFixed(2),
            roi: roi
        };
        
        indexData.push(modelMeta);
        fs.writeFileSync(indexFile, JSON.stringify(indexData, null, 2));

        onProgress({ status: 'completed', message: 'Model saved successfully', path: modelDir, meta: modelMeta });
    } catch (err) {
        console.error("Save error:", err);
    }
    
    return totalRewards;
}

module.exports = { trainModel };
