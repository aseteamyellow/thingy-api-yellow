let connI = null;
let connM = null;

// Creation of InfluxDB connection
async function createInfluxDBConnection(port) {
    const influx = require('influxdb-nodejs');
    connI = new influx('http://127.0.0.1:' + port + '/thingy');
    connI.createDatabase().catch((err) => console.log(err));
}

// Creation of InfluxDB table (one per thingy)
async function createTableInfluxDB(tableName) {
    await connI.schema(tableName, {
        humidity: 'float',
        temperature: 'float',
        air_quality: 'float',
        air_pressure: 'float',
        light: 'float'
    });
}

// Deletion of InfluxDB table
async function deleteTableInfluxDB(tableName) {
    // TODO

}

// Insertion of data into InfluxDB table
async function insertInfluxDB(tableName, data) {
    await connI.write(tableName).field(data);
}

// Reading of sensors data of a thingy
async function getSensorsData(thingyId) {
    return await connI.query(thingyId);
}

// Creation of MySQL connection + tables
async function createMySQLConnection(host, user, password) {
    const mysql = require('async-mysql');
    connM = await mysql.connect({
        host: host,
        user: user,
        password: password,
        multipleStatements: true
    }).catch((err) => console.log(err));
    await connM.query('CREATE DATABASE IF NOT EXISTS Thingy_Yellow').catch((err) => console.log(err));
    await connM.query('USE Thingy_Yellow; SET sql_mode = \'STRICT_ALL_TABLES\';').catch((err) => console.log(err));
    const userTableCreation =           'CREATE TABLE IF NOT EXISTS user (' +
                                        'id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,' +
                                        'email VARCHAR(100) UNIQUE NOT NULL,' +
                                        'password VARCHAR(100) NOT NULL);';
    const environmentTableCreation =    'CREATE TABLE IF NOT EXISTS environment (' +
                                        'id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,' +
                                        'user_id INT UNSIGNED NOT NULL,' +
                                        'name VARCHAR(100) NOT NULL,' +
                                        'env_type ENUM(\'terrarium\', \'aquarium\', \'aquaterrarium\'),' +
                                        'humidity INT UNSIGNED,' +
                                        'temperature INT,' +
                                        'air_quality INT UNSIGNED,' +
                                        'air_pressure INT UNSIGNED,' +
                                        'light INT UNSIGNED,' +
                                        'humidity_notif BOOL DEFAULT false,' +
                                        'temperature_notif BOOL DEFAULT false,' +
                                        'air_quality_notif BOOL DEFAULT false,' +
                                        'air_pressure_notif BOOL DEFAULT false,' +
                                        'light_notif BOOL DEFAULT false,' +
                                        'thingy VARCHAR(100) NOT NULL,' +
                                        'FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE ON UPDATE CASCADE);';
    const animalTypeTableCreation =     'CREATE TABLE IF NOT EXISTS animalType (' +
                                        'id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,' +
                                        'type VARCHAR(100) UNIQUE NOT NULL);';
    const animalTableCreation =         'CREATE TABLE IF NOT EXISTS animal (' +
                                        'id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,' +
                                        'name VARCHAR(100) NOT NULL,' +
                                        'environment_id INT UNSIGNED NOT NULL,' +
                                        'animalType_id INT UNSIGNED NOT NULL,' +
                                        'FOREIGN KEY (environment_id) REFERENCES environment(id) ON DELETE CASCADE ON UPDATE CASCADE,' +
                                        'FOREIGN KEY (animalType_id) REFERENCES animalType(id) ON DELETE CASCADE ON UPDATE CASCADE);';
    await connM.query(userTableCreation + environmentTableCreation + animalTypeTableCreation + animalTableCreation).catch((err) => console.log(err));
    const animalTypes = ['dog','cat','hamster','indian pig','bunny','rat','snake','lizard','iguana','turtle','triton','salamander','chameleon','spider','fish','insects','parrot','other'];
    const animalTypeSelection = 'SELECT * FROM animalType;';
    const animalTypeContent = await connM.query(animalTypeSelection).catch((err) => console.log(err));
    if (animalTypeContent.length === 0) {
        for (let i = 0; i < animalTypes.length; i++) {
            const animalTypeTableInsertion = "INSERT INTO animalType (type) VALUES ('" + animalTypes[i] + "');";
            await connM.query(animalTypeTableInsertion).catch((err) => console.log(err));
        }
    }
}

const ts = require('./thingyServicesUUID');
const mqtt = require('./mqtt');

// Changement of the subscriptions
async function changeSubscriptions(thingyId, data) {
    let subs = {};
    for (const key in data) {
        if (data.hasOwnProperty(key) && ts.hasOwnProperty(key.toUpperCase())) subs[key] = data[key];
    }
    await mqtt.changeSubscriptions(thingyId, subs);
}

// Insertion of data into MySQL table
async function insertMySQL(tableName, data) {
    if (tableName === 'environment') {
        await createTableInfluxDB(data['thingy']);
        await changeSubscriptions(data['thingy'], data);
    }
    let columns = "";
    let values = "";
    for (const key in data) {
        columns += key + ",";
        if (data.hasOwnProperty(key))
            if (key.endsWith('notif')) values += (data[key] + ",");
            else values += ("'" + data[key] + "',");
    }
    columns = columns.substring(0, columns.length-1);
    values = values.substring(0, values.length-1);
    const tableInsertion =  'INSERT INTO ' + tableName + ' (' + columns + ') ' +
                            'VALUES (' + values + ')';
    return await connM.query(tableInsertion).catch((err) => {return err;});
}

// Modification of data in MySQL table
async function updateMySQL(tableName, data, id) {
    if (tableName === 'environment') {
        const getEnvironment = 'SELECT * FROM environment WHERE id = ' + id;
        const environment = await connM.query(getEnvironment).catch((err) => console.log(err));
        if (data.hasOwnProperty('thingy')) {
            await changeSubscriptions(environment['thingy'], {
                temperature_notif: false,
                air_pressure_notif: false,
                humidity_notif: false,
                air_quality_notif: false,
                light_notif: false
            });
            for (const key in data) {
                if (data.hasOwnProperty(key) && ts.hasOwnProperty(key.toUpperCase())) environment[key] = data[key];
            }
            await changeSubscriptions(data['thingy'], environment);
        } else {
            await changeSubscriptions(environment['thingy'], data);
        }
    }
    let tableModification = 'UPDATE ' + tableName + ' SET ';
    for (const key in data) {
        if (data.hasOwnProperty(key)) //tableModification += key + " = '" + data[key] + "',";
            if (key.endsWith('notif')) tableModification += key + " = " + data[key] + ",";
            else tableModification += key + " = '" + data[key] + "',";
    }
    tableModification = tableModification.substring(0, tableModification.length-1) + " WHERE id = " + id;
    return await connM.query(tableModification).catch((err) => {return err;});
}

// Deletion of data from MySQL table
async function deleteMySQL(tableName, id) {
    if (tableName === 'environment') {
        const getThingyId = 'SELECT * FROM environment WHERE id = ' + id;
        const thingyId = await connM.query(getThingyId).catch((err) => console.log(err));
        await changeSubscriptions(thingyId, {
            temperature_notif: false,
            air_pressure_notif: false,
            humidity_notif: false,
            air_quality_notif: false,
            light_notif: false
        });
        // Call influxdb table deletion
    }
    const tableDeletion = 'DELETE FROM ' + tableName + ' WHERE id = ' + id;
    const res = await connM.query(tableDeletion).catch((err) => {return err;});
    if (res.affectedRows === 0) {
        return {message:"Error: ER_NO_ENTRY: user not found"};
    } else {
        return 'Success';
    }
}

// Reading of a user
async function getOneUser(credentials) {
    const tableReading = "SELECT * FROM user WHERE email = '" + credentials.email + "' AND password = '" + credentials.password + "'";
    const res = await connM.query(tableReading).catch((err) => {return err;});
    if (res.length !== 0) {
        res[0].token = "new token";
        return res[0];
    } else {
        return {message:"Error: ER_NO_ENTRY: user not found"};
    }
}

// Reading of an animal
async function getOneAnimal(id) {
    const tableReading = 'SELECT animal.id, animal.name, animal.environment_id, animalType.type FROM animal JOIN animalType ON animal.animalType_id = animalType.id WHERE animal.id = ' + id;
    const res = await connM.query(tableReading).catch((err) => {return err;});
    if (res.length !== 0) {
        return res[0];
    } else {
        return {message:"Error: ER_NO_ENTRY: animal not found"};
    }
}

// Reading all animals of an environment
async function getAllAnimals(id) {
    const tableReading = 'SELECT animal.id, animal.name, animalType.type FROM animal JOIN animalType ON animal.animalType_id = animalType.id WHERE animal.environment_id = ' + id;
    return await connM.query(tableReading).catch((err) => {return err;});
}

// Reading of an environment
async function getOneEnvironment(id) {
    const tableReading = 'SELECT * FROM environment WHERE id = ' + id;
    const animals = await getAllAnimals(id);
    const res = await connM.query(tableReading).catch((err) => {return err;});
    if (res.length !== 0) {
        res[0]['animals'] = animals;
        return res[0];
    } else {
        return {message:"Error: ER_NO_ENTRY: environment not found"};
    }
}

// Reading all environment of a user
async function getAllEnvironments(id) {
    const tableReading = 'SELECT * FROM environment WHERE user_id = ' + id;
    const res = await connM.query(tableReading).catch((err) => {return err;});
    for (let i = 0; i < res.length; i++) {
        res[i]['animals'] = await getAllAnimals(res[i].id);
    }
    return res;
}

// Reading all notification settings of all thingys
async function getNotifs() {
    const tableReading = 'SELECT thingy, humidity_notif, temperature_notif, air_quality_notif, air_pressure_notif, light_notif FROM environment';
    return await connM.query(tableReading).catch((err) => {return err;});
}

module.exports.createInfluxDBConnection = createInfluxDBConnection;
module.exports.createTableInfluxDB = createTableInfluxDB;
module.exports.deleteTableInfluxDB = deleteTableInfluxDB;
module.exports.insertInfluxDB = insertInfluxDB;
module.exports.getSensorsData = getSensorsData;

module.exports.createMySQLConnection = createMySQLConnection;
module.exports.insertMySQL = insertMySQL;
module.exports.updateMySQL = updateMySQL;
module.exports.deleteMySQL = deleteMySQL;
module.exports.getOneUser = getOneUser;
module.exports.getOneAnimal = getOneAnimal;
module.exports.getAllAnimals = getAllAnimals;
module.exports.getOneEnvironment = getOneEnvironment;
module.exports.getAllEnvironments = getAllEnvironments;
module.exports.getNotifs = getNotifs;
