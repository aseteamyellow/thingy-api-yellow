const router = require('koa-router')({ prefix: '/account' });

router
    .post('/register', register)
    .post('/connect', connect)
    .patch('/update/:userId', update)
    .del('/delete/:userId', del);

const db = require('../db');

// Registers a new user
async function register(ctx) {
    const res = await db.insertMySQL('user', ctx.request.body);
    if (res.hasOwnProperty('message') && res.message.startsWith('Error')) {
        ctx.status = 400;
        ctx.body = res.message;
    } else {
        await connect(ctx);
    }
}

// Connects a user and returns a token
async function connect(ctx) {
    const res = await db.getOneUser(ctx.request.body);
    console.log(ctx.request.path);
    if (res.hasOwnProperty('message') && res.message.startsWith('Error')) {
        ctx.status = 400;
        ctx.body = res.message;
    } else {
        ctx.status = 200;
        ctx.body = res;
    }
}

// Updates information of a user
async function update(ctx) {
    const res = await db.updateMySQL('user', ctx.request.body, ctx.params.userId);
    if (res.hasOwnProperty('message') && res.message.startsWith('Error')) {
        ctx.status = 400;
        ctx.body = res.message;
    } else {
        await connect(ctx);
    }
}

// Deletes a user
async function del(ctx) {
    const res = await db.deleteMySQL('user', ctx.params.userId);
    if (res.hasOwnProperty('message') && res.message.startsWith('Error')) {
        ctx.status = 400;
        ctx.body = res.message;
    } else {
        ctx.status = 200;
        ctx.body = res
    }
}

module.exports = router;