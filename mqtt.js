const FCM = require('fcm-node');
const serverKey = 'AAAAuouATXI:APA91bGwxBie0ilY65H7gN9yWgZQ5-DbeHOZzbG6ZOX_7WjaAE5cYTzAvvgevYxetVnLenQW6vedmc6xA2B8Icf2z1zqEGjT_kNBaxKBJ3yitOATGlu8RkCYJ2UOCJrpOikTHEvEBxJX';
const fcm = new FCM(serverKey);

const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://mqtt.thing.zone:1896', {
    username: 'yellow',
    password: '9f0f8f19e1'
});

client.on('connect', function () {
    initSubscriptions().catch((err) => console.log(err));

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

const RED = [255,0,0];
const GREEN = [0,255,0];
let data = {};
client.on('message', function (topic, message) {
    const thingyUUID = topic.split('/')[0];
    if (!data.hasOwnProperty(thingyUUID)) data[thingyUUID] = {};
    switch(message.length) {
        case 1 : data[thingyUUID].humidity = message.readUInt8(0) / 100; break;
        case 2 : data[thingyUUID].temperature = message.readInt8(0) + (message.readUInt8(1) / 100); break;
        case 4 : data[thingyUUID].air_quality = message.readUInt16LE(0); break;
        case 5 : data[thingyUUID].air_pressure = message.readInt32LE(0) + (message.readUInt8(4)/100); break;
        case 8 : data[thingyUUID].light = message.readUInt16LE(0) + message.readUInt16LE(2) + message.readUInt16LE(4) + message.readUInt16LE(6);   //It shouldn't be plus (red, green, blue, clear)
                 //console.log(message.readUInt16LE(0) + ' ' + message.readUInt16LE(2) + ' ' + message.readUInt16LE(4)  + ' ' +  message.readUInt16LE(6));
    }

    if (Object.keys(data[thingyUUID]).length === thingysConfigs[thingyUUID]['nbNotifs']) {
        color = GREEN;
        for (key in data[thingyUUID]) {
            if (thingysConfigs.hasOwnProperty(thingyUUID) && (
                data[thingyUUID][key] < thingysConfigs[thingyUUID][key + '_min'] ||
                data[thingyUUID][key] > thingysConfigs[thingyUUID][key + '_max'])) {
                color = RED;
                const msg = {
                    to: thingysConfigs[thingyUUID]['firebase_token'],
                    notification: {
                        title: 'Sensor Limit Reach',
                        body: key + ' sensor has reach one of its limits'
                    }
                };
                fcm.send(msg, function(err, response){
                    if (err) {
                        console.log("Something has gone wrong! " + err);
                    } else {
                        console.log("Notification sent successfully with response: " + response);
                    }
                });
                break;
            }
        }
        setLedColor(thingyUUID,color);
        //setSound(thingyUUID,[210,5000,50]);
        db.insertInfluxDB(thingyUUID, data[thingyUUID]).catch((err) => console.log(err));
        data[thingyUUID] = {};
    }
});

// Sets the led color of a thingy
async function setLedColor(thingy, rgb) {
    let buffer = new Buffer(4);
    buffer.writeUInt8(1, 0);
    buffer.writeUInt8(rgb[0],1);
    buffer.writeUInt8(rgb[1],2);
    buffer.writeUInt8(rgb[2],3);
    client.publish(thingy + '/ef680300-9b35-4933-9b10-52ffa9740042/ef680301-9b35-4933-9b10-52ffa9740042/write', buffer, function(err) {
        if (err) console.log(err);
    });
}

// Turns on/off the sound of a thingy
async function setSound(thingy,freDurVol) {
    let buffer = new Buffer(2);
    buffer.writeUInt8(1,0);
    buffer.writeUInt8(2,1);
    client.publish(thingy + 'ef680500-9b35-4933-9b10-52ffa9740042/ef680501-9b35-4933-9b10-52ffa9740042/write', buffer, function(err) {
        if (err) console.log(err);
    })
    buffer = new Buffer(5);
    buffer.writeUInt16LE(freDurVol[0],0);
    buffer.writeUInt16LE(freDurVol[1],2);
    buffer.writeUInt8(freDurVol[2],4);
    client.publish(thingy + 'ef680500-9b35-4933-9b10-52ffa9740042/ef680502-9b35-4933-9b10-52ffa9740042/write', buffer, function(err) {
        if (err) console.log(err);
    })
}

const ts = require('./thingyServicesUUID');
const db = require('./db');

let thingysConfigs = {};

// Subscribes to all topics at starting
async function initSubscriptions() {
    const configs = await db.getThingysConfigs();
    for (let i = 0; i < configs.length; i++) {
        const thingy = configs[i].thingy;
        thingysConfigs[thingy] = {};
        await changeSubscriptions(thingy, configs[i]);
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
        } else if (key.endsWith('min') || key.endsWith('max') || key === 'firebase_token') {
            if (!thingysConfigs.hasOwnProperty(thingyUUID)) thingysConfigs[thingyUUID] = {};
            thingysConfigs[thingyUUID][key] = topics[key];
        }
    }
    if (topicsToSubscribe.length !== 0) client.subscribe(topicsToSubscribe, function(err) {
        if (err) console.log(err);
    });
    if (topicsToUnsubscribe.length !== 0) client.unsubscribe(topicsToUnsubscribe, function(err) {
        if (err) console.log(err);
    });
    if (!thingysConfigs.hasOwnProperty(thingyUUID)) {
        thingysConfigs[thingyUUID] = {}; thingysConfigs[thingyUUID]['nbNotifs'] = topicsToSubscribe.length;
    } else {
        if (!thingysConfigs[thingyUUID].hasOwnProperty('nbNotifs')) thingysConfigs[thingyUUID]['nbNotifs'] = 0;
        thingysConfigs[thingyUUID]['nbNotifs'] += topicsToSubscribe.length;
        thingysConfigs[thingyUUID]['nbNotifs'] -= topicsToUnsubscribe.length;
    }
}

// Unsubscribes to all topics of a thingy
async function deleteAllSubscriptions(thingyUUID) {
    client.unsubscribe('thingyUUID/#', function(err) {
        if (err) console.log(err);
    });
    delete thingysConfigs[thingyUUID];
}

// Replace the a character of a string at a specific index
function replaceCharAt(string, char, index) {
    return string.substring(0, index) + char + string.substring(index + 1);
}

module.exports.changeSubscriptions = changeSubscriptions;
module.exports.deleteAllSubscriptions = deleteAllSubscriptions;
