const db = require('../../db.js');
const logger = require('../../logger.js');
const modules = require('../../config/modules.js');
const { EmbedBuilder } = require('discord.js');
const whitelistCmd = require('./whitelist.js');

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
        await interaction.deferReply();
        const startTime = Date.now();

        const targetUser = interaction.options.getUser('user') || interaction.user;
        const targetId = targetUser.id;

        try {
            await whitelistCmd.ensureCacheLoaded();
            
            const isWhitelisted = whitelistCmd.whitelistCache?.has(targetId) ?? false;

            const response = await db.query(`
                INSERT INTO users (discord_id, coins, vault)
                VALUES ($1, 100, 0)
                ON CONFLICT (discord_id)
                DO UPDATE SET discord_id = EXCLUDED.discord_id
                RETURNING coins,
                          COALESCE(vault, 0)        AS vault,
                          COALESCE(vault_limit, 50000) AS vault_limit,
                          COALESCE(inventory, '[]') AS modules;
            `, [targetId]);

            const row     = response.rows[0];
            const coinCount     = row.coins     ?? 100;
            const vaultCount    = row.vault     ?? 0;
            const vaultLimit    = row.vault_limit ?? 50000;
            const ownedModules  = typeof row.modules === 'string' ? JSON.parse(row.modules) : (row.modules ?? []);

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
                    text: `💾 DB · sudo_v1.0.4 · ${Date.now() - startTime}ms`
                });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            logger.error('Fetch Error:', error);
            await interaction.editReply('Critical system failure during profile retrieval.');
        }
    }
};