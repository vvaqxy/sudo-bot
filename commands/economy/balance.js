const db = require('../../db.js')
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'fetch',
    description: "The user to check the value of",
    cooldown: 5,
    options: [
        {
            name: 'user',
            required: false,
            type: 6,
        },
    ],

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user') || interaction.user;
        const targetId = targetUser.id;

        try {
            const response = await db.query('SELECT coins FROM users WHERE discord_id = $1', [targetId]);

            let coinCount;

            if (response.rows.length === 0) {
                coinCount = 100;
                await db.query('INSERT INTO users (discord_id, coins) VALUES ($1, $2)', [targetId, coinCount]);
            } else {
                coinCount = response.rows[0].coins;
            }

            const embed = new EmbedBuilder()
            .setAuthor({ name: targetUser.username, iconURL: targetUser.displayAvatarURL() })
            .setDescription(`\`\`\`WALLET: ${coinCount} Cores\nBANK: ${coinCount} Cores\`\`\``);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.log(error);
            await interaction.editReply('An error occurred while fetching the balance.');
        }
    }
}