import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import googleAuthRouter from './google-auth.js';

import pubsubEmailWebhook from './pubsub-email-webhook.js';
import outlookEmailWebhook from './outlook-email-webhook.js';

import schaduledGmailWatchRouter from './shaduled-gmail-watch.js';
import scheduledUnreplyRouter from './scheduled-unreply-handler.js';

import smsWebhookRouter from './sms-webhook.js';
import emailDraftWebhookRouter from './email-webhook.js';

import authRouter       from './routes/auth.js';
import settingsRouter   from './routes/settings.js';
import onboardingRouter from './routes/onboarding.js';
import dashboardRouter  from './routes/dashboard.js';
import leadsRouter      from './routes/leads.js';
import propertiesRouter from './routes/properties.js';
import messagesRouter   from './routes/messages.js';
import notesRouter      from './routes/notes.js';
import accessRequestsRouter from './routes/access-requests.js';
import demoRouter from './routes/demo.js';
import zapierRouter from './routes/zapier.js';

const app = express();

app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());

// Auth routes — mounted at /auth/google so the frontend link
// ${BACKEND_URL}auth/google/signup resolves correctly.
app.use('/auth/google', googleAuthRouter);
// app.use('/auth/microsoft', microsoftAuthRouter);

app.use('/webhook', pubsubEmailWebhook);
app.use('/webhook', smsWebhookRouter);
app.use('/webhook', emailDraftWebhookRouter);
app.use('/webhook', outlookEmailWebhook);
app.use('/webhook', zapierRouter);

app.use('/schaduler', schaduledGmailWatchRouter);
app.use('/schaduler', scheduledUnreplyRouter);

app.use('/api/auth',       authRouter);
app.use('/api/settings',   settingsRouter);
app.use('/api/onboarding', onboardingRouter);
app.use('/api/dashboard',  dashboardRouter);
app.use('/api/leads',      leadsRouter);
app.use('/api/properties', propertiesRouter);
app.use('/api/messages',   messagesRouter);
app.use('/api/notes',      notesRouter);
app.use('/api/access-requests', accessRequestsRouter);
app.use('/api/demo', demoRouter);

app.get('/healthz', (_req, res) => res.status(200).json({ status: 'ok' }));

// The container serves the built frontend from the same origin as the API.
if (process.env.NODE_ENV === 'production') {
  const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
  app.use(express.static(frontendDir));
  app.get(/.*/, (req, res, next) => {
    if (/^\/(api|auth|webhook|schaduler)(\/|$)/.test(req.path)) return next();
    res.sendFile(path.join(frontendDir, 'index.html'));
  });
}

const PORT = process.env.PORT || 8080;

console.log(`Starting server on port ${PORT}`);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
