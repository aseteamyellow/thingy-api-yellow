const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://mqtt.thing.zone:1896', {
    username: 'yellow',
    password: '9f0f8f19e1'
});

client.on('connect', function () {
    initSubscriptions().catch((err) => console.log(err));

    // Configuration of led color
    let buffer = new Buffer(4);
    buffer.writeUInt8(1, 0);
    buffer.writeUInt8(255,1);
    buffer.writeUInt8(0,2);
    buffer.writeUInt8(0,3);
    client.publish('ThingyY1/ef680300-9b35-4933-9b10-52ffa9740042/ef680301-9b35-4933-9b10-52ffa9740042/write', buffer, function(err) {
        if (err) console.log(err);
    });

    // Configuration of sensors data capture intervals
    /*buffer = new Buffer(12);
    buffer.writeUInt16LE(1000,0);
    buffer.writeUInt16LE(1000,2);
    buffer.writeUInt16LE(1000,4);
    buffer.writeUInt16LE(1000,6);
    buffer.writeUInt8(1,8);
    buffer.writeUInt8(255,9);
    buffer.writeUInt8(255,10);
    buffer.writeUInt8(255,11);
    client.publish('ThingyY1/ef680200-9b35-4933-9b10-52ffa9740042/ef680206-9b35-4933-9b10-52ffa9740042/write', buffer, function(err) {
        if (err) console.log(err);
    });*/
});

let data = {};
client.on('message', function (topic, message) {
    const thingyUUID = topic.split('/')[0];
    if (!data.hasOwnProperty(thingyUUID)) data[thingyUUID] = {};
    switch(message.length) {
        case 1 : data[thingyUUID].humidity = message.readUInt8(0); break;
        case 2 : data[thingyUUID].temperature = message.readInt8(0) + (message.readUInt8(1)/100); break;
        case 4 : data[thingyUUID].air_quality = message.readUInt16LE(0); break;
        case 5 : data[thingyUUID].air_pressure = message.readInt32LE(0) + (message.readUInt8(4)/100); break;
        case 8 : data[thingyUUID].light = message.readUInt16LE(0) + message.readUInt16LE(2) + message.readUInt16LE(4) + message.readUInt16LE(6);   //It shouldn't be plus (red, green, blue, clear)
    }
    if (Object.keys(data[thingyUUID]).length === nbNotifs[thingyUUID]) {
        db.insertInfluxDB(thingyUUID, data[thingyUUID]).catch((err) => console.log(err));
        data[thingyUUID] = {};
    }
});

const ts = require('./thingyServicesUUID');
const db = require('./db');

// Subscribes to all topics at starting
async function initSubscriptions() {
    const subs = await db.getNotifs();
    for (let i = 0; i < subs.length; i++) {
        const thingy = subs[i].thingy; delete subs[i].thingy;
        //await db.createTableInfluxDB(thingy).catch((err) => console.log(err));
        await changeSubscriptions(thingy, subs[i]);
    }
}

let nbNotifs = {};

// (Un)Subscribes to topics of a thingy
async function changeSubscriptions(thingyUUID, topics) {
    let topicsToSubscribe = [];
    let topicsToUnsubscribe = [];
    for (const key in topics) {
        const topicUUID = key.toUpperCase();
        if (ts.hasOwnProperty(topicUUID)) {
            const completeTopicUUID = thingyUUID + '/' + replaceCharAt(ts[topicUUID], 0, 7) + '/' + ts[topicUUID];
            if (topics[key] === 1 || topics[key]) topicsToSubscribe = topicsToSubscribe.concat([completeTopicUUID]);
            else topicsToUnsubscribe = topicsToUnsubscribe.concat([completeTopicUUID]);
        }
    }
    if (topicsToSubscribe.length !== 0) client.subscribe(topicsToSubscribe, function(err) {
        if (err) console.log(err);
    });
    if (topicsToUnsubscribe.length !== 0) client.unsubscribe(topicsToUnsubscribe, function(err) {
        if (err) console.log(err);
    });
    nbNotifs[thingyUUID] = topicsToSubscribe.length;
}

// Unsubscribes to all topics of a thingy
async function deleteAllSubscriptions(thingyUUID) {
    client.unsubscribe('thingyUUID/#', function(err) {
        if (err) console.log(err);
    });
    nbNotifs[thingyUUID] = 0;
}

// Replace the a character of a string at a specific index
function replaceCharAt(string, char, index) {
    return string.substring(0, index) + char + string.substring(index + 1);
}

module.exports.changeSubscriptions = changeSubscriptions;
module.exports.deleteAllSubscriptions = deleteAllSubscriptions;