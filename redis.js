const redis = require('redis');

const client = redis.createClient({
    password: 'Aqil0168045080#',
    socket: {
        host: '85.215.137.163',
        port: 9872
    }
});

client.on('error', err => console.log('Redis Client Error', err));

client.connect().then(() => {
    console.log('Connected to Redis');
});

module.exports = client;