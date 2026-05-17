const db = require('../../db.js');
const redisClient = require('../../redis.js');
const logger = require('../../logger.js');
const modules = require('../../config/modules.js');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'market',
    description: "View available system modules",
    cooldown: 5,

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const cacheKey = 'system:market:display';
            let marketDisplay = await redisClient.get(cacheKey);

            if (!marketDisplay) {
                marketDisplay = Object.entries(modules).map(([id, mod]) =>
                    `ID: ${id.padEnd(2)} | ${mod.name.padEnd(12)} | ${mod.price.toLocaleString().padStart(7)} Cores\n` +
                    `          > ${mod.desc}`
                ).join('\n\n');

                await redisClient.set(cacheKey, marketDisplay, { EX: 3600 });
            }

            const embed = new EmbedBuilder()
                .setColor(0x2b2d31)
                .setDescription(
                    `\`>_\` [ SYSTEM MARKET ]: AVAILABLE MODULES\n` +
                    `--------------------------------------------\n` +
                    `${marketDisplay}\n` +
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