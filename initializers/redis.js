'use strict';
var redis = require('redis');

var client = redis.createClient(process.env.REDIS_PORT_6379_TCP_PORT,
                 process.env.REDIS_PORT_6379_TCP_ADDR, {
                 "connection_timeout": 1.0
                 });
client.on('error', function(err) {
    if (err) {
        console.error('error connecting redis for recommendations: ', err);
        return;
    }
});

client.on('reconnecting', function() {
    console.log('reconnecting');
});

module.exports = client;
