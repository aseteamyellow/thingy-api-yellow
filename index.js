const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const app = new Koa();

const animal = require('./routes/animal');
const account = require('./routes/account');
const environment = require('./routes/environment');
const db = require('./db');
const mqtt = require('./mqtt');

db.createInfluxDBConnection(8086);
//db.createMySQLConnection('localhost','root','');
db.createMySQLConnection('localhost','root','').then(db.insertTestingDataInMySQLTables).catch((err) => console.log(err));

app
    .use(bodyParser())
    .use(cors());

app.use(animal.routes());
app.use(animal.allowedMethods());
app.use(account.routes());
app.use(account.allowedMethods());
app.use(environment.routes());
app.use(environment.allowedMethods());

app.listen(8080);