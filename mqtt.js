const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://mqtt.thing.zone:1896', {
    username: 'yellow',
    password: '9f0f8f19e1'
});

client.on('connect', function () {
    client.subscribe('#', function (err) {
        if (err) console.log(err);
    });
    let buf = new Buffer(3);
    buf.writeUInt8(255,0);
    buf.writeUInt8(255,1);
    buf.writeUInt8(255,2);
    /*client.publish('IMTbk_NRxkaf0XOddOzZIw/ef680300-9b35-4933-9b10-52ffa9740042/ef680301-9b35-4933-9b10-52ffa9740042', '0xFF-00-00', function(err) {
        if (err) console.log(err);
    });*/
});

client.on('message', function (topic, message) {
    console.log(topic + " " + message[0] + '.' + message[1] + '' + message[2]);
    //console.log(topic + " " + message.length);
});

const ts = require('./thingyServicesUUID');
const db = require('./db');

async function changeSubscriptions(thingyUUID, topics, init) {
    if (init) {
        // search subscriptions in mysql
    }
    let topicsToSubscribe = [];
    let topicsToUnsubscribe = [];
    for (const key in topics) {
        let arrayToFill;
        if (topics.key) arrayToFill = topicsToSubscribe;
        else            arrayToFill = topicsToUnsubscribe;
        const topicUUID = key.toUpperCase();
        if (ts.hasOwnProperty(topicUUID)) arrayToFill.concat([thingyUUID + replaceCharAt(ts[topicUUID], 0, 7) + ts[topicUUID]]);
    }
    client.subscribe(topicsToSubscribe, function(err) {
        if (err) console.log(err);
    });
    client.unsubscribe(topicsToUnsubscribe, function(err) {
        if (err) console.log(err);
    });
}

function replaceCharAt(string, char, index) {
    return string.substring(0, index) + char + string.substring(index + 1);
}

module.exports.changeSubscriptions = changeSubscriptions;