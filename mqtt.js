const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://mqtt.thing.zone:1896', {
    username: 'yellow',
    password: '9f0f8f19e1'
});

client.on('connect', function () {
    initSubscriptions().catch((err) => console.log(err));
    let buffer = new Buffer(4);
    buffer.writeUInt8(1, 0);
    buffer.writeUInt8(255,1);
    buffer.writeUInt8(0,2);
    buffer.writeUInt8(0,3);
    client.publish('jna4PM6ONSWNeQmtf62oBA/ef680300-9b35-4933-9b10-52ffa9740042/ef680301-9b35-4933-9b10-52ffa9740042/write', buffer, function(err) {
        if (err) console.log(err);
    });
    buffer = new Buffer(12);
    buffer.writeUInt16LE(1000,0);
    buffer.writeUInt16LE(1000,2);
    buffer.writeUInt16LE(1000,4);
    buffer.writeUInt16LE(1000,6);
    buffer.writeUInt8(1,8);
    buffer.writeUInt8(255,9);
    buffer.writeUInt8(255,10);
    buffer.writeUInt8(255,11);
    client.publish('jna4PM6ONSWNeQmtf62oBA/ef680200-9b35-4933-9b10-52ffa9740042/ef680206-9b35-4933-9b10-52ffa9740042/write', buffer, function(err) {
        if (err) console.log(err);
    })
});

let datas = {};
let topics = {};
client.on('message', function (topic, message) {
    const thingyId = topic.split('/')[0];
    if (topics.hasOwnProperty(thingyId) && topics[thingyId].includes(topic)) {
        db.insertInfluxDB(topic.split('/')[0], datas[thingyId]).catch((err) => console.log(err));
        datas[thingyId] = {};
        topics[thingyId] = [];
    }
    if (!datas.hasOwnProperty(thingyId)) {
        datas[thingyId] = {};
        topics[thingyId] = [];
    }
    switch(message.length) {
        case 1 : datas[thingyId].humidity = message.readUInt8(0); break;
        case 2 : datas[thingyId].temperature = message.readInt8(0) + (message.readUInt8(1)/100); break;
        case 4 : datas[thingyId].air_quality = message.readUInt16LE(0); break;
        case 5 : datas[thingyId].air_pressure = message.readInt32LE(0) + (message.readUInt8(4)/100); break;
        case 8 : datas[thingyId].light = message.readUInt16LE(0) + message.readUInt16LE(2) + message.readUInt16LE(4) + message.readUInt16LE(6);   //It shouldn't be plus (red, green, blue, clear)
    }
    topics[thingyId].push(topic);
    console.log(topic + ' ' + Object.keys(datas[thingyId]).length);
    //if (Object.keys(data).length === 5) {

});

const ts = require('./thingyServicesUUID');
const db = require('./db');

// Subscribes to all topics at starting
async function initSubscriptions() {
    const subs = await db.getNotifs();
    for (let i = 0; i < subs.length; i++) {
        const thingy = subs[i].thingy; delete subs[i].thingy;
        await changeSubscriptions(thingy, subs[i]);
    }
}

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
    if (topicsToUnsubscribe.length !== 0)client.unsubscribe(topicsToUnsubscribe, function(err) {
        if (err) console.log(err);
    });
}

function replaceCharAt(string, char, index) {
    return string.substring(0, index) + char + string.substring(index + 1);
}

module.exports.changeSubscriptions = changeSubscriptions;