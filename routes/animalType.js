const router = require('koa-router')({ prefix: '/animalType' });

router.get('/', getAllAnimalTypes);

const db = require('../db');

// Reads all animal types
async function getAllAnimalTypes(ctx) {
    const res = await db.getAllAnimalTypes();
    if (res.hasOwnProperty('message') && res.message.startsWith('Error')) {
        ctx.status = 400;
        ctx.body = res.message;
    } else {
        ctx.status = 200;
        ctx.body = res;
    }
}

module.exports = router;