const router = require('koa-router')({ prefix: '/environment' });

router
    .get('/all/:userId', getAllEnvironments)
    .get('/one/:envId', getOneEnvironment)
    .post('/:userId', createEnvironment)
    .patch('/:envId', updateEnvironment)
    .delete('/:envId', deleteEnvironment);

const db = require('../db');

// Gets all environment of a user
async function getAllEnvironments(ctx) {
    const res = await db.getAllEnvironments(ctx.params.userId);
    if (res.hasOwnProperty('message') && res.message.startsWith('Error')) {
        ctx.status = 400;
        ctx.body = res.message;
    } else {
        ctx.status = 200;
        ctx.body = res;
    }
}

// Gets one environment
async function getOneEnvironment(ctx) {
    const res = await db.getOneEnvironment(ctx.params.envId);
    if (res.hasOwnProperty('message') && res.message.startsWith('Error')) {
        ctx.status = 400;
        ctx.body = res.message;
    } else {
        ctx.status = 200;
        ctx.body = res;
    }
}

// Creates an environment
async function createEnvironment(ctx) {
    ctx.request.body['user_id'] = ctx.params.userId;
    const res = await db.insertMySQL('environment', ctx.request.body);
    if (res.hasOwnProperty('message') && res.message.startsWith('Error')) {
        ctx.status = 400;
        ctx.body = res.message;
    } else {
        ctx.params.envId = res.insertId;
        await getOneEnvironment(ctx);
    }
}

// Updates an environment
async function updateEnvironment(ctx) {
    const res = await db.updateMySQL('environment', ctx.request.body, ctx.params.envId);
    if (res.hasOwnProperty('message') && res.message.startsWith('Error')) {
        ctx.status = 400;
        ctx.body = res.message;
    } else {
        await getOneEnvironment(ctx);
    }
}

// Deletes an environment
async function deleteEnvironment(ctx) {
    const res = await db.deleteMySQL('environment', ctx.params.envId);
    if (res.hasOwnProperty('message') && res.message.startsWith('Error')) {
        ctx.status = 400;
        ctx.body = res.message;
    } else {
        ctx.status = 200;
        ctx.body = res;
    }
}

module.exports = router;