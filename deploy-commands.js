require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { description } = require('./commands/economy/balance');

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
    },
    {
        name: 'fetch',
        description: "Displays value of wallet and bank",
        options: [
            {
                name: 'user',
                required: false,
                type: 6,
                description: 'The user to check the value of'
            }
        ],
    },
    {
        name: 'pay',
        description: "Pay another user",
        options: [
            {
                name: 'user',
                description: 'The user you want to pay',
                required: true,
                type: 6,
            },
            {
                name: 'amount',
                description: 'The amount of coins to send',
                required: true,
                type: 4,
            }
        ],
    },
    {
        name: 'ssh-crack',
        description: 'Attempts to brute-force a remote wallet to extract Cores.',
        cooldown: 25,
        options: [
            {
                name: 'user',
                description: 'The user to perform the attack',
                required: true,
                type: 6,
            },
        ],
    },
    {
        name: 'whitelist',
        description: 'Include yourself in the whitelist to bypass fee on all future transfers.',
        cooldown: 5,
        options: [
            {
                name: 'show_list',
                description: 'Show the list of whitelisted users',
                type: 5,
                required: false
            },
        ],
    },
    {
        name: 'market',
        description: "View available system modules",
        cooldown: 5,
    },
    {
        name: 'buy',
        description: "Purchase modules from the market",
        cooldown: 5,
        options: [
            {
                name: 'module_id',
                required: true,
                description: 'The ID of the module to buy',
                type: 3,
            },
        ]
    },
    {
        name: 'stash',
        description: "Transfer cores into the vault",
        cooldown: 5,
        options: [
            {
                name: 'amount',
                description: 'The amount to stash into vault',
                required: true,
                type: 4,
            },
        ],
    },
    {
        name: 'exploit',
        description: "Exploit a system",
        cooldown: 25,
    }
]

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
const CLIENT_ID = '1499752839973441556';
const GUILD_ID = '1070710331107725332';

async function deployCommands() {
    try {
        console.log('Registering Guild commands...');
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        ).then(() => console.log('Successfully registered application global commands.'));
        console.log('Guild commands registered successfully!');
    } catch (error) {
        console.error('Failed to register commands:', error);
    }
}

module.exports = { deployCommands };