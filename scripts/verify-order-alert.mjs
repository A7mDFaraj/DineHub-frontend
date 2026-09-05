import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(process.env.PLAYWRIGHT_PACKAGE_JSON || import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const base = process.env.FRONTEND_TEST_URL || 'http://localhost:3100';
try {
  for (const scenario of ['normal', 'reload-ready', 'suspended', 'resume-fails', 'muted', 'delivered-before-resume']) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let status = scenario === 'reload-ready' || scenario === 'resume-fails' ? 'ready' : 'pending';
    await page.addInitScript(() => {
      window.alertCounters = { tones: 0, prompts: 0, releases: 0 };
      window.failAudioResume = false;
      window.delayAudioResume = false;
      class AudioMock {
        state = 'suspended'; currentTime = 0; destination = {};
        constructor() { window.testAudio = this; }
        async resume() {
          if (window.failAudioResume) throw new Error('blocked');
          if (window.delayAudioResume) await new Promise(resolve => { window.finishAudioResume = resolve; });
          this.state = 'running';
        }
        createOscillator() { window.alertCounters.tones++; return { connect() {}, frequency: { value: 0 }, start() {}, stop() {} }; }
        createGain() { return { connect() {}, gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
      }
      window.AudioContext = AudioMock;
      if (window.Notification) window.Notification.requestPermission = () => { window.alertCounters.prompts++; return Promise.resolve('denied'); };
      Object.defineProperty(navigator, 'wakeLock', { value: { request: async () => ({ released: false, addEventListener() {}, release() { window.alertCounters.releases++; return Promise.resolve(); } }) } });
      navigator.permissions.query = async () => ({ state: 'granted' });
    });
    await page.route('https://dinehub-backend-42eq.onrender.com/**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ publicToken: scenario, orderNumber: 42, status, createdAt: new Date().toISOString(), table: { number: 7 }, menuPath: '/menu/demo/7', trackingPath: `/order/${scenario}` }) }));
    await page.goto(`${base}/order/${scenario}`);
    const heading = page.getByRole('heading', { name: 'متابعة حالة الطلب المباشرة' });
    await heading.waitFor();
    if (scenario === 'normal' || scenario === 'suspended') await heading.click();
    if (scenario === 'suspended') await page.evaluate(() => { window.testAudio.state = 'suspended'; });
    if (scenario === 'muted') await page.getByRole('button', { name: 'كتم صوت التنبيه' }).click();
    status = 'ready';
    await page.getByText('طلبك جاهز — يمكنك استلامه الآن', { exact: true }).waitFor();
    if (scenario !== 'normal') {
      assert.equal(await page.evaluate(() => window.alertCounters.tones), 0);
      assert.equal(await page.evaluate(key => sessionStorage.getItem(`order-ready:${key}`), scenario), null);
      if (scenario === 'resume-fails') {
        await page.evaluate(() => { window.failAudioResume = true; });
        await heading.click();
        assert.equal(await page.evaluate(() => window.alertCounters.tones), 0);
        await page.evaluate(() => { window.failAudioResume = false; });
      }
      if (scenario === 'delivered-before-resume') {
        await page.evaluate(() => { window.delayAudioResume = true; });
        await heading.click();
        status = 'delivered';
        await page.getByRole('heading', { name: 'كيف كانت تجربتك؟' }).waitFor();
        await page.evaluate(() => window.finishAudioResume());
        assert.equal(await page.evaluate(() => window.alertCounters.tones), 0);
        await page.close();
        continue;
      }
      if (scenario === 'muted') await page.getByRole('button', { name: 'تشغيل صوت التنبيه' }).click();
      else await heading.click();
    }
    await page.waitForFunction(() => window.alertCounters.tones === 3);
    await heading.click();
    const counters = await page.evaluate(() => window.alertCounters);
    assert.equal(counters.tones, 3);
    assert.equal(counters.prompts, 0);
    if (scenario === 'normal') assert(counters.releases >= 1);
    await page.reload();
    await heading.click();
    assert.equal(await page.evaluate(() => window.alertCounters.tones), 0);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS: ${scenario}`);
  }
  console.log('PASS: pending alerts retry after unlock, never duplicate, respect mute, and cancel after delivery.');
} finally {
  await browser.close();
}
