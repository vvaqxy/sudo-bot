const db = require('../../db.js');
const logger = require('../../logger.js');
const { EmbedBuilder } = require('discord.js');

let whitelistCache = null;

async function ensureCacheLoaded() {
    if (whitelistCache !== null) return;
    
    try {
        const result = await db.query('SELECT discord_id FROM users WHERE is_whitelisted = true');
        whitelistCache = new Set(result.rows.map(row => row.discord_id));
    } catch (error) {
        logger.error(`Failed to hydrate whitelist cache from DB: ${error.stack}`);
        whitelistCache = new Set();
    }
}

module.exports = {
    name: 'whitelist',
    description: 'Include yourself in the whitelist to bypass fee on all future transfers.',
    cooldown: 5,
    options: [
        {
            name: 'show_list',
            description: 'Show the list of whitelisted users',
            type: 5,
            required: false
        }
    ],

    whitelistCache,
    ensureCacheLoaded,

    async execute(interaction) {
        await interaction.deferReply();
        
        try {
            const senderId = interaction.user.id;
            const showList = interaction.options.getBoolean('show_list') ?? false;

            await ensureCacheLoaded();

            let responseMessage = "";

            if (whitelistCache.has(senderId)) {
                responseMessage = 'You are already in the whitelist!';
            } else {
                await db.query(`
                    INSERT INTO users (discord_id, is_whitelisted)
                    VALUES ($1, true)
                    ON CONFLICT (discord_id)
                    DO UPDATE SET is_whitelisted = true
                `, [senderId]);

                whitelistCache.add(senderId);
                responseMessage = 'You have been added to the whitelist!';
            }

            if (showList) {
                const userList = whitelistCache.size > 0
                    ? Array.from(whitelistCache).map(id => `<@${id}>`).join('\n')
                    : 'No whitelisted users found';

                const embed = new EmbedBuilder()
                    .setTitle('Whitelisted Users')
                    .setDescription(userList)
                    .setColor(0x00AE86);

                await interaction.editReply({ content: responseMessage, embeds: [embed] });
            } else {
                await interaction.editReply(responseMessage);
            }

        } catch (error) {
            logger.error(`Error in /whitelist: ${error.stack}`);
            await interaction.editReply('An error occurred during processing.');
        }
    }
};