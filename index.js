require('dotenv').config();
const fs = require('fs');
const path = require('path');
const logger = require('./logger.js');
const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const { deployCommands } = require('./deploy-commands');

const db = require('./db.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();
client.maintenanceMode = false;

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

deployCommands();

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    logger.logCommand(interaction);

    if (command.cooldown) {
        const remaining =  await checkCooldown(
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
        logger.error(`Error executing /${interaction.commandName}: ${error.stack}`);
        
        const errorMessage = { content: 'Error executing command. The system gears are jammed.', flags: 64 };

        if (interaction.deferred || interaction.replied) {
            await interaction.editReply(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);

     try {
        db.query('SELECT 1');
        logger.info('[DB] Initial connection warm-up successful.');
    } catch (err) {
        logger.error(`[DB] Initial warm-up failed: ${err.message}`);
    }

    setInterval(async () => {
        try {
            db.query('SELECT 1');
            logger.info('Database keep-alive ping successful.');
        } catch (err) {
            console.error('Database keep-alive failed:', err);
        }
    }, 4 * 60 * 1000);

    let statusIndex = 0;

    setInterval(async () => {
        try {
            if (client.maintenanceMode) return;

            const coinRes = await db.query('SELECT SUM(coins) as total FROM users');
            const rawCoins = coinRes.rows[0]?.total || 0;
            
            const formattedCoins = new Intl.NumberFormat('en-US', { notation: "compact" }).format(rawCoins);

            const ping = client.ws.ping;
            const serverCount = client.guilds.cache.size;

            const statuses = [
                { name: 'v1.2.1 | /help', type: ActivityType.Playing },
                { name: `$${formattedCoins} in circulation`, type: ActivityType.Watching },
                { name: `System Ping: ${ping}ms`, type: ActivityType.Watching },
            ];

            client.user.setPresence({
                activities: [statuses[statusIndex]],
                status: 'online',
            });

            statusIndex = (statusIndex + 1) % statuses.length;

        } catch (error) {
            logger.error(`Failed to update status: ${error.message}`);
        }
    }, 15000);
});

client.on('guildCreate', (guild) => {
    logger.info(`[GUILDS] Joined a new server: "${guild.name}" (ID: ${guild.id}) | Members: ${guild.memberCount}`);
});

client.on('guildDelete', (guild) => {
    logger.warn(`[GUILDS] Removed from server: "${guild.name}" (ID: ${guild.id})`);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled Rejection at: ${promise} | Reason: ${reason}`);
});

process.on('uncaughtException', (error) => {
    logger.error(`Uncaught Exception thrown: ${error.stack}`);
});

const handleShutdown = async (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    client.destroy();
    logger.info('Disconnected from Discord Gateway.');

    try {
        await db.end();
        logger.info('PostgreSQL connection pool closed successfully.');
    } catch (err) {
        logger.error(`Error closing database pool: ${err.message}`);
    }

    logger.info('Shutdown complete. Exiting process.');
    process.exit(0);
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

client.login(process.env.TOKEN);