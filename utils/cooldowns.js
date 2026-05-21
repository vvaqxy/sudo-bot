const db = require('../db.js');

async function checkCooldown(userId, commandName, cooldownSeconds) {
    try {
        const query = `
            INSERT INTO command_cooldowns (user_id, command_name, expires_at)
            VALUES ($1, $2, NOW() + $3 * INTERVAL '1 second')
            ON CONFLICT (user_id, command_name) 
            DO UPDATE SET 
                expires_at = CASE 
                    WHEN command_cooldowns.expires_at < NOW() THEN EXCLUDED.expires_at
                    ELSE command_cooldowns.expires_at
                END
            RETURNING (EXTRACT(EPOCH FROM (expires_at - NOW()))) AS remaining;
        `;

        const response = await db.query(query, [userId, commandName, cooldownSeconds]);
        const remainingSeconds = parseFloat(response.rows[0].remaining);

        if (remainingSeconds > 0) {
            return remainingSeconds.toFixed(1);
        }

        return null;
    } catch (error) {
        return null;
    }
}

module.exports = { checkCooldown };