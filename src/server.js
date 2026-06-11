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


// Set up rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
});

app.use(limiter);



// Trust the first reverse-proxy hop (nginx / Caddy / Railway etc.) so that
// express-rate-limit can correctly read the real client IP from X-Forwarded-For.
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const ALLOWED_ORIGINS = new Set([
  'https://tarantella.at',
  'https://www.tarantella.at',
  // dev
  'http://localhost:5173',
  'http://localhost:3000',
]);

app.use(cors({
  origin: (origin, callback) => {
    // allow server-to-server / curl (no Origin header)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.has(origin)) return callback(null, true);
    callback(Object.assign(new Error(`CORS blocked: ${origin}`), { status: 403 }));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
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
    await require('./services/r2oConfigService').ensureLoaded();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Site settings defaults failed:', err.message);
  }
  // eslint-disable-next-line no-console
  console.log(`API ready on http://localhost:${config.port}`);
});

module.exports = { app, server };
