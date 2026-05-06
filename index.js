require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { checkCooldown } = require('./utils/cooldowns');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();

// Load command files
function loadCommands(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);

        if (fs.lstatSync(fullPath).isDirectory()) {
            loadCommands(fullPath);
        } else {
            const command = require(fullPath);
            client.commands.set(command.name, command);
        }
    }
}

loadCommands(path.join(__dirname, 'commands'));

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    if (command.cooldown) {
        const remaining = checkCooldown(
            interaction.user.id,
            command.name,
            command.cooldown
        );

        if (remaining) {
            return interaction.reply({
                content: `Wait ${remaining}s before using this command again.`,
                ephemeral: true
            });
        }
    }

    if (command.permissions) {
        if (!interaction.member.permissions.has(command.permissions)) {
            return interaction.reply({
                content: 'You do not have permission to use this command.',
                ephemeral: true
            });
        }
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({
            content: 'Error executing command',
            ephemeral: true
        });
    }
});

client.once('clientReady', () => {
    console.log(`Logged in as ${client.user.tag}`);
})

client.login(process.env.TOKEN);