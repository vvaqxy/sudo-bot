const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'greet',
    description: "Greets the user",
    cooldown: 10,
    options: [
        {
            name: 'user',
            description: 'The user to greet',
            required: false,
            type: 6
        }
    ],

    async execute(interaction) {
        try {
            const user = interaction.options.getUser('user') || interaction.member;
            
            const embed = new EmbedBuilder()
            .setColor(0x000000)
            .setDescription(`\`\`\`> Hello ${user.displayName}\`\`\``)
            .setAuthor({
                name: user.displayName,
                iconURL: user.displayAvatarURL()
            });
                
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: "An error occurred", ephemeral: true })
        }
    }
}