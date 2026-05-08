const db = require('../../db.js');
const logger = require('../../logger.js');
const { EmbedBuilder } = require('discord.js');
const { setTimeout } = require('node:timers/promises');

module.exports = {
    name: 'ssh-crack',
    description: 'Attempts to brute-force a remote wallet to extract Cores.',
    cooldown: 25,
    options: [
        {
            name: 'user',
            description: 'The user to perform the attack',
            required: true,
            type: 6,
        },
    ],

    async execute(interaction) {
        await interaction.deferReply();

        const senderId = interaction.user.id;
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const targetId = targetUser.id;

        try {
            const senderResponse = await db.query('SELECT coins FROM users WHERE discord_id = $1', [senderId]);
            const senderCores = senderResponse.rows[0]?.coins || 100;

            const targetResponse = await db.query('SELECT coins FROM users WHERE discord_id = $1', [targetId]);
            const targetCores = targetResponse.rows[0]?.coins || 100;

            if (senderCores == 0) {
                await interaction.editReply(`You have 0 cores!`);
                return;
            }

            if (targetCores == 0) {
                await interaction.editReply(`@${targetUser.displayName} has 0 cores on their vault!`);
                return;
            }

            if (targetId == senderId) {
                await interaction.editReply(`You can't perform an attack on yourself!`);
                return;
            }

            await interaction.editReply('Initializing dictionary attack...')
            await setTimeout(3000);

            const successChange = Math.random() * 100;
            let statusMessage = '';
            let message = '';

                if (successChange <= 35) {
                    statusMessage = "[SUCCESS] Access Granted"
                    const maxSteal = Math.floor(targetCores / 6);
                    const stolenAmount = Math.floor(Math.random() * maxSteal) + 1;

                    await db.query('BEGIN');
                    await db.query('UPDATE users SET coins = coins + $1 WHERE discord_id = $2', [stolenAmount, senderId]);
                    await db.query('UPDATE users SET coins = coins - $1 WHERE discord_id = $2', [stolenAmount, targetId]);
                    await db.query('COMMIT');

                    message = `Extracted **${stolenAmount}** Cores from /home/${targetUser.displayName}/vault`
                } else {
                    statusMessage = "[FAILED] Access Denied"
                    const deduction = Math.floor(senderCores / 5);
                    const deductionAmount = Math.floor(Math.random() * deduction) + 1;

                    await db.query('BEGIN');
                    await db.query('UPDATE users SET coins = coins - $1 WHERE discord_id = $2', [deductionAmount, senderId]);
                    await db.query('COMMIT');

                    message = `Failed to exploit @${targetUser.displayName} vault, you have been caught and fined **${deductionAmount}** Cores`;
                }

            const embed = new EmbedBuilder().setDescription(`${statusMessage}\n ${message}`)
            await interaction.editReply({ embeds: [embed] });
        } catch {
            await db.query('ROLLBACK')
            logger.error(`Error in /ssh-crack: ${error.stack}`);
            await interaction.editReply('Transaction failed. No cores were moved.');
        }
    }
}