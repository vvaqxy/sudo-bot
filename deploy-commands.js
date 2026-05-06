require('dotenv').config();
const { REST, Routes } = require('discord.js');

const commands = [
    {
        name: 'ping',
        description: 'Replies with Pong!'
    },
    {
        name: 'greet',
        description: 'Greets the user',
        options: [
            {
                name: 'user',
                description: 'The user to greet',
                required: false,
                type: 6
            }
        ]
    },
    {
        name: "say",
        description: "Say Something",
        options: [
            {
                name: "text",
                description: "What you want the bot to say",
                type: 3,
                required: true
            },
            {
                name: "embed",
                description: "Send the message in embed format",
                type: 5,
                required: false
            },
        ]
    }
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
const CLIENT_ID = '1499752839973441556';
const GUILD_ID = '1499753585955704903';

// Export the function so index.js can call it
async function deployCommands() {
    try {
        console.log('Registering Guild commands...');
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );
        console.log('Guild commands registered successfully!');
    } catch (error) {
        console.error('Failed to register commands:', error);
    }
}

module.exports = { deployCommands };