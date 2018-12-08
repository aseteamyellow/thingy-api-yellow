let connI = null;
let connM = null;

// Creation of InfluxDB connection
async function createInfluxDBConnection(port) {
    const influx = require('influxdb-nodejs');
    //connI = new influx('http://influxdb:' + port + '/thingy');    // Used for docker
    connI = new influx('http://127.0.0.1:' + port + '/thingy');     // Used locally
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
    await connI.query('DROP SERIES FROM ' + tableName);
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
async function createMySQLConnection(user, password) {
    const mysql = require('async-mysql');
    connM = await mysql.connect({
        host: process.env.DATABASE_HOST || '127.0.0.1',
        user: user,
        password: password,
        multipleStatements: true
    }).catch((err) => console.log(err));
    await connM.query('CREATE DATABASE IF NOT EXISTS Thingy_Yellow').catch((err) => console.log(err));
    await connM.query('USE Thingy_Yellow; SET sql_mode = \'STRICT_ALL_TABLES\';').catch((err) => console.log(err));
    const userTableCreation =           'CREATE TABLE IF NOT EXISTS user (' +
                                        'id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,' +
                                        'email VARCHAR(100) UNIQUE NOT NULL,' +
                                        'password VARCHAR(100) NOT NULL,' +
                                        'firebase_token VARCHAR(100) NOT NULL);';
    const environmentTableCreation =    'CREATE TABLE IF NOT EXISTS environment (' +
                                        'id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,' +
                                        'user_id INT UNSIGNED NOT NULL,' +
                                        'name VARCHAR(100) NOT NULL,' +
                                        'icon LONGTEXT NOT NULL,' +
                                        'env_type ENUM(\'terrarium\', \'aquarium\', \'aquaterrarium\') NOT NULL,' +
                                        'humidity_min DECIMAL(15,5),' +
                                        'humidity_max DECIMAL(15,5),' +
                                        'temperature_min DECIMAL(15,5),' +
                                        'temperature_max DECIMAL(15,5),' +
                                        'air_quality_min DECIMAL(15,5),' +
                                        'air_quality_max DECIMAL(15,5),' +
                                        'air_pressure_min DECIMAL(15,5),' +
                                        'air_pressure_max DECIMAL(15,5),' +
                                        'light_min DECIMAL(15,5),' +
                                        'light_max DECIMAL(15,5),' +
                                        'humidity_notif BOOL DEFAULT false,' +
                                        'temperature_notif BOOL DEFAULT false,' +
                                        'air_quality_notif BOOL DEFAULT false,' +
                                        'air_pressure_notif BOOL DEFAULT false,' +
                                        'light_notif BOOL DEFAULT false,' +
                                        'pi_camera VARCHAR(100),' +
                                        'thingy VARCHAR(100) NOT NULL,' +
                                        'FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE ON UPDATE CASCADE);';
    const animalTypeTableCreation =     'CREATE TABLE IF NOT EXISTS animalType (' +
                                        'id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,' +
                                        'type VARCHAR(100) UNIQUE NOT NULL,' +
                                        'icon LONGTEXT NOT NULL);';
    const animalTableCreation =         'CREATE TABLE IF NOT EXISTS animal (' +
                                        'id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,' +
                                        'name VARCHAR(100) NOT NULL,' +
                                        'environment_id INT UNSIGNED NOT NULL,' +
                                        'animalType_id INT UNSIGNED NOT NULL,' +
                                        'FOREIGN KEY (environment_id) REFERENCES environment(id) ON DELETE CASCADE ON UPDATE CASCADE,' +
                                        'FOREIGN KEY (animalType_id) REFERENCES animalType(id) ON DELETE CASCADE ON UPDATE CASCADE);';
    await connM.query(userTableCreation + environmentTableCreation + animalTypeTableCreation + animalTableCreation).catch((err) => console.log(err));
    const animalTypes = ['dog','cat','indian pig','bunny','rat','snake','lizard','iguana','turtle','chameleon','spider',
                         'fish','insects','parrot','bird','frog','scorpion','ferret','crocodile','sea horse','squirrel',
                         'butterfly','octopus','snail','other'];
    const animalTypeSelection = 'SELECT * FROM animalType;';
    const animalTypeContent = await connM.query(animalTypeSelection).catch((err) => console.log(err));
    if (animalTypeContent.length === 0) {
        for (let i = 0; i < animalTypes.length; i++) {
            const animalTypeTableInsertion = "INSERT INTO animalType VALUES (NULL,'" + animalTypes[i] + "','" + base64_img(animalTypes[i].replace(/\s/g,'')) + "');";
            await connM.query(animalTypeTableInsertion).catch((err) => console.log(err));
        }
    }

    // keep-alive mysql connection
    setInterval(function () {
        connM.query('SELECT 1;')
    }, 5000);
}

const fs = require('fs');
function base64_img(file) {
    return 'data:image/png;base64,' + new Buffer(fs.readFileSync('images/icon_' + file + '.png')).toString('base64');
}

// Insertion of testing data into MysQL tables
async function insertTestingDataInMySQLTables() {
    const deleteAllTablesContent = "DELETE FROM animal; DELETE FROM environment; DELETE FROM user;";
    const resetAllIncrements = "ALTER TABLE animal AUTO_INCREMENT = 1; ALTER TABLE environment AUTO_INCREMENT = 1; ALTER TABLE user AUTO_INCREMENT = 1;";
    const insertUsers = "INSERT INTO user VALUES (NULL,'nicolas.fuchs@unifr.ch','PasswordOfNicolas','TokenOfNicolas')," +
                                                "(NULL,'sylvain.julmy@unifr.ch','PasswordOfSylvain','TokenOfSylvain')," +
                                                "(NULL,'delia.favre@unifr.ch','PasswordOfDelia','TokenOfDelia')," +
                                                "(NULL,'maeva.vulliens@unifr.ch','PasswordOfMaeva','TokenOfMaeva')," +
                                                "(NULL,'tania.chenaux@unifr.ch','PasswordOfTania','TokenOfTania');";
    const insertEnvironments = "INSERT INTO environment VALUES (NULL,'1','NicoAquarium','" + base64_img('environment1') + "','aquarium','0.1','0.9','23','28','0','10000','924','926','0','255255255',true,true,true,true,true,'172.22.22.192:8080','ThingyY1')," +
                                                              "(NULL,'3','DeliaTerrarium','" + base64_img('environment1') + "','terrarium',NULL,NULL,'23','28','0','5000','924','926',NULL,NULL,false,true,true,true,false,NULL,'Yellow');";
    const insertAnimals = "INSERT INTO animal VALUES (NULL,'riri',1,12)," +
                                                    "(NULL,'fifi',1,16)," +
                                                    "(NULL,'loulou',1,9)," +
                                                    "(NULL,'donut',2,5)," +
                                                    "(NULL,'capsule',2,4);";
    connM.query(deleteAllTablesContent + resetAllIncrements + insertUsers + insertEnvironments + insertAnimals).catch((err) => console.log(err));
}

// Insertion of testing data into influxDB tables
async function insertTestingDataInInfluxDBTables() {
    let sensorsData1 = [
        {"air_quality":1444,"temperature":26.98,"humidity":43,"air_pressure":919.41},
        {"air_quality":567,"temperature":27.66,"air_pressure":918.83},
        {"air_quality":1444,"temperature":26.99,"humidity":44,"air_pressure":919.37},
        {"air_quality":560,"temperature":28.07,"air_pressure":918.84},
        {"air_quality":1444,"temperature":26.85,"humidity":44,"air_pressure":919.45},
        {"air_quality":560,"temperature":26.83,"air_pressure":918.72},
        {"air_quality":1428,"temperature":26.99,"humidity":43,"air_pressure":919.43},
        {"air_quality":567,"temperature":27.68,"air_pressure":918.93},
        {"air_quality":1444,"temperature":27.14,"humidity":44,"air_pressure":919.36},
        {"air_quality":553,"temperature":27.64,"air_pressure":918.86}
    ];
    let sensorsData2 = [
        {"air_quality":1444,"temperature":26.92,"humidity":44,"air_pressure":919.35},
        {"air_quality":560,"temperature":28.27,"air_pressure":918.85},
        {"air_quality":1444,"temperature":26.92,"humidity":44,"air_pressure":919.32},
        {"air_quality":567,"temperature":27.66,"air_pressure":918.74},
        {"air_quality":1472,"temperature":26.9,"humidity":43,"air_pressure":919.37},
        {"air_quality":560,"temperature":27,"air_pressure":918.84},
        {"temperature":27.26,"light":23278,"humidity":42,"air_pressure":919.31,"air_quality":1736},
        {"temperature":27.24,"light":23287,"humidity":43,"air_pressure":919.28,"air_quality":1736},
        {"temperature":27.3,"light":23287,"humidity":42,"air_pressure":919.29,"air_quality":1736},
        {"temperature":27.39,"light":23280,"humidity":42,"air_pressure":919.33,"air_quality":1736}
    ];
    for (let i = 0; i < sensorsData1.length; i++) {
        await insertInfluxDB('Yellow', sensorsData1[i]);
        await insertInfluxDB('ThingyY1', sensorsData2[i]);
    }
}

const mqtt = require('./mqtt');

// Insertion of data into MySQL table
async function insertMySQL(tableName, data) {
    if (tableName === 'environment') {
        await createTableInfluxDB(data['thingy']);
        await mqtt.changeSubscriptions(data['thingy'], data);
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
    const tableInsertion =  'INSERT INTO ' + tableName + ' (' + columns + ') ' + 'VALUES (' + values + ')';
    return await connM.query(tableInsertion).catch((err) => {return err;});
}

// Modification of data in MySQL table
async function updateMySQL(tableName, data, id) {
    if (tableName === 'environment') {
        if (data.hasOwnProperty('thingy')) {
            await deleteTableInfluxDB(data.thingy);
            await mqtt.deleteAllSubscriptions(data.thingy);
        }
        if (!data.hasOwnProperty('thingy')) {
            const tableReading = 'SELECT thingy FROM environment WHERE id = ' + id;
            const res = await connM.query(tableReading).catch((err) => {return err;});
            data['thingy'] = res[0].thingy;
        }
        await mqtt.changeSubscriptions(data['thingy'], data);
    }
    let tableModification = 'UPDATE ' + tableName + ' SET ';
    for (const key in data) {
        if (data.hasOwnProperty(key)) tableModification += key + " = '" + data[key] + "',";
    }
    tableModification = tableModification.substring(0, tableModification.length-1) + " WHERE id = " + id;
    return await connM.query(tableModification).catch((err) => {return err;});
}

// Deletion of data from MySQL table
async function deleteMySQL(tableName, id) {
    if (tableName === 'environment') {
        const tableReading = 'SELECT thingy FROM environment WHERE id = ' + id;
        const res = await connM.query(tableReading).catch((err) => {return err;});
        await  deleteTableInfluxDB(res[0].thingy);
        await mqtt.deleteAllSubscriptions(res[0].thingy);
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
    const tableReading = 'SELECT * FROM animal WHERE animal.id = ' + id;
    const res = await connM.query(tableReading).catch((err) => {return err;});
    if (res.length !== 0) {
        return res[0];
    } else {
        return {message:"Error: ER_NO_ENTRY: animal not found"};
    }
}

// Reading all animals of an environment
async function getAllAnimals(id) {
    const tableReading = 'SELECT animal.id, animal.name, animal.animalType_id FROM animal WHERE animal.environment_id = ' + id;
    return await connM.query(tableReading).catch((err) => {return err;});
}

// Reading all animals of a user
async function getAllUserAnimals(id) {
    const tableReading = 'SELECT animal.id, animal.name, animal.animalType_id FROM animal JOIN environment ON animal.environment_id = environment.id WHERE environment.user_id = ' + id;
    return await connM.query(tableReading).catch((err) => {return err;});
}

// Reading all animal types
async function getAllAnimalTypes() {
    const tableReading = 'SELECT * FROM animalType;';
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

// Reading all environments of a user
async function getAllEnvironments(id) {
    const tableReading = 'SELECT * FROM environment WHERE user_id = ' + id;
    const res = await connM.query(tableReading).catch((err) => {return err;});
    for (let i = 0; i < res.length; i++) {
        res[i]['animals'] = await getAllAnimals(res[i].id);
    }
    return res;
}

// Reading all notification settings of all thingys
/*async function getNotifs() {
    const tableReading = 'SELECT thingy, humidity_notif, temperature_notif, air_quality_notif, air_pressure_notif, light_notif FROM environment';
    return await connM.query(tableReading).catch((err) => {return err;});
}*/

// Reading configurations of all thingys
async function getThingysConfigs() {
    const tableReading = 'SELECT e.thingy, e.humidity_notif, e.temperature_notif, e.air_quality_notif, e.air_pressure_notif, e.light_notif,' +
                         'e.humidity_min, e.humidity_max, e.temperature_min, e.temperature_max, e.air_quality_min, e.air_quality_max,' +
                         'e.air_pressure_min, e.air_pressure_max, e.light_min, e.light_max, u.firebase_token FROM environment e JOIN user u ' +
                         'ON e.user_id = u.id;';
    return await connM.query(tableReading).catch((err) => {return err;});
}

module.exports.createInfluxDBConnection = createInfluxDBConnection;
module.exports.createTableInfluxDB = createTableInfluxDB;
module.exports.deleteTableInfluxDB = deleteTableInfluxDB;
module.exports.insertInfluxDB = insertInfluxDB;
module.exports.getSensorsData = getSensorsData;

module.exports.insertTestingDataInInfluxDBTables = insertTestingDataInInfluxDBTables;
module.exports.insertTestingDataInMySQLTables = insertTestingDataInMySQLTables;

module.exports.createMySQLConnection = createMySQLConnection;
module.exports.insertMySQL = insertMySQL;
module.exports.updateMySQL = updateMySQL;
module.exports.deleteMySQL = deleteMySQL;
module.exports.getOneUser = getOneUser;
module.exports.getOneAnimal = getOneAnimal;
module.exports.getAllAnimals = getAllAnimals;
module.exports.getAllUserAnimals = getAllUserAnimals;
module.exports.getAllAnimalTypes = getAllAnimalTypes;
module.exports.getOneEnvironment = getOneEnvironment;
module.exports.getAllEnvironments = getAllEnvironments;
//module.exports.getNotifs = getNotifs;
module.exports.getThingysConfigs = getThingysConfigs;
