import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');

  // Running behind the VPS's system Nginx: without this, Express sees
  // every request as coming from Nginx's own loopback address, not the
  // real client IP — which means express-rate-limit's three limiters
  // (chat, auth, general) would count ALL visitors as a single shared IP
  // instead of applying limits per-visitor. `1` = trust exactly one proxy
  // hop (our own Nginx), not an arbitrary chain.
  app.set('trust proxy', 1);

  app.use(helmet());
 app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || env.allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
