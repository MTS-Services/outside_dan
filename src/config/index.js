require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || 'http://localhost:4000',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  r2o: {
    baseUrl: process.env.R2O_BASE_URL || 'https://api.ready2order.com/v1',
    apiKey: process.env.R2O_API_KEY || '',
  },
  printer: {
    enabled: String(process.env.PRINTER_ENABLED).toLowerCase() === 'true',
    type: process.env.PRINTER_TYPE || 'epson',
    interface: process.env.PRINTER_INTERFACE || 'tcp://192.168.1.50:9100',
  },
  restaurant: {
    name: 'Tarantella Pizza Pasta Napoli',
    address:  'Sonnenweg 11, 8793 Trofaiach',
    phone: '+43 676 632 86 77',
  },
  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  },
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    email: process.env.VAPID_EMAIL || 'mailto:admin@example.com',
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'no-reply@example.com',
  },
  recaptcha: {
    siteKey: process.env.RECAPTCHA_SITE_KEY || '',
    secretKey: process.env.RECAPTCHA_SECRET_KEY || '',
    version: (process.env.RECAPTCHA_VERSION || 'v2').toLowerCase(),
  },
};
