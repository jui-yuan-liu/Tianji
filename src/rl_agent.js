const tf = require('@tensorflow/tfjs');

/**
 * Dual-tower fusion DQN (Market + Metaphysics encoders → Q-head)
 */
class DqnAgent {
    constructor(stateSize, actionSize, hyperParams = {}) {
        this.stateSize = stateSize;
        this.actionSize = actionSize;
        this.memory = [];
        this.gamma = hyperParams.gamma !== undefined ? hyperParams.gamma : 0.95;
        this.epsilon = 1.0;
        this.epsilonMin = 0.01;
        this.epsilonDecay = hyperParams.epsilonDecay !== undefined ? hyperParams.epsilonDecay : 0.995;
        this.learningRate = hyperParams.learningRate !== undefined ? hyperParams.learningRate : 0.001;

        // v3 layout: market 0..marketDim-1, metaphysics marketDim..end
        this.marketDim = hyperParams.marketDim !== undefined ? hyperParams.marketDim : 8;
        this.metaDim = stateSize - this.marketDim;
        if (this.metaDim < 1 || this.marketDim < 1) {
            throw new Error(`Invalid dual-tower dims: state=${stateSize}, market=${this.marketDim}, meta=${this.metaDim}`);
        }

        this.model = this.buildModel();
    }

    buildModel() {
        const marketInput = tf.input({ shape: [this.marketDim], name: 'market_input' });
        const metaInput = tf.input({ shape: [this.metaDim], name: 'meta_input' });

        const marketTower = tf.layers.dense({ units: 32, activation: 'relu' }).apply(marketInput);
        const marketOut = tf.layers.dense({ units: 24, activation: 'relu' }).apply(marketTower);

        const metaTower = tf.layers.dense({ units: 48, activation: 'relu' }).apply(metaInput);
        const metaOut = tf.layers.dense({ units: 32, activation: 'relu' }).apply(metaTower);

        const fused = tf.layers.concatenate().apply([marketOut, metaOut]);
        const hidden = tf.layers.dense({ units: 48, activation: 'relu' }).apply(fused);
        const hidden2 = tf.layers.dense({ units: 32, activation: 'relu' }).apply(hidden);
        const output = tf.layers.dense({ units: this.actionSize, activation: 'linear' }).apply(hidden2);

        const model = tf.model({ inputs: [marketInput, metaInput], outputs: output });
        model.compile({ optimizer: tf.train.adam(this.learningRate), loss: 'meanSquaredError' });
        return model;
    }

    _splitState(state) {
        return [
            state.slice(0, this.marketDim),
            state.slice(this.marketDim),
        ];
    }

    remember(state, action, reward, nextState, done) {
        this.memory.push({ state, action, reward, nextState, done });
    }

    act(state) {
        if (Math.random() <= this.epsilon) {
            return Math.floor(Math.random() * this.actionSize);
        }
        const [market, meta] = this._splitState(state);
        const actValues = this.model.predict([tf.tensor2d([market]), tf.tensor2d([meta])]);
        const action = actValues.argMax(1).dataSync()[0];
        actValues.dispose();
        return action;
    }

    async replay(batchSize) {
        if (this.memory.length < batchSize) return null;

        const minibatch = [];
        for (let i = 0; i < batchSize; i++) {
            minibatch.push(this.memory[Math.floor(Math.random() * this.memory.length)]);
        }

        const markets = minibatch.map(m => this._splitState(m.state)[0]);
        const metas = minibatch.map(m => this._splitState(m.state)[1]);
        const nextMarkets = minibatch.map(m => this._splitState(m.nextState)[0]);
        const nextMetas = minibatch.map(m => this._splitState(m.nextState)[1]);

        const statesTensor = [tf.tensor2d(markets), tf.tensor2d(metas)];
        const nextStatesTensor = [tf.tensor2d(nextMarkets), tf.tensor2d(nextMetas)];

        const qNext = this.model.predict(nextStatesTensor).arraySync();
        const qTarget = this.model.predict(statesTensor).arraySync();

        for (let i = 0; i < batchSize; i++) {
            let target = minibatch[i].reward;
            if (!minibatch[i].done) {
                target = minibatch[i].reward + this.gamma * Math.max(...qNext[i]);
            }
            qTarget[i][minibatch[i].action] = target;
        }

        const qTargetTensor = tf.tensor2d(qTarget);
        const history = await this.model.fit(statesTensor, qTargetTensor, { epochs: 1, verbose: 0 });

        statesTensor[0].dispose();
        statesTensor[1].dispose();
        nextStatesTensor[0].dispose();
        nextStatesTensor[1].dispose();
        qTargetTensor.dispose();

        if (this.epsilon > this.epsilonMin) {
            this.epsilon *= this.epsilonDecay;
        }

        return history?.history?.loss?.[0] ?? null;
    }

    async saveWeights(dir) {
        const fs = require('fs');
        const weights = this.model.getWeights().map(w => w.arraySync());
        fs.writeFileSync(`${dir}/weights.json`, JSON.stringify({
            weights,
            marketDim: this.marketDim,
            stateSize: this.stateSize,
            actionSize: this.actionSize,
        }));
    }

    async loadWeights(dir) {
        const fs = require('fs');
        const weightsPath = `${dir}/weights.json`;
        if (!fs.existsSync(weightsPath)) return false;

        const payload = JSON.parse(fs.readFileSync(weightsPath, 'utf8'));
        const weightsArr = Array.isArray(payload) ? payload : payload.weights;

        if (payload.stateSize && payload.stateSize !== this.stateSize) {
            console.warn(`[DqnAgent] State size mismatch: saved=${payload.stateSize}, current=${this.stateSize}. Skipping weight load.`);
            return false;
        }

        const currentWeights = this.model.getWeights();
        if (weightsArr.length !== currentWeights.length) {
            console.warn('[DqnAgent] Weight shape count mismatch. Skipping weight load.');
            return false;
        }

        const tensors = weightsArr.map((w, i) => tf.tensor(w, currentWeights[i].shape));
        this.model.setWeights(tensors);
        return true;
    }

    async save(path) {
        await this.model.save(`file://${path}`);
    }

    async load(path) {
        this.model = await tf.loadLayersModel(`file://${path}/model.json`);
        this.model.compile({ optimizer: tf.train.adam(this.learningRate), loss: 'meanSquaredError' });
    }
}

module.exports = DqnAgent;
