// Native app helpers. Everything here is a no-op in a normal browser/PWA.
// Inside the Capacitor shell (Android), Capacitor injects window.Capacitor and its plugins.
const cap = () => (typeof window !== 'undefined' ? window.Capacitor : null);
const isNative = () => !!(cap() && cap().isNativePlatform && cap().isNativePlatform());
const KEY = 'g24-push-token';
const LS = {
  get: k => { try { return localStorage.getItem(k); } catch (_) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) { /* ignore */ } },
  del: k => { try { localStorage.removeItem(k); } catch (_) { /* ignore */ } },
};

let listening = false;

// Ask permission (Android 13+ shows a prompt), register with FCM, and send the token to the server.
// iOS is skipped on purpose: it needs the Firebase iOS SDK or a direct APNs sender (docs/PUSH_NOTIFICATIONS.md).
export async function initPush(api) {
  try {
    if (!isNative() || cap().getPlatform() !== 'android') return;
    const Push = cap().Plugins && cap().Plugins.PushNotifications;
    if (!Push) return;
    if (!listening) {
      listening = true;
      Push.addListener('registration', async t => {
        try { await api('POST', '/me/devices', { token: t.value, platform: 'android' }); LS.set(KEY, t.value); } catch (_) { /* retry next launch */ }
      });
      Push.addListener('registrationError', () => { /* Firebase not configured in this build */ });
    }
    let perm = await Push.checkPermissions();
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') perm = await Push.requestPermissions();
    if (perm.receive !== 'granted') return;
    await Push.register();
  } catch (_) { /* never block the app because of notifications */ }
}

// Call before logging out so this phone stops receiving the previous user's notifications.
export async function stopPush(api) {
  const token = LS.get(KEY);
  if (!token) return;
  try { await api('POST', '/me/devices/remove', { token }); } catch (_) { /* ignore */ }
  LS.del(KEY);
}
