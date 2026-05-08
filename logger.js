const { createLogger, format, transports } = require('winston');

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.colorize(),
        format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] [${level}]: ${message}`;
        })
    ),
    transports: [
        new transports.Console(),
        new transports.File({ filename: 'error.log', level: 'error' }),
        new transports.File({ filename: 'combined.log' })
    ]
});

logger.logCommand = (interaction) => {
    const username = interaction.user.username;
    const userId = interaction.user.id;
    const commandName = interaction.commandName;
    
    const guildName = interaction.guild ? interaction.guild.name : "Direct Messages";
    const guildId = interaction.guild ? interaction.guild.id : "DM";

    const logMessage = `[COMMANDS] User @${username} (ID: ${userId}) triggered /${commandName} in Guild "${guildName}" (ID: ${guildId})`;
    
    logger.info(logMessage);
};

module.exports = logger;