const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: "say",
    description: "Say Something",
    cooldown: 5,
    options: [
        {
            name: 'text',
            required: true,
            type: 3,
        },
        {
            name: 'embed',
            required: false,
            type: 5
        }
    ],


    async execute(interaction) {
        try {
            const userText = interaction.options.getString('text');
            const embedFlags = interaction.options.getBoolean('embed');

            if (embedFlags == true) {
                const embed = new EmbedBuilder().setDescription(userText)
                await interaction.reply({embeds: [embed]})
                return;
            }

            await interaction.reply({content: userText});
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: "An error occurred", ephemeral: true })
            return;
        }
    }
}