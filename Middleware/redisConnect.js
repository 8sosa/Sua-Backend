const Redis = require('ioredis');

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL environment variable is not set!");
}

const redisClient = new Redis(process.env.REDIS_URL, {
  tls: process.env.REDIS_URL.startsWith('rediss://') ? {} : undefined,
});

redisClient.on('error', (err) => console.error('Redis error:', err));
redisClient.on('connect', () => console.log('Connected to Redis!'));
redisClient.on('ready', () => console.log('Redis client is ready.'));

module.exports = redisClient;
