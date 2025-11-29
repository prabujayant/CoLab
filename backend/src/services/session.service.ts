import { getRedis } from './redis.service';

const SESSION_PREFIX = 'session:';

export const createSession = async (token: string, userId: string, ttlSeconds: number) => {
    const redis = getRedis();
    await redis.set(`${SESSION_PREFIX}${token}`, userId, 'EX', ttlSeconds);
};

export const getSessionUserId = async (token: string) => {
    const redis = getRedis();
    return redis.get(`${SESSION_PREFIX}${token}`);
};

export const deleteSession = async (token: string) => {
    const redis = getRedis();
    await redis.del(`${SESSION_PREFIX}${token}`);
};
