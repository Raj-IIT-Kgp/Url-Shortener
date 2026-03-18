const { Queue } = require('bullmq');

const myQueue = new Queue('clicks', { connection: { host: 'localhost', port: 6379 } });

async function addJob() {
    await myQueue.add('increment-click', { code: 'a0AN-1' });
    console.log('Job added successfully!');
    process.exit(0);
}

addJob().catch(console.error);
