const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const app = new Koa();

const animalType = require('./routes/animalType');
const animal = require('./routes/animal');
const account = require('./routes/account');
const environment = require('./routes/environment');
const db = require('./db');
const mqtt = require('./mqtt');

db.createInfluxDBConnection(8086);
db.createMySQLConnection(root,'')
    .then(db.insertTestingDataInMySQLTables);
    //.then(db.insertTestingDataInInfluxDBTables).catch((err) => console.log(err));

app
    .use(bodyParser())
    .use(cors());

app.use(animalType.routes());
app.use(animalType.allowedMethods());
app.use(animal.routes());
app.use(animal.allowedMethods());
app.use(account.routes());
app.use(account.allowedMethods());
app.use(environment.routes());
app.use(environment.allowedMethods());

app.listen(8080);