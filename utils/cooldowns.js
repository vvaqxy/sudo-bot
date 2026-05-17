const redisClient = require('../redis.js');

/**
 * Checks if a user is on cooldown using Redis.
 * @param {string} userId - The Discord user ID
 * @param {string} commandName - The name of the command
 * @param {number} cooldownSeconds - Cooldown duration in seconds
 * @returns {Promise<string|null>} - Returns remaining time string if on cooldown, else null.
 */
async function checkCooldown(userId, commandName, cooldownSeconds) {
    const key = `cooldown:${commandName}:${userId}`;

    const result = await redisClient.set(key, 'active', {
        NX: true,
        PX: cooldownSeconds * 1000
    });

    if (result === 'OK') {
        return null;
    }

    const ttl = await redisClient.pTTL(key);
    
    const remaining = (ttl / 1000).toFixed(1);
    return remaining;
}

module.exports = { checkCooldown };