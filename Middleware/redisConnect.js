const Redis = require('ioredis');

// Use the REDIS_URL from environment variables.
// Fallback to localhost only if running in development.
const redisClient = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  tls: process.env.REDIS_URL && process.env.REDIS_URL.startsWith('rediss://') ? {} : undefined,
});

redisClient.on('error', (err) => console.error('Redis error:', err));
redisClient.on('connect', () => console.log('Connected to Redis!'));
redisClient.on('ready', () => console.log('Redis client is ready.'));

module.exports = redisClient;