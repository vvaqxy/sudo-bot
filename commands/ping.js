const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
    name: 'ping',
    description: 'Shows bot latency and API latency',
    category: 'utility',
    cooldown: 5,

    async execute(interaction) {
        try {
            const start = Date.now();

            await interaction.reply({
                content: '```Pinging...```',
                withResponse: true
            });

            const botLatency = Date.now() - start;
            const apiLatency = interaction.client.ws.ping;

            const embed = new EmbedBuilder()
                .setColor('DarkButNotBlack')
                .setTitle("Pong!")
                .setDescription(`\`\`\`Bot Latency: ${botLatency}ms\nAPI Latency: ${apiLatency}ms\`\`\``);

            await interaction.editReply({
                content: null,
                embeds: [embed]
            });

        } catch (error) {
            console.error(error);

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: 'An error occurred while executing this command.',
                    flags: MessageFlags.Ephemeral
                });
            } else {
                await interaction.reply({
                    content: 'An error occurred while executing this command.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
};