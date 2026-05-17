const db = require('../../db.js');
const redisClient = require('../../redis.js');
const logger = require('../../logger.js');
const modules = require('../../config/modules.js');
const { EmbedBuilder } = require('discord.js');

function buildBar(current, max, length = 10) {
    if (!max || max <= 0) return `[${'░'.repeat(length)}] 0.0%`;
    const pct = Math.min(current / max, 1);
    const filled = Math.round(pct * length);
    return `[${'█'.repeat(filled)}${'░'.repeat(length - filled)}] ${(pct * 100).toFixed(1)}%`;
}

module.exports = {
    name: 'fetch',
    description: "Check a user's profile and balance",
    cooldown: 5,
    options: [
        {
            name: 'user',
            required: false,
            type: 6,
            description: 'The user to check'
        },
    ],

    async execute(interaction) {
        const startTime = Date.now();

        const targetUser = interaction.options.getUser('user') || interaction.user;
        const targetId = targetUser.id;
        const cacheKey = `profile:${targetId}`;

        try {
            const cachedProfile = await redisClient.get(cacheKey);
            let coinCount, vaultCount, vaultLimit, ownedModules, isWhitelisted;

            if (cachedProfile) {
                const profileData = JSON.parse(cachedProfile);
                coinCount    = profileData.coins          ?? 100;
                vaultCount   = profileData.vault          ?? 0;
                vaultLimit   = profileData.vault_limit    ?? 50000;
                ownedModules = profileData.modules        ?? [];
                isWhitelisted = profileData.is_whitelisted ?? false;
                logger.info(`[REDIS] HIT: ${targetUser.username} - Time: ${Date.now() - startTime}ms`);
            } else {
                logger.warn(`[DB] Cache Miss for ${targetUser.username}`);

                const response = await db.query(`
                    INSERT INTO users (discord_id, coins, vault)
                    VALUES ($1, 100, 0)
                    ON CONFLICT (discord_id)
                    DO UPDATE SET discord_id = EXCLUDED.discord_id
                    RETURNING coins,
                              COALESCE(vault, 0)        AS vault,
                              COALESCE(vault_limit, 50000) AS vault_limit,
                              COALESCE(inventory, '[]') AS modules,
                              COALESCE(is_whitelisted, false) AS is_whitelisted;
                `, [targetId]);

                const row     = response.rows[0];
                coinCount     = row.coins     ?? 100;
                vaultCount    = row.vault     ?? 0;
                vaultLimit    = row.vault_limit ?? 50000;
                ownedModules  = typeof row.modules === 'string' ? JSON.parse(row.modules) : (row.modules ?? []);
                isWhitelisted = row.is_whitelisted ?? false;

                redisClient.set(cacheKey, JSON.stringify({
                    coins:         coinCount,
                    vault:         vaultCount,
                    vault_limit:   vaultLimit,
                    modules:       ownedModules,
                    is_whitelisted: isWhitelisted
                }), { EX: 360 }).catch(e => logger.error(e));
            }

            const totalValue = coinCount + vaultCount;

            const moduleDisplay = Array.isArray(ownedModules) && ownedModules.length
                ? ownedModules.map(id => `\`${modules[id]?.name ?? id}\``).join(' ')
                : '`NONE`';

            const embed = new EmbedBuilder()
                .setColor(isWhitelisted ? 0x00ff99 : 0x2b2d31)
                .setAuthor({ name: targetUser.username, iconURL: targetUser.displayAvatarURL() })
                .setTitle('`>_` SYSTEM USER PROFILE')
                .setDescription(
                    `--------------------------------------------\n` +
                    `**USER** ${isWhitelisted ? '`[WHITELISTED]`' : ''}\n` +
                    `${targetUser.displayName} — \`${targetUser.id}\`\n` +
                    `--------------------------------------------\n` +
                    `**WALLET**\n` +
                    `${coinCount.toLocaleString()} Cores\n\n` +
                    `**VAULT**\n` +
                    `${vaultCount.toLocaleString()} / ${vaultLimit.toLocaleString()} Cores\n` +
                    `${buildBar(vaultCount, vaultLimit)}\n\n` +
                    `**NET WORTH**\n` +
                    `${totalValue.toLocaleString()} Cores\n` +
                    `--------------------------------------------\n` +
                    `**INSTALLED MODULES**\n` +
                    `${moduleDisplay}`
                )
                .setFooter({
                    text: `${cachedProfile ? '⚡ CACHE' : '💾 DB'} · sudo_v1.0.4 · ${Date.now() - startTime}ms`
                });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            logger.error('Fetch Error:', error);
            await interaction.reply('Critical system failure during profile retrieval.');
        }
    }
};