const db = require('../../db.js');
const redisClient = require('../../redis.js');
const logger = require('../../logger.js');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'stash',
    description: "Transfer cores into the vault",
    cooldown: 5,
    options: [
        {
            name: 'amount',
            required: true,
            type: 4,
            description: 'The amount of cores to stash',
        },
    ],

    async execute(interaction) {

        const senderId = interaction.user.id;
        const botId = '1499752839973441556';
        const amount = interaction.options.getInteger('amount');

        if (amount <= 0) {
            return interaction.reply("Amount must be greater than 0.");
        }

        try {
            const senderRes = await db.query(
                `SELECT coins, is_whitelisted, COALESCE(vault, 0) as vault FROM users WHERE discord_id = $1`,
                [senderId]
            );

            const senderData = senderRes.rows[0] || { coins: 100, vault: 0 };
            const taxRate = senderData.is_whitelisted ? 0 : 0.10;
            const taxAmount = Math.floor(amount * taxRate);
            const totalDeduction = amount + taxAmount;

            if (senderData.coins < totalDeduction || totalDeduction >= senderData.coins) {
                let message;
                senderData.is_whitelisted == true ? message = '(including tax).' : message = '.'
                const embed = new EmbedBuilder()
                    .setTitle('Insufficient Funds')
                    .setDescription(`You don't have enough Cores!`)
                    .addFields(
                        { name: 'Wallet Balance', value: `${senderData.coins.toLocaleString()} Cores`, inline: true },
                        { name: 'Total Needed Balance', value: `${totalDeduction.toLocaleString()} Cores ${message}`, inline: true },
                        { name: 'Network Fee', value: `+**${taxAmount.toLocaleString()}** Cores`, inline: false}
                    )
                    .setFooter({text: 'Try stashing a small amount first'});
                        
                return interaction.reply({ embeds: [embed] });
            }
        
            await db.query(`
                UPDATE users
                SET coins = coins - $1,
                    vault = vault + $2
                WHERE discord_id = $3`,
            [totalDeduction, amount, senderId]);

            if (taxAmount > 0) {
                await db.query(`
                    INSERT INTO users (discord_id, coins) VALUES ($1, $2)
                    ON CONFLICT (discord_id) DO UPDATE SET coins = users.coins + EXCLUDED.coins
                `, [botId, taxAmount]);
            }

            const newWallet = senderData.coins - totalDeduction;
            const newVault = parseInt(senderData.vault) + amount;
            const cacheKey = `profile:${senderId}`;
            
            const payload = JSON.stringify({
                coins: newWallet,
                vault: newVault
            });

            redisClient.set(cacheKey, payload, { EX: 360 }).catch(e => logger.error(e));

            const embed = new EmbedBuilder()
                .setTitle('Transaction Successful')
                .setColor(0x2b2d31)
                .setDescription(`Stashed **${amount.toLocaleString()}** Cores into your vault.`)
                .addFields(
                    { name: 'Wallet Balance', value: `${newWallet.toLocaleString()} Cores`, inline: true },
                    { name: 'Vault Balance', value: `${newVault.toLocaleString()} Cores`, inline: true },
                    { name: 'Network Fee', value:  `-**${taxAmount.toLocaleString()}** Cores`, inline: true}
                )
                .setFooter(
                    {
                        text: senderData.is_whitelisted ? 'Whitelist Active: 0% fee.' :
                        'A 10% network protocol fee applied, the taxed cores will be transfered to sudo bot account.'
                    });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            logger.error(`Error in /stash: ${error.stack}`);
            await interaction.reply('Transaction failed. System connection error.');
        }
    }
}