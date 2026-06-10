const prisma = require('../config/prisma');
const { ApiError } = require('../middlewares/error');
const { getIO } = require('../sockets');
const r2o = require('./r2oService');
const printer = require('./printerService');
const push = require('./pushService');
const email = require('./emailService');
const config = require('../config');
const siteSettings = require('./siteSettingService');

const ORDERS_CLOSED_MESSAGE = 'Wir nehmen derzeit keine Bestellungen entgegen.';

const DELIVERY_FEE = 2.5;
const TAX_RATE = 0;

async function resolveDeliveryZone({ deliveryZoneId, postalCode, areaLabel } = {}) {
  if (deliveryZoneId) {
    const zone = await prisma.deliveryZone.findUnique({ where: { id: deliveryZoneId } });
    if (!zone || !zone.isActive) {
      throw new ApiError(400, 'Lieferzone nicht verfügbar');
    }
    return zone;
  }
  if (postalCode) {
    const where = { postalCode: postalCode.trim(), isActive: true };
    if (areaLabel !== undefined) where.label = (areaLabel || '').trim();
    const zone = await prisma.deliveryZone.findFirst({ where });
    if (zone) return zone;
  }
  return null;
}

function assertMinimumOrder(subtotal, zone) {
  const minimumOrder = Number(zone.minimumOrder);
  if (minimumOrder > 0 && subtotal < minimumOrder) {
    throw new ApiError(
      400,
      `Mindestbestellwert für diese Lieferzone: €${minimumOrder.toFixed(2)} (aktuell €${subtotal.toFixed(2)})`
    );
  }
}

function round2(n) { return Math.round(n * 100) / 100; }

const ORDER_INCLUDE = {
  items: { include: { menuItem: true, extras: true } },
  acceptedBy: { select: { id: true, name: true, email: true, role: true } },
  coupon: { select: { r2oCouponId: true, r2oDiscountId: true } },
};

async function generateOrderNumber() {
  const today = new Date();
  const ymd = today.getFullYear().toString()
    + String(today.getMonth() + 1).padStart(2, '0')
    + String(today.getDate()).padStart(2, '0');
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const count = await prisma.order.count({ where: { createdAt: { gte: start } } });
  return `ORD-${ymd}-${String(count + 1).padStart(3, '0')}`;
}

/**
 * Validate cart items and resolve them with extras into priced rows.
 * Returns { orderItemsCreate, subtotal }.
 */
async function _resolveCart(items) {
  if (!items?.length) throw new ApiError(400, 'Warenkorb ist leer');

  const ids = items.map((i) => i.menuItemId);
  const dbItems = await prisma.menuItem.findMany({
    where: { id: { in: ids }, isAvailable: true },
    include: { extras: { include: { extra: true } } },
  });
  if (dbItems.length !== ids.length) throw new ApiError(400, 'Ein oder mehrere Artikel sind nicht verfügbar');
  const itemMap = Object.fromEntries(dbItems.map((d) => [d.id, d]));

  const orderItemsCreate = [];
  let subtotal = 0;

  for (const i of items) {
    const m = itemMap[i.menuItemId];
    const qty = Math.max(1, parseInt(i.quantity, 10) || 1);
    const unitPrice = Number(m.price);
    let lineTotal = unitPrice * qty;

    const allowedExtraIds = new Set(m.extras.map((x) => x.extraId));
    const extrasCreate = [];
    for (const eid of i.extraIds || []) {
      if (!allowedExtraIds.has(eid)) continue; // silently drop disallowed extras
      const x = m.extras.find((e) => e.extraId === eid)?.extra;
      if (!x || !x.isActive) continue;
      const extraPrice = Number(x.price);
      lineTotal += extraPrice * qty;
      extrasCreate.push({ extraId: x.id, name: x.name, price: x.price, quantity: qty });
    }
    subtotal += lineTotal;

    orderItemsCreate.push({
      menuItemId: m.id,
      name: m.name,
      price: m.price,
      quantity: qty,
      notes: i.notes || null,
      ...(extrasCreate.length ? { extras: { create: extrasCreate } } : {}),
    });
  }

  return { orderItemsCreate, subtotal: round2(subtotal) };
}

async function createOrder(input, userId = null) {
  if (!(await siteSettings.areOrdersAccepted())) {
    throw new ApiError(503, ORDERS_CLOSED_MESSAGE);
  }

  const { orderItemsCreate, subtotal } = await _resolveCart(input.items);

  const zone = await resolveDeliveryZone({
    deliveryZoneId: input.deliveryZoneId,
    postalCode: input.postalCode,
  });
  if (!zone) {
    throw new ApiError(400, 'Lieferung in diese Postleitzahl ist nicht möglich');
  }
  if (input.postalCode?.trim() !== zone.postalCode) {
    throw new ApiError(400, 'Postleitzahl stimmt nicht mit der gewählten Lieferzone überein');
  }
  const deliveryFee = Number(zone.deliveryFee);
  assertMinimumOrder(subtotal, zone);

  // Coupon
  let discount = 0;
  let couponId = null;
  let couponCode = null;
  if (input.couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: input.couponCode.trim().toUpperCase() } });
    if (coupon && coupon.isActive) {
      const now = new Date();
      const expired = (coupon.validFrom && now < coupon.validFrom) || (coupon.validUntil && now > coupon.validUntil);
      const exhausted = coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit;
      const belowMin = subtotal < Number(coupon.minOrder);
      if (!expired && !exhausted && !belowMin) {
        if (coupon.type === 'FIXED') {
          discount = Math.min(Number(coupon.value), subtotal);
        } else {
          discount = Math.round((subtotal * Number(coupon.value) / 100) * 100) / 100;
        }
        couponId = coupon.id;
        couponCode = coupon.code;
      }
    }
  }

  const tax = round2(subtotal * TAX_RATE);
  const total = round2(subtotal + deliveryFee + tax - discount);
  const orderNumber = await generateOrderNumber();
  const isPaypal = input.paymentMethod === 'PAYPAL';

  const order = await prisma.order.create({
    data: {
      orderNumber,
      // PayPal flow: order is created PENDING (already captured before this call)
      status: 'PENDING',
      userId: userId || null,
      paymentMethod: input.paymentMethod || 'CASH',
      paymentStatus: isPaypal ? 'PAID' : 'UNPAID',
      paypalOrderId: input.paypalOrderId || null,
      paypalCaptureId: input.paypalCaptureId || null,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail || null,
      street: input.street,
      city: input.city,
      postalCode: input.postalCode,
      deliveryLat: input.deliveryLat ?? null,
      deliveryLon: input.deliveryLon ?? null,
      notes: input.notes || null,
      subtotal,
      deliveryFee,
      tax,
      discount: discount > 0 ? discount : null,
      couponId: couponId || null,
      couponCode: couponCode || null,
      total,
      items: { create: orderItemsCreate },
    },
    include: ORDER_INCLUDE,
  });

  try { getIO().to('kitchen').emit('order:new', order); } catch { /* noop */ }

  // Increment coupon usage
  if (couponId) {
    prisma.coupon.update({ where: { id: couponId }, data: { usageCount: { increment: 1 } } }).catch(() => {});
  }

  // Push to all admins/subadmins
  push.pushToStaff({
    title: `Neue Bestellung ${order.orderNumber}`,
    body: `${order.customerName} • € ${Number(order.total).toFixed(2)} • ${order.items.length} Artikel`,
    icon: '/uploads/logo.png',
    url: '/admin/orders',
    tag: `order-${order.id}`,
  }).catch(() => {});
  push.pushToKitchen({
    title: `Neue Bestellung ${order.orderNumber}`,
    body: `${order.customerName} • € ${Number(order.total).toFixed(2)}`,
    icon: '/uploads/logo.png',
    url: '/admin/orders',
    tag: `order-${order.id}`,
  }).catch(() => {});

  // Email notification to staff who opted in individually
  (async () => {
    try {
      const staff = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'SUBADMIN'] }, blocked: false, emailNotificationsEnabled: true },
        select: { email: true },
      });
      const addresses = staff.map((u) => u.email).filter(Boolean);
      if (addresses.length > 0) {
        email.sendNewOrderToAdmin(order, addresses).catch(() => {});
      }
    } catch { /* noop */ }
  })();

  return order;
}

async function listOrders({ status, search, page = 1, pageSize = 10, statusIn, userId } = {}) {
  const where = {
    ...(userId ? { userId } : {}),
    ...(status ? { status } : {}),
    ...(statusIn ? { status: { in: statusIn } } : {}),
    ...(search
      ? {
          OR: [
            { orderNumber: { contains: search, mode: 'insensitive' } },
            { customerName: { contains: search, mode: 'insensitive' } },
            { customerPhone: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const take = Math.min(Math.max(parseInt(pageSize, 10) || 10, 1), 100);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;
  const [total, items] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where, orderBy: { createdAt: 'desc' }, take, skip, include: ORDER_INCLUDE,
    }),
  ]);
  return { items, total, page: Math.floor(skip / take) + 1, pageSize: take };
}

async function getOrder(id) {
  const order = await prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
  if (!order) throw new ApiError(404, 'Bestellung nicht gefunden');
  return order;
}

function emitStatus(order, extra = {}) {
  try {
    const io = getIO();
    io.to('kitchen').emit('order:updated', order);
    io.to(`order:${order.id}`).emit('order:status', {
      id: order.id,
      status: order.status,
      orderNumber: order.orderNumber,
      acceptanceNote: extra.acceptanceNote || order.acceptanceNote,
      declinedReason: extra.reason || order.declinedReason,
    });
  } catch { /* ignore */ }
}

const STATUS_PUSH_DE = {
  ACCEPTED:        { title: 'Bestellung angenommen ✅', body: 'Der Koch hat Ihre Bestellung angenommen.' },
  DECLINED:        { title: 'Bestellung abgelehnt ❌', body: 'Leider wurde Ihre Bestellung abgelehnt.' },
};

function pushStatusToCustomer(order, extra = {}) {
  if (!order.userId) return;
  const tpl = STATUS_PUSH_DE[order.status];
  if (!tpl) return;
  const note = order.status === 'ACCEPTED' ? extra.acceptanceNote : extra.reason;
  const noteStr = note ? `\nHinweis: ${note}` : '';
  const body = `${tpl.body}${noteStr}`;
  push.pushToUser(order.userId, {
    title: tpl.title,
    body: body,
    icon: '/uploads/logo.png',
    url: '/my-orders',
    tag: `status-${order.id}`,
  }).catch((err) => console.warn('[push] pushStatusToCustomer failed:', err.message));
}

async function acceptOrder(id, { acceptanceNote, userId } = {}) {
  const order = await getOrder(id);
  if (order.status !== 'PENDING') {
    throw new ApiError(400, `Bestellung kann im Status ${order.status} nicht angenommen werden`);
  }

  let r2oResult = { invoiceId: null, receiptNo: null };
  try {
    r2oResult = await r2o.createInvoiceForOrder(order);
  } catch (err) {
    console.warn('[r2o] Sync fehlgeschlagen:', err.message);
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: 'ACCEPTED',
      acceptedAt: new Date(),
      acceptedById: userId || null,
      acceptanceNote: acceptanceNote || null,
      r2oInvoiceId: r2oResult.invoiceId != null ? String(r2oResult.invoiceId) : null,
      r2oReceiptNo: r2oResult.receiptNo != null ? String(r2oResult.receiptNo) : null,
      paymentStatus: order.paymentStatus === 'PAID' ? 'PAID'
        : (order.paymentMethod === 'ONLINE' ? 'PAID' : 'UNPAID'),
    },
    include: ORDER_INCLUDE,
  });

  printer.printOrderTicket(updated).catch(() => {});
  emitStatus(updated, { acceptanceNote });
  pushStatusToCustomer(updated, { acceptanceNote });
  email.sendOrderAccepted(updated).catch(() => {});
  return updated;
}

async function declineOrder(id, reason) {
  const order = await getOrder(id);
  if (order.status !== 'PENDING') {
    throw new ApiError(400, `Bestellung kann im Status ${order.status} nicht abgelehnt werden`);
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: 'DECLINED',
      declinedReason: reason || null,
    },
    include: ORDER_INCLUDE,
  });
  emitStatus(updated);
  pushStatusToCustomer(updated, { reason });
  email.sendOrderDeclined(updated).catch(() => {});
  return updated;
}

async function updateStatus(id, status) {
  const allowed = ['ACCEPTED', 'DECLINED'];
  if (!allowed.includes(status)) throw new ApiError(400, 'Ungültiger Status');
  const updated = await prisma.order.update({
    where: { id },
    data: { status },
    include: ORDER_INCLUDE,
  });
  emitStatus(updated);
  pushStatusToCustomer(updated);
  return updated;
}

/**
 * Edit an order.
 * - Customer can edit their own DECLINED order and resubmit (sets status PENDING).
 * - Admin/Subadmin can edit PENDING and ACCEPTED orders.
 */
async function editOrder(id, input, { userId, role }) {
  const order = await getOrder(id);
  const isStaff = role === 'ADMIN' || role === 'SUBADMIN' || role === 'STAFF';
  const isOwner = order.userId && order.userId === userId;

  if (!isStaff && !isOwner) throw new ApiError(403, 'Keine Berechtigung');
  if (!isStaff) {
    // Customer can only edit DECLINED orders (resubmit)
    if (order.status !== 'DECLINED') {
      throw new ApiError(400, 'Bestellung kann in diesem Status nicht bearbeitet werden');
    }
  } else {
    // Staff can edit PENDING / ACCEPTED / DECLINED
    if (!['PENDING', 'ACCEPTED', 'DECLINED'].includes(order.status)) {
      throw new ApiError(400, 'Bestellung kann in diesem Status nicht bearbeitet werden');
    }
  }

  const data = {};
  ['notes', 'customerName', 'customerPhone', 'street', 'city', 'postalCode'].forEach((k) => {
    if (input[k] !== undefined) data[k] = input[k];
  });

  const postalCode = data.postalCode ?? order.postalCode;
  const city = data.city ?? order.city;
  const addressChanged = input.postalCode !== undefined || input.city !== undefined || input.deliveryZoneId;

  let zone = null;
  if (addressChanged || input.items || input.deliveryZoneId) {
    zone = await resolveDeliveryZone({
      deliveryZoneId: input.deliveryZoneId,
      postalCode,
      areaLabel: city,
    });
    if (!zone) {
      throw new ApiError(400, 'Lieferung in diese Postleitzahl ist nicht möglich');
    }
    if (addressChanged || input.deliveryZoneId) {
      data.deliveryFee = zone.deliveryFee;
    }
  }

  // Items rebuild (optional)
  if (input.items) {
    const { orderItemsCreate, subtotal } = await _resolveCart(input.items);
    const deliveryFee = Number(zone?.deliveryFee ?? order.deliveryFee);
    if (zone) assertMinimumOrder(subtotal, zone);
    const tax = round2(subtotal * TAX_RATE);
    const discount = Number(order.discount || 0);
    const total = round2(subtotal + deliveryFee + tax - discount);
    data.subtotal = subtotal;
    data.deliveryFee = deliveryFee;
    data.tax = tax;
    data.total = total;
    await prisma.orderItem.deleteMany({ where: { orderId: id } });
    data.items = { create: orderItemsCreate };
  } else if (zone && addressChanged) {
    assertMinimumOrder(Number(order.subtotal), zone);
  }

  // If customer is editing a declined order, resubmit it as PENDING
  if (!isStaff && order.status === 'DECLINED') {
    data.status = 'PENDING';
    data.declinedReason = null;
  }

  const updated = await prisma.order.update({
    where: { id }, data, include: ORDER_INCLUDE,
  });

  if (data.status === 'PENDING') {
    try { getIO().to('kitchen').emit('order:new', updated); } catch { /* */ }
    push.pushToStaff({
      title: `Bestellung erneut eingereicht: ${updated.orderNumber}`,
      body: `${updated.customerName} • € ${Number(updated.total).toFixed(2)}`,
      icon: '/uploads/logo.png',
      url: '/admin/orders', tag: `order-${updated.id}`,
    }).catch(() => {});
  } else {
    emitStatus(updated);
  }
  return updated;
}

async function reprintTicket(id) {
  const order = await getOrder(id);
  return printer.printOrderTicket(order);
}

async function listMineByUser(userId) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: ORDER_INCLUDE,
  });
}

// ---- Dashboard stats ------------------------------------------------------

async function dashboardStats() {
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

  const acceptedStatuses = ['ACCEPTED'];

  const [orders, products, allTimeRevResult, pendingCount] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: since30 } },
      select: {
        id: true, total: true, status: true, paymentMethod: true, paymentStatus: true,
        createdAt: true,
        items: { select: { name: true, quantity: true, price: true } },
      },
    }),
    prisma.menuItem.count(),
    prisma.order.aggregate({
      where: { status: { in: acceptedStatuses } },
      _sum: { total: true },
    }),
    prisma.order.count({ where: { status: 'PENDING' } }),
  ]);

  // All-time revenue from accepted orders
  const totalPayment = Number(allTimeRevResult._sum.total || 0);

  // Today's revenue from accepted orders
  const revenue = orders
    .filter((o) => new Date(o.createdAt) >= todayStart && acceptedStatuses.includes(o.status))
    .reduce((s, o) => s + Number(o.total), 0);

  // Top selling product
  const productCount = {};
  orders.forEach((o) => o.items.forEach((it) => {
    productCount[it.name] = (productCount[it.name] || 0) + it.quantity;
  }));
  const top = Object.entries(productCount).sort((a, b) => b[1] - a[1])[0] || [null, 0];

  // Peak time per hour (24h buckets)
  const hourBuckets = Array.from({ length: 24 }, () => 0);
  orders.forEach((o) => { hourBuckets[new Date(o.createdAt).getHours()] += 1; });

  // Last 14 days revenue series + new vs accepted order counts
  const days = [];
  const orderFlow = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    const dayOrders = orders.filter((o) => new Date(o.createdAt) >= d && new Date(o.createdAt) < next);
    const total = dayOrders.reduce((s, o) => s + Number(o.total), 0);
    const dateStr = d.toISOString().slice(0, 10);
    days.push({ date: dateStr, total: round2(total) });
    orderFlow.push({
      date: dateStr,
      newOrders: dayOrders.length,
      accepted: dayOrders.filter((o) => acceptedStatuses.includes(o.status)).length,
    });
  }

  return {
    totalPayment: round2(totalPayment),
    pendingOrders: pendingCount,
    totalOrders: orders.length,
    revenue: round2(revenue),
    topSellingProduct: { name: top[0], quantity: top[1] },
    productCount: products,
    hourBuckets,
    days,
    orderFlow,
  };
}

module.exports = {
  createOrder,
  listOrders,
  listMineByUser,
  getOrder,
  acceptOrder,
  declineOrder,
  updateStatus,
  editOrder,
  reprintTicket,
  dashboardStats,
  DELIVERY_FEE,
};
