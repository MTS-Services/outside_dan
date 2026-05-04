/**
 * ready2order POS API client.
 *
 * Docs: https://api.ready2order.com/v1/docs
 * Auth: header `Authorization: Bearer <ACCOUNT_TOKEN>`
 *
 * Only the endpoints actually needed for the delivery flow are wrapped.
 * If your account uses different product IDs / payment IDs, set them in
 * the env or extend the mapping in `buildInvoicePayload`.
 */
const axios = require('axios');
const config = require('../config');

const client = axios.create({
  baseURL: config.r2o.baseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: config.r2o.apiKey ? `Bearer ${config.r2o.apiKey}` : undefined,
  },
});

function isConfigured() {
  const key = config.r2o.apiKey;
  return Boolean(key) && !key.startsWith('your-') && key.length > 10;
}

/** Fetch all products (used to map menu items to POS product IDs). */
async function listProducts() {
  if (!isConfigured()) return [];
  const { data } = await client.get('/products');
  return data;
}

/** Unified cache for r2o lookups. */
const _cache = {
  paymentMethods: null,
  userId: undefined,
  vatId: undefined,
  productGroupId: undefined,
  products: {}, // name -> product_id
  _usersFetched: false,
  _vatFetched: false,
  _pgFetched: false,
};

async function getPaymentMethods() {
  if (_cache.paymentMethods) return _cache.paymentMethods;
  const { data } = await client.get('/paymentMethods');
  _cache.paymentMethods = Array.isArray(data) ? data : [];
  return _cache.paymentMethods;
}

async function resolvePaymentMethodId(orderPaymentMethod) {
  try {
    const methods = await getPaymentMethods();
    if (!methods.length) return undefined;

    if (orderPaymentMethod === 'PAYPAL') {
      // Try to find a PayPal payment method by name first
      const paypal = methods.find((m) =>
        m.paymentMethod_name && m.paymentMethod_name.toLowerCase().includes('paypal')
      );
      if (paypal) return paypal.payment_id;
      // Fallback: use card type (online payment) if available
      const card = methods.find((m) => m.paymentType_id === 2);
      return (card || methods[0]).payment_id;
    }

    if (orderPaymentMethod === 'CARD_ON_DELIVERY') {
      const card = methods.find((m) => m.paymentType_id === 2);
      return (card || methods[0]).payment_id;
    }

    // CASH or anything else
    const cash = methods.find((m) => m.paymentType_id === 1);
    return (cash || methods[0]).payment_id;
  } catch {
    return undefined;
  }
}

async function resolveUserId() {
  if (_cache._usersFetched) return _cache.userId;
  const { data } = await client.get('/users');
  const users = Array.isArray(data) ? data : [];
  _cache.userId = users.length ? users[0].user_id : undefined;
  _cache._usersFetched = true;
  return _cache.userId;
}

async function resolveDefaultVatId() {
  if (_cache._vatFetched) return _cache.vatId;
  const { data } = await client.get('/vat-rates');
  const rates = Array.isArray(data) ? data : [];
  _cache.vatId = rates.length ? rates[0].id : undefined;
  _cache._vatFetched = true;
  return _cache.vatId;
}

async function resolveDefaultProductGroupId() {
  if (_cache._pgFetched) return _cache.productGroupId;
  const { data } = await client.get('/productgroups');
  const groups = Array.isArray(data) ? data : [];
  // productgroup_type_id 2 = Favourites — cannot assign products to it
  const regular = groups.find((g) => g.productgroup_type_id === 1);
  _cache.productGroupId = regular ? regular.productgroup_id : undefined;
  _cache._pgFetched = true;
  return _cache.productGroupId;
}

/**
 * Look up an existing r2o product by name, or create one with custom price enabled.
 * Caches result so each unique item name is only created once per process lifetime.
 */
async function resolveProductId(name, price, vatId) {
  if (_cache.products[name] !== undefined) return _cache.products[name];

  // Search by name
  const { data: searchData } = await client.get('/products', { params: { name, limit: 25 } });
  const existing = (Array.isArray(searchData) ? searchData : []).find(
    (p) => p.product_name === name
  );
  if (existing) {
    _cache.products[name] = existing.product_id;
    return existing.product_id;
  }

  // Create a new product with custom price / quantity so invoice items can override them
  const pgId = await resolveDefaultProductGroupId();
  const createPayload = {
    product_name: name,
    product_price: price,
    product_priceIncludesVat: true,
    product_customPrice: true,
    product_customQuantity: true,
    ...(vatId !== undefined ? { product_vat_id: vatId } : {}),
    ...(pgId !== undefined ? { productgroup_id: pgId } : {}),
  };
  const { data: created } = await client.post('/products', createPayload);
  _cache.products[name] = created.product_id;
  return created.product_id;
}

/**
 * Create (or fetch) a r2o customer record for an order.
 * ready2order renders the linked customer's name/address at the top of both
 * the A4 invoice and the thermal receipt — much cleaner than embedding
 * details into item names.
 */
async function resolveCustomerId(order) {
  // Need at least a name or an email to create a usable customer
  if (!order.customerName && !order.customerEmail) return undefined;

  try {
    // Search by email first if we have one (more reliable match), then by name
    const search = order.customerEmail || order.customerName;
    const { data: searchData } = await client.get('/customers', {
      params: { search, limit: 25 },
    });
    const list = Array.isArray(searchData) ? searchData : [];
    const match = list.find(
      (c) =>
        (order.customerEmail && c.customer_email === order.customerEmail) ||
        (order.customerName && c.customer_name === order.customerName)
    );
    if (match) return match.customer_id;
  } catch {
    // search failures should not block invoice creation — fall through to create
  }

  // Split name into first / last
  const nameParts = (order.customerName || '').trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

  const createPayload = {
    customer_name: order.customerName || order.customerEmail || 'Kunde',
    customer_firstname: firstName,
    customer_lastname: lastName,
    ...(order.customerEmail ? { customer_email: order.customerEmail } : {}),
    ...(order.customerPhone ? { customer_phone: order.customerPhone } : {}),
    ...(order.street ? { customer_street: order.street } : {}),
    ...(order.postalCode ? { customer_zip: order.postalCode } : {}),
    ...(order.city ? { customer_city: order.city } : {}),
    customer_country: 'AT',
  };

  try {
    const { data: created } = await client.post('/customers', createPayload);
    return created.customer_id;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[r2o] customer creation failed:', err.response?.data || err.message);
    return undefined;
  }
}

/** Build invoice payload from an internal order. */
async function buildInvoicePayload(order) {
  const [paymentMethodId, userId, vatId, customerId] = await Promise.all([
    resolvePaymentMethodId(order.paymentMethod),
    resolveUserId(),
    resolveDefaultVatId(),
    resolveCustomerId(order),
  ]);

  const items = [];
  await Promise.all(
    order.items.map(async (it) => {
      const productId =
        it.menuItem?.r2oProductId ||
        (await resolveProductId(it.name, Number(it.price), vatId));

      // Build item name — append note if present
      const itemName = it.notes
        ? `${it.name} (${it.notes})`
        : it.name;

      items.push({
        product_id: productId,
        item_name: itemName,
        item_price: Number(it.price),
        item_quantity: it.quantity,
        ...(vatId !== undefined ? { item_vatId: vatId } : {}),
      });

      // Add each extra as its own line item
      if (it.extras && it.extras.length) {
        for (const ex of it.extras) {
          const exProductId = await resolveProductId(
            `Extra: ${ex.name}`, Number(ex.price), vatId
          );
          items.push({
            product_id: exProductId,
            item_name: `Extra: ${ex.name}`,
            item_price: Number(ex.price),
            item_quantity: ex.quantity || it.quantity,
            ...(vatId !== undefined ? { item_vatId: vatId } : {}),
          });
        }
      }
    })
  );

  // Split customerName into first / last name
  const nameParts = (order.customerName || '').trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const baseLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

  // Build invoice text: full customer details as key-value pairs + notes + payment
  const notesParts = [];
  notesParts.push(`Name: ${order.customerName || ''}`);
  if (order.customerPhone) notesParts.push(`Tel: ${order.customerPhone}`);
  if (order.customerEmail) notesParts.push(`Email: ${order.customerEmail}`);
  const addressParts = [order.street, order.postalCode, order.city].filter(Boolean).join(', ');
  if (addressParts) notesParts.push(`Adresse: ${addressParts}`);
  if (order.notes) notesParts.push(`Hinweis: ${order.notes}`);
  notesParts.push(`Zahlung: ${order.paymentMethod}`);
  if (order.paypalOrderId) notesParts.push(`PayPal-ID: ${order.paypalOrderId}`);

  // PayPal orders are already captured — mark the invoice as paid immediately
  const isPaid = order.paymentMethod === 'PAYPAL';

  // A4 PDF renders `invoice_text` at the bottom — use the inline " | "-joined version.
  const detailsInline = notesParts.join(' | ');

  // ─────────────────────────────────────────────────────────────────────────
  // Receipt rendering strategy:
  //   1. Primary: link a customer record via `customer_id` — r2o then prints
  //      the customer's name/address at the top of the receipt automatically.
  //   2. Fallback: if customer creation failed, prepend a synthetic zero-price
  //      "Kundeninfo" line item so the details still appear on the receipt.
  // ─────────────────────────────────────────────────────────────────────────
  if (!customerId) {
    const receiptInfoLines = [];
    if (order.customerName) receiptInfoLines.push(`Kunde: ${order.customerName}`);
    if (order.customerPhone) receiptInfoLines.push(`Tel: ${order.customerPhone}`);
    if (order.customerEmail) receiptInfoLines.push(`Email: ${order.customerEmail}`);
    if (addressParts) receiptInfoLines.push(`Adr: ${addressParts}`);
    if (order.notes) receiptInfoLines.push(`Hinweis: ${order.notes}`);
    if (order.paypalOrderId) receiptInfoLines.push(`PayPal: ${order.paypalOrderId}`);

    if (receiptInfoLines.length > 0) {
      const infoProductId = await resolveProductId('Kundeninfo', 0, vatId);
      items.unshift({
        product_id: infoProductId,
        item_name: `Kundeninfo\n${receiptInfoLines.join('\n')}`,
        item_price: 0,
        item_quantity: 1,
        ...(vatId !== undefined ? { item_vatId: vatId } : {}),
      });
    }
  }

  const lastNameForReceipt = baseLastName;

  return {
    items,
    ...(paymentMethodId !== undefined ? { paymentMethod_id: paymentMethodId } : {}),
    ...(userId !== undefined ? { user_id: userId } : {}),
    ...(customerId !== undefined ? { customer_id: customerId } : {}),
    // Shown on A4 PDF invoice
    invoice_text: detailsInline,
    invoice_isPaid: isPaid,
    // Customer / address fields — nested object (r2o API) + flat top-level as fallback
    invoiceAddress: {
      invoiceAddress_firstname: firstName,
      invoiceAddress_lastname: lastNameForReceipt,
      invoiceAddress_street: order.street || '',
      invoiceAddress_zip: order.postalCode || '',
      invoiceAddress_city: order.city || '',
      invoiceAddress_country: 'AT',
      ...(order.customerEmail ? { invoiceAddress_email: order.customerEmail } : {}),
      ...(order.customerPhone ? { invoiceAddress_phone: order.customerPhone } : {}),
    },
    // Also spread flat at top level (some r2o versions require this)
    invoiceAddress_firstname: firstName,
    invoiceAddress_lastname: lastNameForReceipt,
    invoiceAddress_street: order.street || '',
    invoiceAddress_zip: order.postalCode || '',
    invoiceAddress_city: order.city || '',
    invoiceAddress_country: 'AT',
    ...(order.customerEmail ? { invoiceAddress_email: order.customerEmail } : {}),
    ...(order.customerPhone ? { invoiceAddress_phone: order.customerPhone } : {}),
  };
}

/**
 * Create an invoice (receipt) in ready2order.
 * Returns `{ invoiceId, receiptNo }` or throws on failure.
 */
async function createInvoiceForOrder(order) {
  if (!isConfigured()) {
    return { invoiceId: null, receiptNo: null, skipped: true };
  }
  let payload;
  try {
    payload = await buildInvoicePayload(order);
    const { data } = await client.post('/document/invoice', payload);
    return {
      invoiceId: data.invoice_id || data.id || null,
      receiptNo: data.invoice_number || data.receipt_number || null,
      raw: data,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[r2o] invoice creation failed:', {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
      payload,
    });
    throw err;
  }
}

module.exports = { listProducts, getPaymentMethods, createInvoiceForOrder, isConfigured };
