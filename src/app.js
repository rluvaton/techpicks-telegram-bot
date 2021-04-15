// When using console this will make it print the whole object. and not [Object] when it's too deep
require("util").inspect.defaultOptions.depth = null;

const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const telegramWebhookRouter = require('./routes/telegram-webhook');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/telegram-bot/', telegramWebhookRouter);

module.exports = app;
