const db = require('../../db.js');
const logger = require('../../logger.js');
const modules = require('../../config/modules.js');
const { EmbedBuilder } = require('discord.js');

let marketDisplayCache = null;

module.exports = {
    name: 'market',
    description: "View available system modules",
    cooldown: 5,

    async execute(interaction) {
        await interaction.deferReply();

        try {
            if (!marketDisplayCache) {
                marketDisplayCache = Object.entries(modules).map(([id, mod]) =>
                    `ID: ${id.padEnd(2)} | ${mod.name.padEnd(12)} | ${mod.price.toLocaleString().padStart(7)} Cores\n` +
                    `          > ${mod.desc}`
                ).join('\n\n');
            }

            const embed = new EmbedBuilder()
                .setColor(0x2b2d31)
                .setDescription(
                    `\`>_\` [ SYSTEM MARKET ]: AVAILABLE MODULES\n` +
                    `--------------------------------------------\n` +
                    `${marketDisplayCache}\n` +
                    `--------------------------------------------\n` +
                    `USE: **/buy <ID>** to purchase a module`
                );

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            logger.error(`Market Error: ${error.stack}`);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Critical system failure.', ephemeral: true });
            }
        }
    }
};