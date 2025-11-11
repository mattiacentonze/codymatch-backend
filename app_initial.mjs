import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createStream } from 'rotating-file-stream';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import apiRouter from '#root/routes/index.mjs';
import errorInit from '#root/services/ExpressError.mjs';
import models from '#root/models/init-models.mjs';
import cron from '#root/services/Cron.mjs';
import { initPermissions } from '#root/services/Authorization.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

const accessLogStream = createStream('access.log', {
  interval: '1d', // rotate daily
  path: path.join(__dirname, 'log'),
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('combined', { stream: accessLogStream }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(apiRouter);

await models.init();
if (process.env.NODE_ENV !== 'test') await cron.init();
await initPermissions();

errorInit(app);

export default app;
