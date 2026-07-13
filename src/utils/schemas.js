const Joi = require('joi');

const login = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(6).required(),
});

const register = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(6).max(120).required(),
  phone: Joi.string().min(5).max(40).required(),         // mobile required now
  phoneCountry: Joi.string().length(2).uppercase().allow('', null),
});

const profileUpdate = Joi.object({
  name: Joi.string().min(2).max(120),
  email: Joi.string().email({ tlds: { allow: false } }),
  phone: Joi.string().min(5).max(40).allow('', null),
  phoneCountry: Joi.string().length(2).uppercase().allow('', null),
});

const passwordChange = Joi.object({
  currentPassword: Joi.string().min(6).required(),
  newPassword: Joi.string().min(6).max(120).required(),
});

const forgotPassword = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
});

const resetPassword = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  code: Joi.string().length(6).required(),
  newPassword: Joi.string().min(6).max(120).required(),
});

const notifPrefs = Joi.object({
  pushEnabled: Joi.boolean(),
  orderNotificationsEnabled: Joi.boolean(),
  emailNotificationsEnabled: Joi.boolean(),
});

const subadminCreate = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(6).max(120).required(),
  phone: Joi.string().min(5).max(40).allow('', null),
});

const userBlock = Joi.object({
  blocked: Joi.boolean().required(),
});

const category = Joi.object({
  name: Joi.string().min(2).max(80).required(),
  slug: Joi.string().lowercase().pattern(/^[a-z0-9-]+$/).required(),
  description: Joi.string().allow('', null),
  imageUrl: Joi.string().allow('', null),
  sortOrder: Joi.number().integer().default(0),
  isActive: Joi.boolean().default(true),
  showOnHome: Joi.boolean().default(false),
  homeImageUrl: Joi.string().allow('', null),
});

const tag = Joi.object({
  name: Joi.string().min(1).max(60).required(),
  slug: Joi.string().lowercase().pattern(/^[a-z0-9-]+$/).required(),
  color: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).allow('', null),
  icon: Joi.string().max(40).allow('', null),
  imageUrl: Joi.string().allow('', null),
});

const extra = Joi.object({
  name: Joi.string().min(1).max(80).required(),
  price: Joi.number().min(0).precision(2).default(0),
  isActive: Joi.boolean().default(true),
});

const menuItem = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  description: Joi.string().allow('', null),
  price: Joi.number().positive().precision(2).required(),
  imageUrl: Joi.string().allow('', null),
  isAvailable: Joi.boolean().default(true),
  isVegetarian: Joi.boolean().default(false),
  isSpicy: Joi.boolean().default(false),
  isOnline: Joi.boolean().default(true),
  showInSlider: Joi.boolean().default(false),
  sliderSortOrder: Joi.number().integer().default(0),
  sortOrder: Joi.number().integer().default(0),
  r2oProductId: Joi.string().allow('', null),
  vatId: Joi.string().allow('', null),
  categoryId: Joi.string().required(),
  tagIds: Joi.array().items(Joi.string()).default([]),
  extraIds: Joi.array().items(Joi.string()).default([]),
});

const orderItemSchema = Joi.object({
  menuItemId: Joi.string().required(),
  quantity: Joi.number().integer().min(1).max(50).required(),
  notes: Joi.string().allow('', null).max(200),
  extraIds: Joi.array().items(Joi.string()).default([]),
});

const orderCreate = Joi.object({
  customerName: Joi.string().min(2).max(120).required(),
  customerPhone: Joi.string().min(5).max(40).required(),
  customerEmail: Joi.string().email().allow('', null),
  street: Joi.string().min(3).max(200).required(),
  city: Joi.string().min(2).max(120).required(),
  postalCode: Joi.string().min(2).max(20).required(),
  deliveryZoneId: Joi.string().uuid().allow(null),
  deliveryLat: Joi.number().min(-90).max(90).allow(null),
  deliveryLon: Joi.number().min(-180).max(180).allow(null),
  notes: Joi.string().allow('', null).max(500),
  paymentMethod: Joi.string().valid('CASH', 'CARD_ON_DELIVERY', 'PAYPAL').default('CASH'),
  paypalOrderId: Joi.string().allow('', null),
  paypalCaptureId: Joi.string().allow('', null),
  couponCode: Joi.string().max(50).allow('', null),
  items: Joi.array().items(orderItemSchema).min(1).required(),
});

const orderEdit = Joi.object({
  notes: Joi.string().allow('', null).max(500),
  customerName: Joi.string().min(2).max(120),
  customerPhone: Joi.string().min(5).max(40),
  street: Joi.string().min(3).max(200),
  city: Joi.string().min(2).max(120),
  postalCode: Joi.string().min(2).max(20),
  deliveryZoneId: Joi.string().uuid().allow(null),
  items: Joi.array().items(orderItemSchema).min(1),
});

const orderStatus = Joi.object({
  status: Joi.string()
    .valid('ACCEPTED', 'DECLINED')
    .required(),
  acceptanceNote: Joi.string().allow('', null).when('status', { is: 'ACCEPTED', then: Joi.required() }),
  reason: Joi.string().allow('', null).when('status', { is: 'DECLINED', then: Joi.required() }),
});

const orderAccept = Joi.object({
  acceptanceNote: Joi.string().allow('', null).max(300),
});

const orderDecline = Joi.object({
  reason: Joi.string().allow('', null).max(300),
});

const paypalCreate = Joi.object({
  amount: Joi.number().positive().precision(2).required(),
});

const paypalConfig = Joi.object({
  clientId: Joi.string().min(8).max(200).required(),
  clientSecret: Joi.string().min(8).max(200).allow('').optional(),
  mode: Joi.string().valid('sandbox', 'live').default('sandbox'),
  currency: Joi.string().length(3).uppercase().default('EUR'),
});

const deliveryZone = Joi.object({
  postalCode: Joi.string().min(2).max(20).required(),
  label: Joi.string().max(80).allow('', null).default(''),
  deliveryFee: Joi.number().min(0).precision(2).required(),
  minimumOrder: Joi.number().min(0).precision(2).default(0),
  isActive: Joi.boolean().default(true),
});

const coupon = Joi.object({
  code: Joi.string().min(2).max(30).required(),
  type: Joi.string().valid('FIXED', 'PERCENT').default('FIXED'),
  value: Joi.number().min(0).precision(2).required(),
  minOrder: Joi.number().min(0).precision(2).default(0),
  validFrom: Joi.date().iso().allow(null),
  validUntil: Joi.date().iso().allow(null),
  isActive: Joi.boolean().default(true),
  usageLimit: Joi.number().integer().min(1).allow(null),
});

const legalPage = Joi.object({
  slug: Joi.string().lowercase().pattern(/^[a-z0-9-]+$/).required(),
  title: Joi.string().min(2).max(120).required(),
  content: Joi.string().allow('', null),
  sortOrder: Joi.number().integer().default(0),
  isActive: Joi.boolean().default(true),
});

const ordersAccepted = Joi.object({
  orders_accepted: Joi.boolean().required(),
});

const timeString = Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/);

const deliverySchedule = Joi.object({
  enabled: Joi.boolean().required(),
  schedule: Joi.array().items(Joi.object({
    day: Joi.string().valid('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun').required(),
    enabled: Joi.boolean().required(),
    windows: Joi.array().items(Joi.object({
      from: timeString.required(),
      to: timeString.required(),
    })).max(6).default([]),
  })).length(7).required(),
});

const contactSubmit = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  phone: Joi.string().max(40).allow('', null),
  subject: Joi.string().max(120).allow('', null),
  message: Joi.string().min(5).max(5000).required(),
  recaptchaToken: Joi.string().allow('', null),
});

const contactRead = Joi.object({
  isRead: Joi.boolean(),
});

const contactReply = Joi.object({
  subject: Joi.string().min(2).max(200).required(),
  message: Joi.string().min(5).max(5000).required(),
});

const verifyEmail = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  code: Joi.string().length(6).required(),
});

const resendVerification = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
});

module.exports = {
  login, register,
  profileUpdate, passwordChange, notifPrefs,
  subadminCreate, userBlock,
  category, tag, extra, menuItem,
  orderCreate, orderEdit, orderStatus, orderAccept, orderDecline,
  paypalCreate,
  paypalConfig,
  forgotPassword, resetPassword,
  deliveryZone, coupon, legalPage, ordersAccepted, deliverySchedule,
  contactSubmit, contactRead, contactReply, verifyEmail, resendVerification,
};
