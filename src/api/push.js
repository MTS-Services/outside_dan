import api from './client';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration('/sw.js');
  if (existing) return existing;
  return navigator.serviceWorker.register('/sw.js');
}

function getDeviceName() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Browser';
}

/** Subscribe the current browser to push and send the subscription to the server. */
export async function subscribeToPush({ kitchen = false } = {}) {
  if (!pushSupported()) throw new Error('Push not supported in this browser');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission denied');

  const reg = await registerServiceWorker();
  let sub = await reg.pushManager.getSubscription();

  if (!sub) {
    const { data } = await api.get('/push/public-key');
    if (!data.publicKey) throw new Error('Server VAPID public key missing');
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    });
  }

  const endpoint = kitchen ? '/push/subscribe-kitchen' : '/push/subscribe';
  await api.post(endpoint, { subscription: sub.toJSON(), deviceName: getDeviceName() });
  return sub;
}

export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await api.post('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
    await sub.unsubscribe();
  }
}

export async function isPushSubscribed() {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}
