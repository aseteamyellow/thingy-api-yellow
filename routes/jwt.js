const KoaJwt = require('koa-jwt');
require('dotenv').config();

module.exports = KoaJwt({
    secret: process.env.MY_SECRET_KEY
});