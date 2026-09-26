import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(
  process.env.PLAYWRIGHT_PACKAGE_JSON || import.meta.url,
);
const { chromium } = require("playwright");
const artifactDir =
  process.env.EVENTS_ARTIFACT_DIR || join(tmpdir(), "dinehub-events-browser");
await mkdir(artifactDir, { recursive: true });
const base = process.env.FRONTEND_TEST_URL || "http://localhost:3100";
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const context = await browser.newContext();
await context.addCookies([
  { name: "dinehub_admin_guide", value: "v1", url: base },
]);
const sources = [
  "api-football",
  "openfootapi",
  "thesportsdb",
  "365scores-widget",
  "sportscore-widget",
];
const fixture = {
  id: "f",
  leagueEn: "Saudi Pro League",
  leagueAr: "دوري روشن السعودي",
  homeEn: "Al Hilal",
  homeAr: "الهلال",
  awayEn: "Al Ahli",
  awayAr: "الأهلي",
  homeLogo: null,
  awayLogo: null,
  kickoff: "2030-01-01T18:00:00Z",
  status: "NS",
  syncedAt: new Date().toISOString(),
};
const event = {
  id: "e",
  fixtureId: "f",
  fixture,
  showing: true,
  bookingOpen: true,
  reviewRequired: false,
  startsAt: "2030-01-01T17:00:00Z",
  endsAt: "2030-01-01T21:00:00Z",
  paymentMode: "deposit",
  amountMinor: 5000,
  cancellationHours: 24,
  tables: [{ tableId: "t", table: { id: "t", number: 1, capacity: 4 } }],
};
const branch = {
  id: "b",
  name: "Demo cafe",
  nameEn: "Demo cafe",
  nameAr: "مقهى تجريبي",
  publicCode: "demo",
};
const token = "a".repeat(64);
let selectedProvider = "api-football",
  providerSyncs = 0,
  syncPolls = 0,
  syncRunning = false,
  booked = 0,
  paid = 0,
  cancelled = 0,
  saved = null;
const syncStatus = () => ({
  selectedProvider,
  running: syncRunning,
  lastError:
    selectedProvider === "openfootapi" && providerSyncs && !syncRunning
      ? "FOOTBALL_INVALID_KEY"
      : null,
  lastCompletedAt: null,
  partial: selectedProvider === "thesportsdb",
  providers: sources.map((id) => ({ id, configured: true })),
});
const receipt = () => ({
  id: "r",
  token,
  status: cancelled ? "cancelled" : "confirmed",
  customerName: "Test Guest",
  phone: "+966500000000",
  guests: 2,
  startsAt: event.startsAt,
  endsAt: event.endsAt,
  paymentMode: "deposit",
  paymentStatus: paid ? "paid" : "unpaid",
  amountMinor: 5000,
  table: { number: 1 },
  event: { id: "e", fixture, branch: { publicCode: "demo" } },
  credits: [],
});
const errors = [];
context.on("page", (p) => p.on("pageerror", (e) => errors.push(e.message)));
// Third-party availability is tested separately; these checks must be deterministic.
await context.route("https://widgets.365scores.com/main.js", (r) =>
  r.fulfill({
    contentType: "application/javascript",
    body: "document.querySelector('[data-widget-id]').textContent='Saudi schedule test';",
  }),
);
await context.route("https://sportscore.com/embed/**", (r) =>
  r.fulfill({
    contentType: "text/html",
    body: "<html><body>Saudi schedule test</body></html>",
  }),
);
// Never allow these browser tests to mutate the production backend.
await context.route(
  "https://dinehub-backend-42eq.onrender.com/**",
  async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    const send = (data, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    if (request.method() === "OPTIONS") return send({});
    if (path.endsWith("/auth/get-session"))
      return send({
        session: {
          id: "session",
          userId: "owner",
          token: "test",
          expiresAt: "2099-01-01T00:00:00Z",
        },
        user: {
          id: "owner",
          name: "Test Owner",
          email: "owner@example.test",
          emailVerified: true,
        },
      });
    if (path.endsWith("/access/me"))
      return send({
        id: "owner",
        businessId: "business",
        isBusinessOwner: true,
        permissions: [
          "events.read",
          "events.manage",
          "events.checkin",
          "events.cashier",
          "tables.read",
          "tables.write",
          "dashboard.read",
          "branches.read",
          "orders.read",
        ],
      });
    if (path.endsWith("/staff/branches")) return send([branch]);
    if (path === "/api/events/branch/demo")
      return send({ branch, events: [event] });
    if (path === "/api/events/e/tables")
      return send([
        { id: "t", number: 1, capacity: 4, available: true },
        { id: "busy", number: 2, capacity: 4, available: false },
      ]);
    if (path === "/api/events/e/reservations") {
      const data = request.postDataJSON();
      assert.equal(data.tableId, "t");
      assert.equal(data.customerName, "Test Guest");
      assert(data.idempotencyKey.length >= 24);
      booked++;
      return send({ token });
    }
    if (path === "/api/events/reservation/receipt") {
      assert.equal(request.postDataJSON().token, token);
      return send(receipt());
    }
    if (path === "/api/events/reservation/cancel") {
      cancelled++;
      return send(receipt());
    }
    if (path === "/api/admin/events/b/provider") {
      selectedProvider = request.postDataJSON().provider;
      assert(sources.includes(selectedProvider));
      return send(syncStatus());
    }
    if (path === "/api/admin/events/b/sync") {
      assert(!selectedProvider.endsWith("-widget"));
      providerSyncs++;
      syncRunning = true;
      syncPolls = 0;
      return send({ queued: true });
    }
    if (path === "/api/admin/events/b/sync-status") {
      if (syncRunning && ++syncPolls >= 2) syncRunning = false;
      return send(syncStatus());
    }
    if (path === "/api/admin/events/b/fixtures")
      return send(
        selectedProvider === "openfootapi" ||
          selectedProvider.endsWith("-widget")
          ? []
          : [fixture],
      );
    if (path === "/api/admin/events/b/tables")
      return send([{ id: "t", number: 1, capacity: 4 }]);
    if (path === "/api/admin/events/b/reservations") return send([receipt()]);
    if (path === "/api/admin/events/b/reservations/r/collect") {
      paid++;
      return send(receipt());
    }
    if (path === "/api/admin/events/b") {
      if (request.method() === "PUT") {
        saved = request.postDataJSON();
        return send(event);
      }
      return send([event]);
    }
    if (request.method() === "GET") return send([]);
    if (path.includes("/logs")) return send({});
    throw new Error(`Unexpected backend mutation: ${request.method()} ${path}`);
  },
);
const page = await context.newPage();
page.on("dialog", (dialog) => dialog.accept());
const locale = async (code) =>
  context.addCookies([{ name: "NEXT_LOCALE", value: code, url: base }]);
const fits = async () =>
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "Page overflows viewport",
  );
try {
  for (const lang of ["ar", "en"]) {
    await locale(lang);
    await page.goto(`${base}/${lang}/events/demo`);
    await page
      .getByRole("button", {
        name: lang === "ar" ? "احجز طاولتك" : "Reserve a table",
        exact: true,
      })
      .waitFor();
    for (const width of [320, 375, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      await fits();
    }
  }
  await page
    .getByRole("button", { name: "Reserve a table", exact: true })
    .click();
  await page.locator("select").selectOption("t");
  assert.notEqual(
    await page.locator('option[value="busy"]').getAttribute("disabled"),
    null,
  );
  await page.getByLabel("Name", { exact: true }).fill("Test Guest");
  await page.getByLabel("Phone number", { exact: true }).fill("+966500000000");
  await page
    .getByText("Payment is due at the cashier.", { exact: false })
    .waitFor();
  await page
    .getByRole("button", { name: "Confirm reservation", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Your reservation · Confirmed" })
    .waitFor();
  assert.equal(booked, 1);
  assert.equal(paid, 0);
  assert(page.url().endsWith(`#${token}`));
  await page.goto(`${base}/en/admin/events`);
  if (
    await page
      .getByRole("button", { name: "Close Guide", exact: true })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Close Guide", exact: true })
      .click();
  await page.getByLabel("Fixture provider", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByLabel("Fixture provider", { exact: true })
      .locator("option")
      .count(),
    5,
  );
  await page
    .getByLabel("Fixture provider", { exact: true })
    .selectOption("openfootapi");
  await page
    .getByText("No upcoming matches cached for this provider.", {
      exact: false,
    })
    .waitFor();
  await page
    .getByRole("button", { name: "Refresh fixtures", exact: true })
    .click();
  await page
    .getByText("The provider rejected the key.", { exact: false })
    .waitFor();
  assert.equal(providerSyncs, 1);
  await page
    .getByLabel("Fixture provider", { exact: true })
    .selectOption("thesportsdb");
  await page
    .getByText("Uses the shared free key automatically.", { exact: false })
    .waitFor();
  await page.reload();
  await page.getByLabel("Fixture provider", { exact: true }).waitFor();
  assert.equal(
    await page.getByLabel("Fixture provider", { exact: true }).inputValue(),
    "thesportsdb",
  );
  for (const lang of ["ar", "en"]) {
    await locale(lang);
    await page.goto(`${base}/${lang}/admin/events`);
    const label = lang === "ar" ? "مصدر المباريات" : "Fixture provider";
    await page.getByLabel(label, { exact: true }).waitFor();
    for (const width of [320, 375, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      await fits();
    }
    for (const provider of ["365scores-widget", "sportscore-widget"]) {
      await page.getByLabel(label, { exact: true }).selectOption(provider);
      await page
        .getByText(
          lang === "ar" ? "عرض جدول المباريات فقط" : "Schedule viewing only",
          { exact: true },
        )
        .waitFor();
      await page
        .frameLocator("iframe")
        .getByText("Saudi schedule test", { exact: true })
        .waitFor();
      assert.equal(
        await page
          .getByRole("button", {
            name: lang === "ar" ? "تحديث المباريات" : "Refresh fixtures",
            exact: true,
          })
          .count(),
        0,
      );
      if (provider === "365scores-widget") {
        assert.equal(
          await page.locator("iframe").getAttribute("sandbox"),
          "allow-scripts allow-popups",
        );
        assert(
          (await page.locator("iframe").getAttribute("srcdoc")).includes(
            `lang="${lang}"`,
          ),
        );
      }
      await page
        .getByRole("button", {
          name: lang === "ar" ? "إعادة تحميل الأداة" : "Reload widget",
          exact: true,
        })
        .click();
      await page
        .frameLocator("iframe")
        .getByText("Saudi schedule test", { exact: true })
        .waitFor();
      await page.reload();
      await page
        .getByText(
          lang === "ar" ? "عرض جدول المباريات فقط" : "Schedule viewing only",
          { exact: true },
        )
        .waitFor();
      assert.equal(
        await page.getByLabel(label, { exact: true }).inputValue(),
        provider,
      );
      assert.equal(providerSyncs, 1);
      for (const width of [375, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await fits();
      }
      await page.screenshot({
        path: join(artifactDir, `${provider}-${lang}.png`),
        fullPage: true,
      });
    }
  }
  await page
    .getByLabel("Fixture provider", { exact: true })
    .selectOption("api-football");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("button", { name: "Save match settings", exact: true })
    .click();
  await page.getByText("Action saved.", { exact: true }).waitFor();
  assert.equal(saved.fixtureId, "f");
  assert.equal(saved.paymentMode, "deposit");
  assert.equal(saved.amountMinor, 5000);
  await page
    .getByRole("button", { name: "Record payment received", exact: true })
    .click();
  await page.getByText("Collected · 50.00 SAR", { exact: true }).waitFor();
  assert.equal(paid, 1);
  await page.goto(`${base}/en/events/demo#${token}`);
  await page
    .getByRole("heading", { name: "Your reservation · Confirmed" })
    .waitFor();
  await page
    .getByRole("button", { name: "Cancel reservation", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Your reservation · Cancelled" })
    .waitFor();
  assert.equal(cancelled, 1);
  assert.deepEqual(errors, []);
  console.log(
    "Passed: five sources, Arabic/English, six viewport widths, widget isolation/reload/persistence, invalid key, table availability, cashier-only booking, private receipt, settings, collection and cancellation.",
  );
} catch (error) {
  console.log((await page.locator("body").innerText()).slice(0, 5000));
  await page.screenshot({
    path: join(artifactDir, "events-debug.png"),
    fullPage: true,
  });
  throw error;
} finally {
  await browser.close();
}
