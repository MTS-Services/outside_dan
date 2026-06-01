/**
 * Web Push notification service using VAPID.
 * Subscriptions persist in DB. Failed (410/404) subs are auto-removed.
 */
const webpush = require('web-push');
const prisma = require('../config/prisma');
const config = require('../config');

let configured = false;
if (config.vapid.publicKey && config.vapid.privateKey) {
  webpush.setVapidDetails(
    config.vapid.email,
    config.vapid.publicKey,
    config.vapid.privateKey,
  );
  configured = true;
} else {
  // eslint-disable-next-line no-console
  console.warn('[push] VAPID keys missing; push notifications disabled');
}

function getPublicKey() {
  return config.vapid.publicKey;
}

async function saveSubscription({ subscription, userId = null, isKitchen = false, deviceName = null }) {
  if (!subscription?.endpoint) throw new Error('Invalid subscription');
  const { endpoint, keys } = subscription;
  return prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh: keys.p256dh, auth: keys.auth, userId, isKitchen, ...(deviceName ? { deviceName } : {}) },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId, isKitchen, deviceName },
  });
}

async function removeSubscription(endpoint) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

async function sendToSubs(subs, payload) {
  if (!configured) {
    return { sent: 0, failed: 0, skipped: subs.length, configured: false };
  }
  if (!subs.length) {
    return { sent: 0, failed: 0, skipped: 0, configured: true };
  }

  let sent = 0;
  let failed = 0;
  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
        sent += 1;
      } catch (err) {
        failed += 1;
        if (err.statusCode === 404 || err.statusCode === 410) {
          await removeSubscription(s.endpoint);
        } else {
          // eslint-disable-next-line no-console
          console.warn('[push] send failed:', err.statusCode, err.body || err.message);
        }
      }
    }),
  );

  return { sent, failed, skipped: 0, configured: true };
}

/** Push to one specific user (e.g. order owner). */
async function pushToUser(userId, payload, { skipPushEnabledCheck = false } = {}) {
  if (!userId) return { sent: 0, failed: 0, skipped: 0, configured };
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.warn('[push] pushToUser: user not found', userId);
    return { sent: 0, failed: 0, skipped: 0, configured };
  }
  if (!skipPushEnabledCheck && user.pushEnabled === false) {
    console.warn('[push] pushToUser: pushEnabled=false for', userId);
    return { sent: 0, failed: 0, skipped: 0, configured };
  }
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (!subs.length) {
    console.warn('[push] pushToUser: no subscriptions found for userId', userId);
    return { sent: 0, failed: 0, skipped: 0, configured };
  }
  return sendToSubs(subs, payload);
}

/** Push to all kitchen / admin subscribers. */
async function pushToKitchen(payload) {
  const subs = await prisma.pushSubscription.findMany({ where: { isKitchen: true } });
  return sendToSubs(subs, payload);
}

/**
 * Push a new-order alert to ALL admins + subadmins who have order
 * notifications enabled (and master push enabled).
 */
async function pushToStaff(payload, { excludeUserId } = {}) {
  const staff = await prisma.user.findMany({
    where: {
      role: { in: ['ADMIN', 'SUBADMIN', 'STAFF'] },
      pushEnabled: true,
      orderNotificationsEnabled: true,
      blocked: false,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  });
  if (!staff.length) return { sent: 0, failed: 0, skipped: 0, configured };
  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: staff.map((s) => s.id) } },
  });
  return sendToSubs(subs, payload);
}

module.exports = {
  getPublicKey,
  saveSubscription,
  removeSubscription,
  pushToUser,
  pushToKitchen,
  pushToStaff,
  isConfigured: () => configured,
};
