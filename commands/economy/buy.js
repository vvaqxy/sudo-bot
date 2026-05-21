const db = require('../../db.js');
const modules = require('../../config/modules.js');
const logger = require('../../logger.js');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'buy',
    description: "Purchase modules from the market",
    cooldown: 5,
    options: [
        {
            name: 'module_id',
            required: true,
            description: 'The ID of the module to buy',
            type: 3,
        },
    ],

    async execute(interaction) {
        const senderId = interaction.user.id;
        const moduleId = interaction.options.getString('module_id');
        const item = modules[moduleId];

        if (!item) {
            return interaction.reply('Invalid module ID.');
        }

        try {
            const senderResponse = await db.query(
                'SELECT coins, inventory FROM users WHERE discord_id = $1',
                [senderId]
            );
            
            const userData = senderResponse.rows[0] || { coins: 100, inventory: [] };
            const senderCores = userData.coins;
            const senderInventory = userData.inventory || [];

            if (senderInventory.includes(moduleId)) {
                return interaction.reply(`\`[ERROR]: Module is already installed in your system.\``);
            }

            if (senderCores < item.price) {
                return interaction.reply(`\`[ERROR]: Insufficient funds. Need ${item.price - senderCores} more Cores.\``);
            }

            await db.query(`BEGIN`);

            await db.query(`UPDATE users SET coins = coins - $1 WHERE discord_id = $2`, [item.price, senderId]);

            await db.query(
                `UPDATE users SET inventory = inventory || $1::jsonb WHERE discord_id = $2`,
                [JSON.stringify([moduleId]), senderId]
            );

            await db.query(`COMMIT`);

            const embed = new EmbedBuilder()
                .setColor(0x2b2d31)
                .setDescription(`[SUCCESS]: ${item.name} integrated.\n[DEDUCTED]: -${item.price} Cores`);
            
            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            try { await db.query('ROLLBACK'); } catch (_) {}
            logger.error(`Error in /buy: ${error.stack}`);
            await interaction.reply('Transaction failed. No cores were moved.');
        }
    }
};