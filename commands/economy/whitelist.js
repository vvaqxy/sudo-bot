const db = require('../../db.js');
const logger = require('../../logger.js');
const redisClient = require('../../redis.js');
const { EmbedBuilder } = require('discord.js');

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

    async execute(interaction) {
        await interaction.deferReply();
        try {
            const senderId = interaction.user.id;
            const showList = interaction.options.getBoolean('show_list');
            
            const whitelistCacheKey = `whitelist:${senderId}`;

            const cachedWhitelist = await redisClient.get(whitelistCacheKey);
            
            let isWhitelisted = cachedWhitelist === 'true';

            if (!cachedWhitelist) {
                const status = await db.query(`SELECT is_whitelisted FROM users WHERE discord_id = $1`, [senderId]);
                isWhitelisted = status.rows[0]?.is_whitelisted || false;

                await redisClient.set(whitelistCacheKey, isWhitelisted.toString(), { EX: 300 });
            }

            let responseMessage = "";

            if (isWhitelisted) {
                responseMessage = 'You are already in the whitelist!';
            } else {
                await db.query(`UPDATE users SET is_whitelisted = true WHERE discord_id = $1`, [senderId]);
                await redisClient.set(whitelistCacheKey, 'true', { EX: 300 });
                responseMessage = 'You have been added to the whitelist!';
            }

            if (showList) {
                const result = await db.query('SELECT discord_id FROM users WHERE is_whitelisted = true');
                const userList = result.rows.length > 0
                    ? result.rows.map(row => `<@${row.discord_id}>`).join(`\n`)
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
            if (!interaction.replied && !interaction.deferred) {
                 await interaction.reply('An error occurred.');
            } else {
                 await interaction.editReply('Transaction failed.');
            }
        }
    }
}