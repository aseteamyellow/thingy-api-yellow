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
    const name = tableName + 'Schema';
    eval ('const ' + name + ' = {' +
        'humidity: \'i\',' +
        'temperature: \'i\',' +
        'air_quality: \'i\',' +
        'air_pressure: \'i\',' +
        'acceleration: \'i\'};');
    await connI.schema('http', eval(name), {stripUnknown: true});
}

// Deletion of InfluxDB table
async function deleteTableInfluxDB(tableName) {
    const name = tableName + 'Schema';
    // TODO
}

// Insertion of data into InfluxDB table
async function insertInfluxDB(tableName, data) {
    await eval('connI.write(\'http\').' + tableName + '(' + data + ')');
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
                                        'acceleration INT UNSIGNED,' +
                                        'humidity_notif BOOL DEFAULT false,' +
                                        'temperature_notif BOOL DEFAULT false,' +
                                        'air_quality_notif BOOL DEFAULT false,' +
                                        'air_pressure_notif BOOL DEFAULT false,' +
                                        'acceleration_notif BOOL DEFAULT false,' +
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

// Insertion of data into MySQL table
async function insertMySQL(tableName, data) {
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
    let tableModification = 'UPDATE ' + tableName + ' SET ';
    for (const key in data) {
        if (data.hasOwnProperty(key)) tableModification += key + " = '" + data[key] + "',";
    }
    tableModification = tableModification.substring(0, tableModification.length-1) + " WHERE id = " + id;
    return await connM.query(tableModification).catch((err) => {return err;});
}

// Deletion of data from MySQL table
async function deleteMySQL(tableName, id) {
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
    /*const tableReading =    'SELECT environment.id,environment.user_id,environment.name,' +
                            'environment.env_type,environment.humidity,environment.temperature,' +
                            'environment.air_quality,environment.air_pressure,environment.acceleration,' +
                            'environment.humidity_notif,environment.temperature_notif,environment.air_quality_notif,' +
                            'environment.air_pressure_notif,environment.acceleration_notif' +
                            'animal.id,animal.name,animalType.type ' +
                            'FROM animal JOIN animalType ON animal.animalType_id = animalType.id ' +
                            'JOIN environment ON animal.environment_id = environment.id ' +
                            'WHERE environment.id = ' + id;*/
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
    /*const tableReading =    'SELECT environment.id,environment.user_id,environment.name,' +
                            'environment.env_type,environment.humidity,environment.temperature,' +
                            'environment.air_quality,environment.air_pressure,environment.acceleration,' +
                            'environment.humidity_notif,environment.temperature_notif,environment.air_quality_notif,' +
                            'environment.air_pressure_notif,environment.acceleration_notif,' +
                            'animal.id,animal.name,animalType.type ' +
                            'FROM animal JOIN animalType ON animal.animalType_id = animalType.id ' +
                            'JOIN environment ON animal.environment_id = environment.id ' +
                            'WHERE environment.user_id = ' + id;*/
    return res;
}


module.exports.createInfluxDBConnection = createInfluxDBConnection;
module.exports.createTableInfluxDB = createTableInfluxDB;
module.exports.deleteTableInfluxDB = deleteTableInfluxDB;
module.exports.insertInfluxDB = insertInfluxDB;

module.exports.createMySQLConnection = createMySQLConnection;
module.exports.insertMySQL = insertMySQL;
module.exports.updateMySQL = updateMySQL;
module.exports.deleteMySQL = deleteMySQL;
module.exports.getOneUser = getOneUser;
module.exports.getOneAnimal = getOneAnimal;
module.exports.getAllAnimals = getAllAnimals;
module.exports.getOneEnvironment = getOneEnvironment;
module.exports.getAllEnvironments = getAllEnvironments;
