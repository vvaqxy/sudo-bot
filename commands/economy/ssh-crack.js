const db = require('../../db.js');
const redisClient = require('../../redis.js');
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
            return interaction.reply(`You can't perform an attack on yourself!`);
        }

        try {
            const response = await db.query(
                'SELECT discord_id, coins, vault FROM users WHERE discord_id IN ($1, $2)',
                [senderId, targetId]
            );

            const senderData = response.rows.find(r => r.discord_id === senderId) || { coins: 100, vault: 0 };
            const targetData = response.rows.find(r => r.discord_id === targetId) || { coins: 100, vault: 0 };

            const senderCores = senderData.coins;
            const targetCores = targetData.coins;

            if (senderCores <= 0) {
                return interaction.reply(`You don't have enough Cores to perform an attack!`);
            }

            if (targetCores < 100) {
                return interaction.reply(`${targetUser.displayName} does not have enough Cores to target.`);
            }

            await interaction.reply('Initializing dictionary attack...');
            await setTimeout(3000);

            const successChance = Math.random() * 100;
            let statusMessage = '';
            let message = '';
            let finalSenderCores = senderCores;
            let finalTargetCores = targetCores;

            await db.query('BEGIN');

            if (successChance <= 40) {
                statusMessage = '[SUCCESS] Access Granted';
                const stealPercent = (Math.random() * (14 - 8) + 8) / 100;
                let stolenAmount = Math.max(50, Math.floor(targetCores * stealPercent));
                stolenAmount = Math.min(stolenAmount, targetCores);

                await db.query('UPDATE users SET coins = coins + $1 WHERE discord_id = $2', [stolenAmount, senderId]);
                await db.query('UPDATE users SET coins = coins - $1 WHERE discord_id = $2', [stolenAmount, targetId]);

                finalSenderCores += stolenAmount;
                finalTargetCores -= stolenAmount;
                message = `Extracted **${stolenAmount}** Cores from /home/${targetUser.displayName}/vault`;
            } else {
                statusMessage = '[FAILED] Access Denied';
                const finePercent = (Math.random() * (8 - 4) + 4) / 100;
                let fineAmount = Math.max(25, Math.floor(targetCores * finePercent));
                fineAmount = Math.min(fineAmount, senderCores);

                await db.query('UPDATE users SET coins = coins - $1 WHERE discord_id = $2', [fineAmount, senderId]);

                finalSenderCores -= fineAmount;
                message = `Failed to exploit ${targetUser.displayName}'s vault.\nAuthorities traced your connection and fined you **${fineAmount}** Cores.`;
            }

            await db.query('COMMIT');

            const senderKey = `profile:${senderId}`;
            const targetKey = `profile:${targetId}`;

            const senderPayload = JSON.stringify({ coins: finalSenderCores, vault: senderData.vault });
            const targetPayload = JSON.stringify({ coins: finalTargetCores, vault: targetData.vault });

            redisClient.set(senderKey, senderPayload, { EX: 360 }).catch(e => logger.error(e));
            redisClient.set(targetKey, targetPayload, { EX: 360 }).catch(e => logger.error(e));

            const embed = new EmbedBuilder().setDescription(`${statusMessage}\n${message}`);
            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            await db.query('ROLLBACK');
            logger.error(`Error in /ssh-crack: ${error.stack}`);
            await interaction.reply('Transaction failed. No cores were moved.');
        }
    }
};