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
const prisma = require('../config/prisma');
const r2oConfig = require('./r2oConfigService');
const siteSettings = require('./siteSettingService');

const client = axios.create({
  baseURL: config.r2o.baseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

client.interceptors.request.use((reqConfig) => {
  const key = r2oConfig.getApiKeySync();
  if (key) reqConfig.headers.Authorization = `Bearer ${key}`;
  return reqConfig;
});

function isConfigured() {
  const key = r2oConfig.getApiKeySync();
  return r2oConfig.isKeyValid(key);
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

/**
 * Build the line items (food, extras, delivery fee, discount distribution,
 * synthetic customer-info line) shared by invoice and table-order payloads.
 */
async function buildOrderLineItems(order, { vatId, zeroVatId }) {
  const items = [];
  // Process items sequentially (not concurrently) so the array order is
  // deterministic — Kundeninfo is pushed after this loop and must be last.
  for (const it of order.items) {
      // Use the per-item VAT ID from the menu item if set, else fall back to the account default.
      const itemVatId = it.menuItem?.vatId || vatId;
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

  // Distribute the discount strictly across all food items so receipt prices match API values.
  if (discount > 0) {
    const foodItems = items.filter((it) => it.item_name !== 'Lieferung' && !it.item_name.startsWith('zzz'));
    const totalFoodPrice = foodItems.reduce((sum, it) => sum + (it.item_price * it.item_quantity), 0);

    if (totalFoodPrice > 0) {
      let remainingDiscount = discount;
      const appliedPercentStr = Math.round((discount / totalFoodPrice) * 100);
      const couponLabel = order.couponCode ? ` ${order.couponCode}` : '';

      foodItems.forEach((it, idx) => {
        const lineTotal = it.item_price * it.item_quantity;
        let lineDiscount;
        if (idx === foodItems.length - 1) {
          lineDiscount = Math.round(remainingDiscount * 100) / 100; // sink remaining
        } else {
          lineDiscount = Math.round((lineTotal / totalFoodPrice) * discount * 100) / 100;
        }

        remainingDiscount -= lineDiscount;
        const unitDiscount = lineDiscount / it.item_quantity;

        // Apply discount directly to item price and name mapping
        it.item_price = Math.max(0, Math.round((it.item_price - unitDiscount) * 100) / 100);
        it.item_name = `${it.item_name} (discount applied${couponLabel} ${appliedPercentStr}% -€${lineDiscount.toFixed(2)})`;
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Receipt rendering strategy:
  //   - We always link a customer record via `customer_id` (good for r2o
  //     reports + admin invoice list).
  //   - We ALSO prepend a synthetic zero-price "Kundeninfo" line item
  //     because r2o's thermal receipt template on this account does not
  //     auto-print the linked customer block. Item names are the only field
  //     that reliably renders on the receipt.
  // ─────────────────────────────────────────────────────────────────────────
  const infoAddress = [order.street, order.postalCode, order.city].filter(Boolean).join(', ');
  const receiptInfoLines = [];
  if (order.customerName) receiptInfoLines.push(`Kunde: ${order.customerName}`);
  if (order.customerPhone) receiptInfoLines.push(`Tel: ${order.customerPhone}`);
  if (order.customerEmail) receiptInfoLines.push(`Email: ${order.customerEmail}`);
  if (infoAddress) receiptInfoLines.push(`Adr: ${infoAddress}`);
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

  return items;
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

  const items = await buildOrderLineItems(order, { vatId, zeroVatId });
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

// ─────────────────────────────────────────────────────────────────────────────
// R2O Discount functions (pre-configured discounts referenced by discount_id
// in the invoice payload — the only way R2O applies discounts to receipts).
// ─────────────────────────────────────────────────────────────────────────────

/** Cached discount group id — fetched once from R2O the first time it's needed. */
let _cachedDiscountGroupId = null;

/** Clear account-specific caches after connecting to a different R2O account. */
function clearR2oAccountCaches() {
  _cachedDiscountGroupId = null;
  _cache.paymentMethods = null;
  _cache.userId = undefined;
  _cache.vatId = undefined;
  _cache.zeroVatId = undefined;
  _cache.productGroupId = undefined;
  _cache.customerCategoryId = undefined;
  _cache.products = {};
  _cache._usersFetched = false;
  _cache._vatFetched = false;
  _cache._zeroVatFetched = false;
  _cache._pgFetched = false;
  _cache._ccFetched = false;
}

function findDiscountByCode(discounts, code) {
  return discounts.find((d) => d.discount_name === code) || null;
}

/**
 * Fetch the first active discount group from R2O and cache its id.
 * If none exist, creates one named "Gutscheine".
 */
async function resolveDiscountGroupId() {
  if (_cachedDiscountGroupId) return _cachedDiscountGroupId;
  try {
    const { data } = await client.get('/discountGroups');
    const groups = Array.isArray(data) ? data : [];
    const active = groups.find((g) => g.discountGroup_active !== false) || groups[0];
    if (active) {
      _cachedDiscountGroupId = active.discountGroup_id;
      return _cachedDiscountGroupId;
    }
    // No groups exist — create one
    const { data: created } = await client.post('/discountGroups', {
      discountGroup_name: 'Gutscheine',
      discountGroup_active: true,
    });
    _cachedDiscountGroupId = created.discountGroup_id;
    return _cachedDiscountGroupId;
  } catch (err) {
    console.warn('[r2o] Could not resolve discountGroup_id:', err.response?.data?.msg || err.message);
    return null;
  }
}

/**
 * Find or create a discount in Ready2Order.
 * Searches by discount_name first, then creates only if missing.
 * coupon: { code, type ('FIXED'|'PERCENT'), value }
 * existingDiscounts: optional pre-fetched list to avoid extra API calls
 * Returns the R2O discount_id on success, or null on failure.
 */
async function createDiscountInR2o(coupon, existingDiscounts) {
  if (!isConfigured()) return null;

  let discounts = existingDiscounts;
  if (!discounts) {
    discounts = await listDiscountsFromR2o();
  }

  const existing = findDiscountByCode(discounts, coupon.code);
  if (existing) {
    const r2oId = existing.discount_id || existing.id;
    console.log(`[r2o] Reusing existing R2O discount for ${coupon.code} (id=${r2oId})`);
    await updateDiscountInR2o(r2oId, coupon).catch(() => {});
    return r2oId;
  }

  try {
    const discountGroupId = await resolveDiscountGroupId();
    if (!discountGroupId) {
      console.warn('[r2o] Discount create skipped: no discountGroup_id available');
      return null;
    }
    const payload = {
      discount_name: coupon.code,
      discountGroup_id: discountGroupId,
      discount_unit: coupon.type === 'PERCENT' ? 'percent' : 'currency',
      discount_value: Number(coupon.value),
      discount_active: true,
    };
    const { data } = await client.post('/discounts', payload);
    const r2oId = data.discount_id || data.id || null;
    console.log(`[r2o] Discount ${coupon.code} created in R2O (id=${r2oId})`);
    return r2oId;
  } catch (err) {
    const msg = err.response?.data?.msg || err.message || '';
    if (msg.toLowerCase().includes('already') || err.response?.status === 409) {
      const refreshed = await listDiscountsFromR2o();
      const fallback = findDiscountByCode(refreshed, coupon.code);
      if (fallback) {
        const r2oId = fallback.discount_id || fallback.id;
        console.log(`[r2o] Reusing existing R2O discount for ${coupon.code} (id=${r2oId})`);
        return r2oId;
      }
    }
    console.warn('[r2o] Discount create failed:', msg);
    return null;
  }
}

/**
 * Reset stored R2O ids on all local coupons (e.g. after switching accounts).
 */
async function resetCouponR2oIds() {
  await prisma.coupon.updateMany({
    data: { r2oDiscountId: null, r2oCouponId: null },
  });
}

/**
 * After connecting a new ready2order account, clear old ids and re-link
 * every local coupon: search in R2O by code, create if missing.
 */
async function resyncAllCouponsToR2o() {
  if (!isConfigured()) return { synced: 0, failed: 0 };

  clearR2oAccountCaches();
  await resetCouponR2oIds();

  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'asc' } });
  if (!coupons.length) return { synced: 0, failed: 0 };

  const r2oDiscounts = await listDiscountsFromR2o();
  let synced = 0;
  let failed = 0;

  for (const coupon of coupons) {
    const r2oDiscountId = await createDiscountInR2o(coupon, r2oDiscounts);
    if (r2oDiscountId) {
      await prisma.coupon.update({
        where: { id: coupon.id },
        data: { r2oDiscountId: String(r2oDiscountId) },
      });
      if (!findDiscountByCode(r2oDiscounts, coupon.code)) {
        r2oDiscounts.push({ discount_id: r2oDiscountId, discount_name: coupon.code });
      }
      synced += 1;
    } else {
      failed += 1;
    }
  }

  console.log(`[r2o] Coupon resync complete: ${synced} synced, ${failed} failed`);
  return { synced, failed };
}

/**
 * Update a discount in Ready2Order.
 * r2oDiscountId: the R2O numeric discount id
 * coupon: fields to update { code, type, value }
 */
async function updateDiscountInR2o(r2oDiscountId, coupon) {
  if (!isConfigured() || !r2oDiscountId) return;
  try {
    const payload = {
      discount_name: coupon.code,
      discount_unit: coupon.type === 'PERCENT' ? 'percent' : 'currency',
      discount_value: Number(coupon.value),
    };
    await client.put(`/discounts/${r2oDiscountId}`, payload);
    console.log(`[r2o] Discount ${coupon.code} updated in R2O`);
  } catch (err) {
    console.warn('[r2o] Discount update failed:', err.response?.data?.msg || err.message);
  }
}

/**
 * Delete a discount from Ready2Order.
 */
async function deleteDiscountInR2o(r2oDiscountId) {
  if (!isConfigured() || !r2oDiscountId) return;
  try {
    await client.delete(`/discounts/${r2oDiscountId}`);
    console.log(`[r2o] Discount id=${r2oDiscountId} deleted from R2O`);
  } catch (err) {
    console.warn('[r2o] Discount delete failed:', err.response?.data?.msg || err.message);
  }
}

/**
 * List all discounts from Ready2Order.
 */
async function listDiscountsFromR2o() {
  if (!isConfigured()) return [];
  try {
    const { data } = await client.get('/discounts');
    return Array.isArray(data) ? data : (data.discounts || []);
  } catch (err) {
    console.warn('[r2o] Discount list failed:', err.response?.data?.msg || err.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Table booking mode: instead of creating a finalized invoice (which cannot be
// deleted in ready2order), the order is booked onto a POS table. Staff see it
// on the table in the register, can edit or remove items, and check it out
// there — exactly like an in-house order.
// Online orders are auto-assigned to the Delivery area tables (Delivery 1–9).
// ─────────────────────────────────────────────────────────────────────────────

function normalizeR2oList(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  for (const key of ['tables', 'tableAreas', 'items', 'data', 'results', 'records']) {
    if (Array.isArray(data[key])) return data[key];
  }
  // Some accounts return a single object instead of an array.
  if (data.table_id != null || data.tableArea_id != null) return [data];
  return [];
}

function r2oId(value) {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
}

function isDeliveryLabel(name = '') {
  const n = String(name).trim().toLowerCase();
  return n.startsWith('deliv') || n === 'delivery' || n.includes('liefer');
}

function isDeliveryTableName(name = '') {
  const n = String(name).trim();
  return isDeliveryLabel(n) || /^delivery\s*\d+/i.test(n);
}

function tableAreaLabel(area) {
  if (!area) return '';
  return String(area.tableArea_name || area.name || area.tableArea_shortName || area.shortName || '');
}

function deliveryTableSortKey(table) {
  const name = String(table.table_name || table.name || '');
  const num = name.match(/(\d+)\s*$/);
  return num ? parseInt(num[1], 10) : Number(table.table_order || 0);
}

/** Fetch table areas from ready2order. */
async function listTableAreas() {
  if (!isConfigured()) return [];
  const { data } = await client.get('/tableAreas', { params: { limit: 100 } });
  return normalizeR2oList(data);
}

/** Fetch all tables from ready2order. */
async function listTables() {
  if (!isConfigured()) return [];
  const { data } = await client.get('/tables', { params: { limit: 250 } });
  return normalizeR2oList(data);
}

/**
 * Return only Delivery-area tables (e.g. Delivery 1 … Delivery 9).
 * Matches by tableArea name/shortName, tableArea_id, or table name.
 * Also returns `meta` for admin diagnostics when nothing matches.
 */
async function listDeliveryTablesWithMeta() {
  const [areas, tables] = await Promise.all([listTableAreas(), listTables()]);

  const areaById = new Map();
  const deliveryAreaIds = new Set();
  for (const area of areas) {
    const id = r2oId(area.tableArea_id ?? area.id);
    if (!id) continue;
    areaById.set(id, area);
    const label = tableAreaLabel(area);
    const short = String(area.tableArea_shortName || area.shortName || '');
    if (isDeliveryLabel(label) || isDeliveryLabel(short)) {
      deliveryAreaIds.add(id);
    }
  }

  const deliveryTables = tables.filter((table) => {
    const areaId = r2oId(table.tableArea_id ?? table.table_area_id);
    if (areaId && deliveryAreaIds.has(areaId)) return true;

    const area = areaId ? areaById.get(areaId) : null;
    if (area && isDeliveryLabel(tableAreaLabel(area))) return true;

    return isDeliveryTableName(table.table_name || table.name);
  }).sort((a, b) => deliveryTableSortKey(a) - deliveryTableSortKey(b));

  const meta = {
    totalAreas: areas.length,
    totalTables: tables.length,
    areaNames: areas.map((a) => tableAreaLabel(a) || `Area ${a.tableArea_id}`),
    tableNames: tables.map((t) => String(t.table_name || t.name || `Table ${t.table_id}`)),
  };

  if (!deliveryTables.length && tables.length > 0) {
    console.warn(
      '[r2o] POS may show Delivery tables, but the API only returned:',
      JSON.stringify(meta),
    );
  }

  return { tables: deliveryTables, meta };
}

async function listDeliveryTables() {
  const { tables } = await listDeliveryTablesWithMeta();
  return tables;
}

/** All tables the ready2order API exposes (used when Delivery area is not in API). */
async function listPosTablesWithMeta() {
  const [areas, allTables] = await Promise.all([listTableAreas(), listTables()]);
  const { tables: deliveryTables, meta: deliveryMeta } = await listDeliveryTablesWithMeta();

  const sorted = [...allTables].sort((a, b) => deliveryTableSortKey(a) - deliveryTableSortKey(b));
  const meta = {
    ...deliveryMeta,
    deliveryCount: deliveryTables.length,
    usingFallback: deliveryTables.length === 0 && sorted.length > 0,
  };

  return {
    tables: sorted,
    deliveryTables,
    meta,
  };
}

/** True when the table still has open (uninvoiced) orders on it. */
async function tableHasOpenOrders(tableId) {
  try {
    const { data } = await client.get('/orders', {
      params: { table_id: Number(tableId), limit: 1 },
    });
    const rows = normalizeR2oList(data);
    return rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Pick a POS table for an online order.
 * Prefers Delivery tables; falls back to any table the API exposes (e.g. Checkout).
 * Booking on a table avoids a finalized invoice that cannot be deleted.
 */
async function pickTableForOrder() {
  const { tables: allTables, deliveryTables } = await listPosTablesWithMeta();
  const candidates = deliveryTables.length ? deliveryTables : allTables;

  if (!candidates.length) {
    throw new Error('Keine Tische über die ready2order API verfügbar — bitte Verbindung prüfen');
  }

  for (const table of candidates) {
    const occupied = await tableHasOpenOrders(table.table_id);
    if (!occupied) {
      return {
        tableId: table.table_id,
        tableName: table.table_name || table.name,
        usedFallback: !deliveryTables.length,
      };
    }
  }

  const fallback = candidates[0];
  console.warn(`[r2o] All candidate tables occupied — using ${fallback.table_name}`);
  return {
    tableId: fallback.table_id,
    tableName: fallback.table_name || fallback.name,
    usedFallback: !deliveryTables.length,
  };
}

/**
 * Book an order onto a POS table via POST /orders.
 * Returns `{ invoiceId: null, receiptNo: null, tableOrder: true }` or throws.
 */
async function createTableOrderForOrder(order, tableId, tableName = '') {
  const [vatId, zeroVatId] = await Promise.all([
    resolveDefaultVatId(),
    resolveZeroVatId(),
  ]);
  const lineItems = await buildOrderLineItems(order, { vatId, zeroVatId });

  const payload = {
    table_id: Number(tableId),
    price_base: 'gross',
    items: lineItems.map((it) => ({
      product_id: it.product_id,
      item_name: it.item_name,
      item_price: String(it.item_price),
      item_quantity: String(it.item_quantity),
      ...(it.item_vatId !== undefined ? { item_vatId: it.item_vatId } : {}),
      ...(order.orderNumber ? { item_comment: `Online-Bestellung ${order.orderNumber}` } : {}),
    })),
  };

  try {
    const { data } = await client.post('/orders', payload);
    console.log(`[r2o] Order ${order.orderNumber} booked on table ${tableId}${tableName ? ` (${tableName})` : ''}`);
    return { invoiceId: null, receiptNo: null, tableOrder: true, tableId, tableName, raw: data };
  } catch (err) {
    console.error('[r2o] table order creation failed:', {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });
    throw err;
  }
}

/**
 * Sync an accepted order to ready2order using the configured mode:
 *   - r2o_sales_mode = 'table'   → auto-book onto next free Delivery table
 *   - r2o_sales_mode = 'invoice' → create a finalized invoice (legacy default)
 */
async function syncOrderToR2o(order) {
  if (!isConfigured()) {
    return { invoiceId: null, receiptNo: null, skipped: true };
  }
  const mode = await siteSettings.getSetting('r2o_sales_mode', 'invoice');
  if (mode === 'table') {
    const { tableId, tableName } = await pickTableForOrder();
    const result = await createTableOrderForOrder(order, tableId, tableName);
    return { ...result, tableId, tableName };
  }
  return createInvoiceForOrder(order);
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

    // Debug: log discount-related fields so we can verify what's sent
    console.log('[r2o] invoice payload discount debug:', JSON.stringify({
      order_discount: order.discount,
      order_couponCode: order.couponCode,
      coupon_r2oDiscountId: order.coupon?.r2oDiscountId,
      payload_invoice_discounts: payload.invoice_discounts ?? 'NOT SET',
    }));
    const { data } = await client.post('/document/invoice', payload);

    // Log what R2O returned for discounts
    console.log('[r2o] invoice response discount debug:', JSON.stringify({
      invoice_id: data.invoice_id,
      discounts: data.discounts ?? 'NOT IN RESPONSE',
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

module.exports = {
  listProducts,
  getPaymentMethods,
  createInvoiceForOrder,
  createTableOrderForOrder,
  syncOrderToR2o,
  listTables,
  listDeliveryTables,
  listDeliveryTablesWithMeta,
  listPosTablesWithMeta,
  pickTableForOrder,
  isConfigured,
  clearR2oAccountCaches,
  createCouponInR2o,
  updateCouponInR2o,
  deleteCouponInR2o,
  listCouponsFromR2o,
  createDiscountInR2o,
  updateDiscountInR2o,
  deleteDiscountInR2o,
  listDiscountsFromR2o,
  resetCouponR2oIds,
  resyncAllCouponsToR2o,
};
