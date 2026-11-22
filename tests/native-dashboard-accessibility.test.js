'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dashboard = fs.readFileSync(
  path.join(__dirname, '../mobile-native/src/components/NativeDashboards.tsx'),
  'utf8',
);
const app = fs.readFileSync(
  path.join(__dirname, '../mobile-native/App.tsx'),
  'utf8',
);

test('native dashboard back and retry controls have Somali accessible names', () => {
  assert.match(
    dashboard,
    /<Pressable accessibilityRole="button" accessibilityLabel="Ku noqo akoonka" accessibilityHint="Ku laabo bogga akoonka\." onPress=\{onBack\}/,
  );
  assert.match(
    dashboard,
    /<Pressable accessibilityRole="button" accessibilityLabel="Mar kale isku day" accessibilityHint="Dib u soo geli xogta dashboard-ka\." onPress=\{onRetry\}/,
  );
});

test('native dashboard back and retry touch targets are at least 44 dp high and wide', () => {
  assert.match(dashboard, /back:\{width:44,height:44,/);
  assert.match(dashboard, /retry:\{minHeight:44,justifyContent:'center',/);
});

test('native admin and hospital dashboard screens remain gated by signed-in roles', () => {
  assert.match(app, /tab === 'adminPreview' && auth\.user\?\.role === 'admin'/);
  assert.match(
    app,
    /tab === 'hospitalPreview' && auth\.user && \['hospital_admin','provider_admin'\]\.includes\(auth\.user\.role\)/,
  );
});

test('patient activity login and retry controls expose Somali accessible names and hints', () => {
  assert.ok(app.includes('accessibilityRole="button" accessibilityLabel="Soo gal ama isdiiwaangeli" accessibilityHint="Soo gal si aad u aragto ballamahaaga iyo kaararkaaga gaarka ah." hitSlop={8} style={[styles.primaryButton, styles.activityLoginButton]} onPress={onLogin}'));
  assert.ok(app.includes("accessibilityRole=\"button\" accessibilityLabel=\"Mar kale isku day\" accessibilityHint=\"Dib u soo geli ballamahaaga, kaararkaaga iyo booqashooyinkaaga.\" hitSlop={8} style={styles.activityRetry} onPress={error.includes('soo gal') ? onRefreshAuth : load}"));
  assert.ok(app.includes('accessibilityLiveRegion="polite" style={styles.noticeCopy}'));
});

test('patient activity login and retry touch targets are at least 44 dp high', () => {
  assert.ok(app.includes("activityLoginButton:{minHeight:44,justifyContent:'center'}"));
  assert.ok(app.includes("activityRetry:{minHeight:44,justifyContent:'center',alignSelf:'flex-start',paddingHorizontal:8}"));
});

test('patient activity keeps personal records behind authentication and loads all three record types', () => {
  assert.ok(app.includes('if (!auth.user) return; setLoading(true);'));
  assert.ok(app.includes("apiRequest<{ orders: ActivityOrder[] }>('/api/orders')"));
  assert.ok(app.includes("apiRequest<{ appointments: ActivityAppointment[] }>('/api/appointments')"));
  assert.ok(app.includes("apiRequest<{ visits: ActivityVisit[] }>('/api/visits')"));
});
