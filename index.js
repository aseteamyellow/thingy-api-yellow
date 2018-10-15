const router = require('koa-router')();

const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');

const influx = require('influxdb-nodejs');
const client = new influx('http://127.0.0.1:8086/thingy');
console.log(client);

const app = new Koa();

// InfluxDB connection
let connection;
(async() => {

})();

// Routes
router
    .del('/account/:accountId',)
    .post('/account/create',)
    .post('/account/connect')
    .patch('/account/:accountId',);

// Gets
async function getFunction(ctx) {

    ctx.status = 200;
    ctx.body = {};
}

// Deletes
async function deleteFunction(ctx) {
    const deleteQuery = '';
    await connection.query(deleteQuery).catch((err) => console.log(err));
    ctx.status = 200;
    ctx.body = '';
}

// Creates
async function createFunction(ctx) {
    const todo = ctx.request.body;
    const insertQuery = '';
    const res = await connection.query(insertQuery).catch((err) => console.log(err));
    ctx.status = 303;
    ctx.set('Location', 'url' + res.insertId);
}

app
    .use(bodyParser())
    .use(cors())
    .use(router.routes())
    .use(router.allowedMethods());

app.listen(8080);