const tf = require('@tensorflow/tfjs');

class DqnAgent {
    constructor(stateSize, actionSize, hyperParams = {}) {
        this.stateSize = stateSize;
        this.actionSize = actionSize;
        this.memory = [];
        this.gamma = hyperParams.gamma !== undefined ? hyperParams.gamma : 0.95; // discount rate
        this.epsilon = 1.0;  // exploration rate
        this.epsilonMin = 0.01;
        this.epsilonDecay = hyperParams.epsilonDecay !== undefined ? hyperParams.epsilonDecay : 0.995;
        this.learningRate = hyperParams.learningRate !== undefined ? hyperParams.learningRate : 0.001;
        this.model = this.buildModel();
    }

    buildModel() {
        const model = tf.sequential();
        model.add(tf.layers.dense({ units: 24, inputShape: [this.stateSize], activation: 'relu' }));
        model.add(tf.layers.dense({ units: 24, activation: 'relu' }));
        model.add(tf.layers.dense({ units: 24, activation: 'relu' }));
        model.add(tf.layers.dense({ units: 24, activation: 'relu' }));
        model.add(tf.layers.dense({ units: this.actionSize, activation: 'linear' }));
        model.compile({ optimizer: tf.train.adam(this.learningRate), loss: 'meanSquaredError' });
        return model;
    }

    remember(state, action, reward, nextState, done) {
        this.memory.push({ state, action, reward, nextState, done });
    }

    act(state) {
        if (Math.random() <= this.epsilon) {
            return Math.floor(Math.random() * this.actionSize);
        }
        const stateTensor = tf.tensor2d([state]);
        const actValues = this.model.predict(stateTensor);
        const action = actValues.argMax(1).dataSync()[0];
        stateTensor.dispose();
        actValues.dispose();
        return action;
    }

    async replay(batchSize) {
        if (this.memory.length < batchSize) return;
        
        const minibatch = [];
        for (let i = 0; i < batchSize; i++) {
            const index = Math.floor(Math.random() * this.memory.length);
            minibatch.push(this.memory[index]);
        }
        
        const states = minibatch.map(m => m.state);
        const statesTensor = tf.tensor2d(states);
        const nextStates = minibatch.map(m => m.nextState);
        const nextStatesTensor = tf.tensor2d(nextStates);
        
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
        
        await this.model.fit(statesTensor, qTargetTensor, { epochs: 1, verbose: 0 });
        
        statesTensor.dispose();
        nextStatesTensor.dispose();
        qTargetTensor.dispose();

        if (this.epsilon > this.epsilonMin) {
            this.epsilon *= this.epsilonDecay;
        }
    }

    async saveWeights(dir) {
        const fs = require('fs');
        const weights = this.model.getWeights().map(w => w.arraySync());
        fs.writeFileSync(`${dir}/weights.json`, JSON.stringify(weights));
    }

    async loadWeights(dir) {
        const fs = require('fs');
        if (fs.existsSync(`${dir}/weights.json`)) {
            const weightsArr = JSON.parse(fs.readFileSync(`${dir}/weights.json`, 'utf8'));
            const currentWeights = this.model.getWeights();
            const tensors = weightsArr.map((w, i) => tf.tensor(w, currentWeights[i].shape));
            this.model.setWeights(tensors);
        }
    }

    async save(path) {
        await this.model.save(`file://${path}`);
    }

    async load(path) {
        this.model = await tf.loadLayersModel(`file://${path}/model.json`);
        // compile again just in case
        this.model.compile({ optimizer: tf.train.adam(this.learningRate), loss: 'meanSquaredError' });
    }
}

module.exports = DqnAgent;
