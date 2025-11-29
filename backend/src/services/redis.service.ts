import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redisClient: Redis | null = null;
let redisPublisher: Redis | null = null;
let redisSubscriber: Redis | null = null;

export const initRedis = async () => {
    if (redisClient) {
        return;
    }

    redisClient = new Redis(REDIS_URL);
    redisPublisher = new Redis(REDIS_URL);
    redisSubscriber = new Redis(REDIS_URL);

    await redisClient.ping();
    console.log('Redis connected');
};

export const getRedis = () => {
    if (!redisClient) {
        throw new Error('Redis has not been initialized');
    }
    return redisClient;
};

export const getRedisPublisher = () => {
    if (!redisPublisher) {
        throw new Error('Redis has not been initialized');
    }
    return redisPublisher;
};

export const getRedisSubscriber = () => {
    if (!redisSubscriber) {
        throw new Error('Redis has not been initialized');
    }
    return redisSubscriber;
};

export const disconnectRedis = async () => {
    await redisClient?.quit();
    await redisPublisher?.quit();
    await redisSubscriber?.quit();
};
