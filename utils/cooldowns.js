const cooldowns = new Map();

function checkCooldown(userId, commandName, cooldownTime) {
    const now = Date.now();

    if (!cooldowns.has(commandName)) {
        cooldowns.set(commandName, new Map());
    }

    const timestamps = cooldowns.get(commandName);
    const expirationTime = timestamps.get(userId) || 0;

    if (now < expirationTime) {
        const remaining = ((expirationTime - now) / 1000).toFixed(1);
        return remaining;
    }

    timestamps.set(userId, now + cooldownTime * 1000);
    return null;
}

module.exports = { checkCooldown };