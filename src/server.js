require('express-async-errors');
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/error');
const { initSocket } = require('./sockets');
const siteSettingService = require('./services/siteSettingService');

const app = express();

// Trust the first reverse-proxy hop (nginx / Caddy / Railway etc.) so that
// express-rate-limit can correctly read the real client IP from X-Forwarded-For.
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));

// Serve speisekarte.pdf inline (open in browser, not download)
app.get('/uploads/speisekarte.pdf', (req, res) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="speisekarte.pdf"');
  res.sendFile(path.join(__dirname, '..', 'uploads', 'speisekarte.pdf'));
});

// Static uploads (for menu item images)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Basic protection
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 50 }));
app.use('/api/orders', rateLimit({ windowMs: 60 * 1000, max: 30 }));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

const server = http.createServer(app);
initSocket(server);

server.listen(config.port, async () => {
  try {
    await siteSettingService.ensureDefaults();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Site settings defaults failed:', err.message);
  }
  // eslint-disable-next-line no-console
  console.log(`API ready on http://localhost:${config.port}`);
});

module.exports = { app, server };
