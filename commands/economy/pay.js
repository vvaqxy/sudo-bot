const db = require('../../db.js');
const logger = require('../../logger.js');
const { EmbedBuilder } = require('discord.js');
const whitelistCmd = require('./whitelist.js');

module.exports = {
    name: 'pay',
    description: 'Pay another user coins',
    cooldown: 5,
    options: [
        { name: 'user', description: 'The user to pay', required: true, type: 6 },
        { name: 'amount', description: 'Amount to pay', required: true, type: 4 }
    ],

    async execute(interaction) {
        const senderId = interaction.user.id;
        const targetUser = interaction.options.getUser('user');
        const targetId = targetUser.id;
        const botId = '1499752839973441556';
        const amount = interaction.options.getInteger('amount');

        if (senderId === targetId) return interaction.reply({ content: "You can't pay yourself!", ephemeral: true });
        if (amount <= 0) return interaction.reply({ content: "Amount must be at least 1 Core.", ephemeral: true });

        try {
            await whitelistCmd.ensureCacheLoaded();
            const isWhitelisted = whitelistCmd.whitelistCache.has(senderId);

            const res = await db.query(
                'SELECT discord_id, coins FROM users WHERE discord_id IN ($1, $2)',
                [senderId, targetId]
            );

            const senderData = res.rows.find(r => r.discord_id === senderId) || { coins: 0 };

            const taxRate = isWhitelisted ? 0 : 0.10;
            const taxAmount = Math.floor(amount * taxRate);
            const totalDeduction = amount + taxAmount;

            if (senderData.coins < totalDeduction) {
                return interaction.reply(`Insufficient funds. You need **${totalDeduction}** Cores (including tax).`);
            }

            await db.query('BEGIN');

            await db.query('UPDATE users SET coins = coins - $1 WHERE discord_id = $2', [totalDeduction, senderId]);

            await db.query(`
                INSERT INTO users (discord_id, coins) VALUES ($1, $2)
                ON CONFLICT (discord_id) DO UPDATE SET coins = users.coins + EXCLUDED.coins
            `, [targetId, amount]);

            if (taxAmount > 0) {
                await db.query(`
                    INSERT INTO users (discord_id, coins) VALUES ($1, $2)
                    ON CONFLICT (discord_id) DO UPDATE SET coins = users.coins + EXCLUDED.coins
                `, [botId, taxAmount]);
            }

            await db.query('COMMIT');

            const embed = new EmbedBuilder()
                .setColor(0x2b2d31)
                .setDescription(`\`\`\`${interaction.user.displayName} transferred ${amount} Cores to ${targetUser.displayName}\nNetwork Fee: -${taxAmount} Cores\`\`\``)
                .setFooter({ text: isWhitelisted ? 'Whitelist Active: 0% fee.' : 'A 10% network protocol fee applied.' });
            
            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            try { await db.query('ROLLBACK'); } catch (_) {}
            logger.error(`Error in /pay: ${error.stack}`);
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply('Transaction failed! No cores were moved.');
            } else {
                await interaction.reply('Transaction failed! No cores were moved.');
            }
        }
    }
};