const db = require('../../db.js');
const logger = require('../../logger.js');
const { EmbedBuilder, Client } = require('discord.js');

module.exports = {
    name: 'pay',
    description: 'Pay another user coins',
    cooldown: 5,
    options: [
        {
            name: 'user',
            description: 'The user to pay',
            required: true,
            type: 6,
        },
        {
            name: 'amount',
            description: 'Amount to pay',
            required: true,
            type: 4,
        }
    ],

    async execute(interaction) {
        const senderId = interaction.user.id;
        const targetUser = interaction.options.getUser('user');
        const targetId = targetUser.id;
        const botId = 1499752839973441556;
        const amount = interaction.options.getInteger('amount');

        if (senderId === targetId) {
            return interaction.reply({ content: "You can't pay yourself!", ephemeral: true });
        }

        if (amount <= 0) {
            return interaction.reply({ content: "Amount must be at least 1 coin.", ephemeral: true });
        }

        await interaction.deferReply();

        try {
            await db.query('BEGIN');

            const senderRes = await db.query('SELECT coins FROM users WHERE discord_id = $1', [senderId]);
            const senderCoins = senderRes.rows[0]?.coins || 0;
            const taxRate = 0.10;

            const taxAmount = Math.floor(amount * taxRate);
            const finalAmount = amount + taxAmount;

            if (senderCoins < amount) {
                await db.query('ROLLBACK');
                return interaction.editReply(`You don't have enough coins! Balance: ${senderCoins} Cores`);
            }

            await db.query(
                'INSERT INTO users (discord_id, coins) VALUES ($1, 0) ON CONFLICT (discord_id) DO NOTHING',
                [targetId]
            );

            await db.query('UPDATE users SET coins = coins - $1 WHERE discord_id = $2', [finalAmount, senderId]);
            await db.query('UPDATE users SET coins = coins + $1 WHERE discord_id = $2', [amount, targetId]);

            await db.query(`UPDATE users SET coins = coins + $1 WHERE discord_id = $2`, [taxAmount, '1499752839973441556'])

            await db.query('COMMIT');

            const embed = new EmbedBuilder()
                .setDescription(`\`\`\`${interaction.user.displayName} transferred ${amount} Cores to @${targetUser.displayName}\`\`\``)
                .setFooter({
                    text: `A 10% network protocol fee applies, with the taxed amount transferred to the sudo bot.\nTip: use /whitelist command to bypass the 10% network protocol fee on all future transfers. `,
                });
            
            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            await db.query('ROLLBACK');
            logger.error(`Error in /pay: ${error.stack}`);
            await interaction.editReply('Transaction failed. No coins were moved.');
        }
    }
};