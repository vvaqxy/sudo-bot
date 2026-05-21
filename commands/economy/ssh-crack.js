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
        const senderId = interaction.user.id;
        const targetUser = interaction.options.getUser('user');
        const targetId = targetUser.id;

        if (senderId === targetId) {
            return interaction.reply({ content: `You can't perform an attack on yourself!`, ephemeral: true });
        }

        try {
            // Fetch current balances directly from the database
            const response = await db.query(
                'SELECT discord_id, coins FROM users WHERE discord_id IN ($1, $2)',
                [senderId, targetId]
            );

            const senderData = response.rows.find(r => r.discord_id === senderId) || { coins: 100 };
            const targetData = response.rows.find(r => r.discord_id === targetId) || { coins: 100 };

            const senderCores = senderData.coins;
            const targetCores = targetData.coins;

            if (senderCores <= 0) {
                return interaction.reply({ content: `You don't have enough Cores to perform an attack!`, ephemeral: true });
            }

            if (targetCores < 100) {
                return interaction.reply({ content: `${targetUser.displayName} does not have enough Cores to target.`, ephemeral: true });
            }

            // Send the initial progress message
            await interaction.reply('Initializing dictionary attack...');
            await setTimeout(3000);

            const successChance = Math.random() * 100;
            let statusMessage = '';
            let message = '';

            await db.query('BEGIN');

            if (successChance <= 40) {
                statusMessage = '`[SUCCESS]` Access Granted';
                const stealPercent = (Math.random() * (14 - 8) + 8) / 100;
                let stolenAmount = Math.max(50, Math.floor(targetCores * stealPercent));
                stolenAmount = Math.min(stolenAmount, targetCores);

                await db.query('UPDATE users SET coins = coins + $1 WHERE discord_id = $2', [stolenAmount, senderId]);
                await db.query('UPDATE users SET coins = coins - $1 WHERE discord_id = $2', [stolenAmount, targetId]);

                message = `Extracted **${stolenAmount}** Cores from /home/${targetUser.displayName}/vault`;
            } else {
                statusMessage = '`[FAILED]` Access Denied';
                const finePercent = (Math.random() * (8 - 4) + 4) / 100;
                let fineAmount = Math.max(25, Math.floor(targetCores * finePercent));
                fineAmount = Math.min(fineAmount, senderCores);

                await db.query('UPDATE users SET coins = coins - $1 WHERE discord_id = $2', [fineAmount, senderId]);

                message = `Failed to exploit ${targetUser.displayName}'s vault.\nAuthorities traced your connection and fined you **${fineAmount}** Cores.`;
            }

            await db.query('COMMIT');

            // Construct and update via editReply since the interaction was already answered
            const embed = new EmbedBuilder()
                .setColor(successChance <= 40 ? 0x00ff99 : 0xff4a4a)
                .setDescription(`${statusMessage}\n${message}`);

            await interaction.editReply({ content: null, embeds: [embed] });

        } catch (error) {
            try { await db.query('ROLLBACK'); } catch (_) {}
            logger.error(`Error in /ssh-crack: ${error.stack}`);
            
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ content: 'Transaction failed. No cores were moved.', embeds: [] });
            } else {
                await interaction.reply({ content: 'Transaction failed. No cores were moved.', ephemeral: true });
            }
        }
    }
};