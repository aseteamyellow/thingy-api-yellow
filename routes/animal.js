const router = require('koa-router')({ prefix: '/animal' });

router
    .get('/allOfUser/:userId', getAllAnimalsOfUser)
    .get('/all/:envId', getAllAnimals)
    .get('/one/:animalId', getOneAnimal)
    .post('/:envId', createAnimal)
    .patch('/:animalId', updateAnimal)
    .delete('/:animalId', deleteAnimal);

const db = require('../db');

// Reads all animals of a user
async function getAllAnimalsOfUser(ctx) {
    const res = await db.getAllUserAnimals(ctx.params.userId);
    if (res.hasOwnProperty('message') && res.message.startsWith('Error')) {
        ctx.status = 400;
        ctx.body = res.message;
    } else {
        ctx.status = 200;
        ctx.body = res;
    }
}

// Reads all animals of an environment
async function getAllAnimals(ctx) {
    const res = await db.getAllAnimals(ctx.params.envId);
    if (res.hasOwnProperty('message') && res.message.startsWith('Error')) {
        ctx.status = 400;
        ctx.body = res.message;
    } else {
        ctx.status = 200;
        ctx.body = res;
    }
}

// Reads an animal
async function getOneAnimal(ctx) {
    const res = await db.getOneAnimal(ctx.params.animalId);
    if (res.hasOwnProperty('message') && res.message.startsWith('Error')) {
        ctx.status = 400;
        ctx.body = res.message;
    } else {
        ctx.status = 200;
        ctx.body = res;
    }
}

// Creates an animal
async function createAnimal(ctx) {
    ctx.request.body['environment_id'] = ctx.params.envId;
    const res = await db.insertMySQL('animal', ctx.request.body);
    if (res.hasOwnProperty('message') && res.message.startsWith('Error')) {
        ctx.status = 400;
        ctx.body = res.message;
    } else {
        ctx.params.animalId = res.insertId;
        await getOneAnimal(ctx);
    }
}

// Updates an animal
async function updateAnimal(ctx) {
    const res = await db.updateMySQL('animal', ctx.request.body, ctx.params.animalId);
    if (res.hasOwnProperty('message') && res.message.startsWith('Error')) {
        ctx.status = 400;
        ctx.body = res.message;
    } else {
        await getOneAnimal(ctx);
    }
}

// Deletes an animal
async function deleteAnimal(ctx) {
    const res = await db.deleteMySQL('animal', ctx.params.animalId);
    if (res.hasOwnProperty('message') && res.message.startsWith('Error')) {
        ctx.status = 400;
        ctx.body = res.message;
    } else {
        ctx.status = 200;
        ctx.body = res;
    }
}

module.exports = router;