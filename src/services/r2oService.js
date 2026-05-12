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
  zeroVatId: undefined,
  productGroupId: undefined,
  customerCategoryId: undefined,
  products: {}, // name -> product_id
  _usersFetched: false,
  _vatFetched: false,
  _zeroVatFetched: false,
  _pgFetched: false,
  _ccFetched: false,
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
  const first = rates[0];
  _cache.vatId = first ? (first.vat_id ?? first.id) : undefined;
  _cache._vatFetched = true;
  return _cache.vatId;
}

/** Find the 0% VAT rate ID — used for delivery (service, not food). */
async function resolveZeroVatId() {
  if (_cache._zeroVatFetched) return _cache.zeroVatId;
  try {
    const { data } = await client.get('/vat-rates');
    const rates = Array.isArray(data) ? data : [];
    // Look for a rate whose value is 0
    const zero = rates.find((r) => {
      const v = r.vat_value ?? r.value ?? r.vat_percentage ?? r.rate;
      return Number(v) === 0;
    });
    _cache.zeroVatId = zero ? (zero.id ?? zero.vat_id) : undefined;
  } catch {
    _cache.zeroVatId = undefined;
  }
  _cache._zeroVatFetched = true;
  return _cache.zeroVatId;
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

async function resolveDefaultCustomerCategoryId() {
  if (_cache._ccFetched) return _cache.customerCategoryId;
  try {
    const { data } = await client.get('/customerCategories');
    const cats = Array.isArray(data) ? data : [];
    if (cats.length) {
      _cache.customerCategoryId = cats[0].customerCategory_id || cats[0].id;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[r2o] could not fetch customerCategories:', err.response?.status, err.response?.data || err.message);
  }
  _cache._ccFetched = true;
  return _cache.customerCategoryId;
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

  // Try to find an existing customer first
  try {
    const search = order.customerEmail || order.customerName;
    const { data: searchData } = await client.get('/customers', {
      params: { search, limit: 25 },
    });
    const list = Array.isArray(searchData) ? searchData : [];
    const match = list.find(
      (c) =>
        (order.customerEmail &&
          (c.customer_email === order.customerEmail ||
            c.email === order.customerEmail)) ||
        (order.customerName &&
          (c.customer_name === order.customerName ||
            c.name === order.customerName))
    );
    if (match) {
      return match.customer_id || match.id;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[r2o] customer search failed:', err.response?.status, err.response?.data || err.message);
  }

  // Split name into first / last
  const nameParts = (order.customerName || '').trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
  const fullName = order.customerName || order.customerEmail || 'Kunde';

  // r2o requires customerCategory_id — pick the first one available on the account
  const customerCategoryId = await resolveDefaultCustomerCategoryId();

  // r2o has used several different field-name conventions across API
  // versions. We try the most common payload first, then retry with
  // alternative names if the first attempt 4xx's.
  const payloads = [
    // v1 docs convention (customer_*)
    {
      ...(customerCategoryId !== undefined ? { customerCategory_id: customerCategoryId } : {}),
      customer_typeId: 1, // 1 = private person
      customer_name: fullName,
      customer_firstname: firstName,
      customer_lastname: lastName,
      ...(order.customerEmail ? { customer_email: order.customerEmail } : {}),
      ...(order.customerPhone ? { customer_phone: order.customerPhone } : {}),
      ...(order.street ? { customer_street: order.street } : {}),
      ...(order.postalCode ? { customer_zip: order.postalCode } : {}),
      ...(order.city ? { customer_city: order.city } : {}),
      customer_country: 'AT',
    },
    // older / alt convention (no prefix)
    {
      ...(customerCategoryId !== undefined ? { customerCategory_id: customerCategoryId } : {}),
      name: fullName,
      firstname: firstName,
      lastname: lastName,
      ...(order.customerEmail ? { email: order.customerEmail } : {}),
      ...(order.customerPhone ? { phone: order.customerPhone } : {}),
      ...(order.street ? { street: order.street } : {}),
      ...(order.postalCode ? { zip: order.postalCode } : {}),
      ...(order.city ? { city: order.city } : {}),
      country: 'AT',
    },
  ];

  for (const payload of payloads) {
    try {
      const { data: created } = await client.post('/customers', payload);
      const id = created.customer_id || created.id;
      if (id) {
        // eslint-disable-next-line no-console
        console.log('[r2o] customer created:', id, fullName);
        return id;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        '[r2o] customer creation attempt failed:',
        err.response?.status,
        JSON.stringify(err.response?.data) || err.message
      );
    }
  }
  return undefined;
}

/** Build invoice payload from an internal order. */
async function buildInvoicePayload(order) {
  const [paymentMethodId, userId, vatId, customerId, zeroVatId] = await Promise.all([
    resolvePaymentMethodId(order.paymentMethod),
    resolveUserId(),
    resolveDefaultVatId(),
    resolveCustomerId(order),
    resolveZeroVatId(),
  ]);

  const items = [];
  // Process items sequentially (not concurrently) so the array order is
  // deterministic — Kundeninfo is pushed after this loop and must be last.
  for (const it of order.items) {
    // Always use the live-fetched account default VAT ID.
    // menuItem.vatId is account-specific and becomes stale when the R2O account changes.
    const itemVatId = vatId;
    const productId =
      it.menuItem?.r2oProductId ||
      (await resolveProductId(it.name, Number(it.price), itemVatId));

    // Build item name — append note if present
    const itemName = it.notes
      ? `${it.name} (${it.notes})`
      : it.name;

    items.push({
      product_id: productId,
      item_name: itemName,
      item_price: Number(it.price),
      item_quantity: it.quantity,
      ...(itemVatId !== undefined ? { item_vatId: itemVatId } : {}),
    });

    // Add each extra as its own line item
    if (it.extras && it.extras.length) {
      for (const ex of it.extras) {
        const exProductId = await resolveProductId(
          `Extra: ${ex.name}`, Number(ex.price), itemVatId
        );
        items.push({
          product_id: exProductId,
          item_name: `Extra: ${ex.name}`,
          item_price: Number(ex.price),
          item_quantity: ex.quantity || it.quantity,
          ...(itemVatId !== undefined ? { item_vatId: itemVatId } : {}),
        });
      }
    }
  }

  // Add delivery as a line item with 0% VAT (it's a service, not food)
  const deliveryFee = Number(order.deliveryFee || 0);
  if (deliveryFee > 0) {
    const deliveryProductId = await resolveProductId('Lieferung', deliveryFee, zeroVatId);
    items.push({
      product_id: deliveryProductId,
      item_name: 'Lieferung',
      item_price: deliveryFee,
      item_quantity: 1,
      ...(zeroVatId !== undefined ? { item_vatId: zeroVatId } : {}),
    });
  }

  const discount = Number(order.discount || 0);

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
  if (order.couponCode && discount > 0) notesParts.push(`Gutschein: ${order.couponCode} (-€${discount.toFixed(2)})`);
  if (order.paypalOrderId) notesParts.push(`PayPal-ID: ${order.paypalOrderId}`);

  // PayPal orders are already captured — mark the invoice as paid immediately
  const isPaid = order.paymentMethod === 'PAYPAL';

  // A4 PDF renders `invoice_text` at the bottom — use the inline " | "-joined version.
  const detailsInline = notesParts.join(' | ');

  // ─────────────────────────────────────────────────────────────────────────
  // Receipt rendering strategy:
  //   - We always link a customer record via `customer_id` (good for r2o
  //     reports + admin invoice list).
  //   - We ALSO prepend a synthetic zero-price "Kundeninfo" line item
  //     because r2o's thermal receipt template on this account does not
  //     auto-print the linked customer block. Item names are the only field
  //     that reliably renders on the receipt.
  // ─────────────────────────────────────────────────────────────────────────
  const receiptInfoLines = [];
  if (order.customerName) receiptInfoLines.push(`Kunde: ${order.customerName}`);
  if (order.customerPhone) receiptInfoLines.push(`Tel: ${order.customerPhone}`);
  if (order.customerEmail) receiptInfoLines.push(`Email: ${order.customerEmail}`);
  if (addressParts) receiptInfoLines.push(`Adr: ${addressParts}`);
  if (order.notes) receiptInfoLines.push(`Hinweis: ${order.notes}`);
  if (order.paypalOrderId) receiptInfoLines.push(`PayPal: ${order.paypalOrderId}`);

  if (receiptInfoLines.length > 0) {
    // r2o sorts receipt line items alphabetically by item_name, ignoring
    // submission order. Prefix with "zzz " so this entry always renders last
    // (after any food item starting A–Z, including "ZEPPOLINE").
    const infoProductId = await resolveProductId('zzz_Kundeninfo', 0, vatId);
    items.push({
      product_id: infoProductId,
      item_name: `zzz Kundeninfo\n${receiptInfoLines.join('\n')}`,
      item_price: 0,
      item_quantity: 1,
      item_sort: 9999,
      ...(vatId !== undefined ? { item_vatId: vatId } : {}),
    });
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
    // R2O expects discounts as an array with lowercase type
    ...(discount > 0
      ? {
          discounts: [{
            discount_name: order.couponCode || 'Rabatt',
            discount_type: 'absolute',
            discount_value: discount,
          }],
        }
      : {}),
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
 * Create a coupon in Ready2Order when one is created locally.
 * coupon: { code, value, type, validUntil, usageLimit }
 * Returns the R2O coupon_id on success, or null on failure.
 */
async function createCouponInR2o(coupon) {
  if (!isConfigured()) return null;
  try {
    const payload = {
      coupon_name: coupon.code,
      coupon_identifier: coupon.code,
      coupon_value: String(Number(coupon.value)),
      coupon_type: 'coupon',
      coupon_purpose: coupon.usageLimit === 1 ? 'single' : 'multi',
      coupon_testMode: false,
    };
    if (coupon.validUntil) {
      payload.coupon_validUntil = new Date(coupon.validUntil).toISOString().split('T')[0];
    }
    const { data } = await client.post('/coupons', payload);
    const r2oId = data.coupon_id || data.id || null;
    console.log(`[r2o] Coupon ${coupon.code} created in R2O (id=${r2oId})`);
    return r2oId;
  } catch (err) {
    const msg = err.response?.data?.msg || err.message || '';
    // If the coupon already exists in R2O, find it by scanning the full list
    if (msg.toLowerCase().includes('already') || err.response?.status === 409) {
      try {
        const { data: list } = await client.get('/coupons');
        const arr = Array.isArray(list) ? list : (list.coupons || []);
        const existing = arr.find(c => String(c.coupon_identifier) === String(coupon.code));
        if (existing) {
          const r2oId = existing.coupon_id || existing.id;
          console.log(`[r2o] Reusing existing R2O coupon for ${coupon.code} (id=${r2oId})`);
          return r2oId;
        }
      } catch (lookupErr) {
        console.warn('[r2o] Coupon lookup failed:', lookupErr.message);
      }
    }
    console.warn('[r2o] Coupon create failed:', msg);
    return null;
  }
}

/**
 * Update a coupon in Ready2Order.
 * r2oCouponId: the R2O numeric coupon id
 * coupon: fields to update
 */
async function updateCouponInR2o(r2oCouponId, coupon) {
  if (!isConfigured() || !r2oCouponId) return;
  try {
    const payload = {
      coupon_name: coupon.code,
      coupon_identifier: coupon.code,
      coupon_value: String(Number(coupon.value)),
      coupon_purpose: coupon.usageLimit === 1 ? 'single' : 'multi',
    };
    if (coupon.validUntil) {
      payload.coupon_validUntil = new Date(coupon.validUntil).toISOString().split('T')[0];
    }
    await client.put(`/coupons/${r2oCouponId}`, payload);
    console.log(`[r2o] Coupon ${coupon.code} updated in R2O`);
  } catch (err) {
    console.warn('[r2o] Coupon update failed:', err.response?.data?.msg || err.message);
  }
}

/**
 * Delete a coupon from Ready2Order.
 */
async function deleteCouponInR2o(r2oCouponId) {
  if (!isConfigured() || !r2oCouponId) return;
  try {
    await client.delete(`/coupons/${r2oCouponId}`);
    console.log(`[r2o] Coupon id=${r2oCouponId} deleted from R2O`);
  } catch (err) {
    console.warn('[r2o] Coupon delete failed:', err.response?.data?.msg || err.message);
  }
}

/**
 * List all coupons from Ready2Order.
 */
async function listCouponsFromR2o() {
  if (!isConfigured()) return [];
  try {
    const { data } = await client.get('/coupons');
    return Array.isArray(data) ? data : (data.coupons || []);
  } catch (err) {
    console.warn('[r2o] Coupon list failed:', err.response?.data?.msg || err.message);
    return [];
  }
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
    console.log('[r2o] invoice payload coupon fields:', JSON.stringify({
      discounts: payload.discounts,
      order_coupon: order.coupon,
      order_couponCode: order.couponCode,
      order_discount: order.discount,
    }));
    const { data } = await client.post('/document/invoice', payload);
    console.log('[r2o] invoice created raw response keys:', Object.keys(data));
    console.log('[r2o] invoice created discount fields:', JSON.stringify({
      discounts: data.discounts,
      invoice_total: data.invoice_total,
      invoice_totalNet: data.invoice_totalNet,
    }));
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

module.exports = { listProducts, getPaymentMethods, createInvoiceForOrder, isConfigured, createCouponInR2o, updateCouponInR2o, deleteCouponInR2o, listCouponsFromR2o };
