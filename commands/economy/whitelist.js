const db = require('../../db.js');
const logger = require('../../logger.js');
const { EmbedBuilder, Client } = require('discord.js');

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
        try {
            await interaction.deferReply();
            const senderId = interaction.user.id;
            const showList = interaction.options.getBoolean('show_list');

            await db.query('BEGIN');

            const status = await db.query(`SELECT is_whitelisted FROM users WHERE discord_id = $1`, [senderId]);
            let responseMessage = "";

            if (status.rows[0]?.is_whitelisted == true) {
                responseMessage = 'You are already in the whitelist!';
            } else {
                await db.query(`UPDATE users SET is_whitelisted = true WHERE discord_id = $1`, [senderId]);
                responseMessage = 'You have been added to the whitelist!';
            }

            if (showList == true) {
                const result = await db.query('SELECT discord_id FROM users WHERE is_whitelisted = true');

                const userList = result.rows.length > 0
                    ? result.rows.map(row => `@${row.discord_id}`).join(`\n`)
                    : 'No whitelisted users found'

                const embed = new EmbedBuilder()
                    .setTitle('Whitelisted Users: ')
                    .setDescription(userList)

                await interaction.editReply({content: responseMessage, embeds: [embed]});
            } else {
                await interaction.editReply(responseMessage);
            }

            await db.query('COMMIT');
        } catch (error) {
            await db.query('ROLLBACK');
            logger.error(`Error in /whitelist: ${error.stack}`);
            await interaction.editReply('Transaction failed. No coins were moved.');
        }
    }
}