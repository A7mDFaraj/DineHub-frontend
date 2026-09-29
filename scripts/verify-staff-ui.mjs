import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const base = process.env.FRONTEND_TEST_URL || "http://localhost:3000";
const output = process.env.STAFF_SCREENSHOT_DIR || "test-results/staff";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
page.setDefaultTimeout(15000);
page.setDefaultNavigationTimeout(30000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
let permissions = [
  "orders.read",
  "orders.prepare",
  "orders.ready",
  "orders.deliver",
  "dashboard.read",
  "events.read",
];
let failUpdate = false,
  failOrders = false,
  delay = false,
  updates = 0,
  protectedReads = 0;
const makeOrder = (id, status, note) => ({
  id,
  orderNumber: Number(id),
  status,
  createdAt: new Date(Date.now() - 7 * 60000).toISOString(),
  table: { number: 7 },
  note,
  items: [
    {
      productId: "p",
      quantity: 2,
      product: { nameEn: "Smash burger", nameAr: "برجر لحم طازج" },
    },
    {
      productId: "c",
      quantity: 1,
      product: { nameEn: "Flat white", nameAr: "فلات وايت" },
    },
  ],
});
let orders = [
  makeOrder(
    "42",
    "pending",
    "تفاصيل التحضير:\n• 1× برجر لحم طازج: سفري — إضافة مختارة: جبن إضافي — ملاحظة خاصة: بدون بصل، الصوص على الجانب\n• 1× برجر لحم طازج: بدون تخصيص\n\nملاحظات عامة: تقديم المشروبات أولاً",
  ),
  makeOrder(
    "43",
    "preparing",
    "Preparation details:\n• 2× Smash burger: Special note: No onion\n\nGeneral notes: Bring drinks first",
  ),
  makeOrder("44", "ready", ""),
];
await page.route(
  "https://dinehub-backend-42eq.onrender.com/**",
  async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    const send = (body, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (request.method() === "OPTIONS") return send({});
    if (path.endsWith("/auth/get-session"))
      return send({
        session: {
          id: "s",
          userId: "u",
          token: "test",
          expiresAt: "2099-01-01T00:00:00Z",
        },
        user: {
          id: "u",
          name: "Ahmed",
          email: "staff@example.test",
          role: "cashier",
          emailVerified: true,
        },
      });
    if (path.endsWith("/access/me"))
      return send({
        id: "u",
        businessId: "b",
        businessName: "DineHub Kitchen",
        role: "cashier",
        branchId: "b",
        permissions,
      });
    if (path.endsWith("/staff/branches"))
      return send([{ id: "b", nameAr: "فرع السلام", nameEn: "Alsalam" }]);
    if (path.endsWith("/stream"))
      return route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: ": connected\n\n",
      });
    if (path.endsWith("/history"))
      return send({
        data: orders.filter((o) => o.status === "delivered"),
        nextCursor: null,
      });
    if (path.endsWith("/status")) {
      updates++;
      if (delay) await new Promise((resolve) => setTimeout(resolve, 400));
      if (failUpdate) return send({ message: "Failed" }, 500);
      const order = orders.find((o) => path.includes(`/${o.id}/`));
      order.status = request.postDataJSON().status;
      return send(order);
    }
    if (path.endsWith("/staff/orders/b"))
      return send(
        orders.filter((o) => o.status !== "delivered"),
        failOrders ? 500 : 200,
      );
    if (path.includes("/admin/")) protectedReads++;
    return send({});
  },
);

try {
  for (const locale of ["ar", "en"]) {
    console.log(`Checking ${locale} order workflow`);
    await page
      .context()
      .addCookies([{ name: "NEXT_LOCALE", value: locale, url: base }]);
    await page.goto(`${base}/${locale}/staff`);
    await page.getByRole("article").first().waitFor();
    assert.equal(await page.getByRole("article").count(), 3);
    for (const width of [320, 375, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1100 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${locale}: overflow at ${width}`,
      );
      assert(
        await page
          .locator(".staff-ticket")
          .first()
          .evaluate((el) => el.scrollWidth <= el.clientWidth),
        `${locale}: ticket overflow at ${width}`,
      );
      if ([375, 1440, 1920].includes(width))
        await page.screenshot({
          path: `${output}/${locale}-${width}.png`,
          fullPage: true,
        });
    }
    const collapseName =
      locale === "ar" ? "تصغير القائمة الجانبية" : "Collapse sidebar";
    const expandName =
      locale === "ar" ? "توسيع القائمة الجانبية" : "Expand sidebar";
    const widthBefore = (await page.locator("#admin-main").boundingBox()).width;
    await page.getByRole("button", { name: collapseName, exact: true }).focus();
    await page.keyboard.press("Enter");
    const expand = page.getByRole("button", { name: expandName, exact: true });
    assert.equal(await expand.getAttribute("aria-expanded"), "false");
    assert.equal(
      Math.round(
        (await page.locator("#admin-main").boundingBox()).width - widthBefore,
      ),
      184,
    );
    assert(
      await page
        .locator("#dashboard-sidebar nav a")
        .evaluateAll((links) =>
          links.every(
            (link) =>
              link.getAttribute("aria-label") && link.getAttribute("title"),
          ),
        ),
    );
    for (const width of [320, 375, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1100 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${locale} collapsed sidebar overflow at ${width}`,
      );
      if (width <= 768) assert.equal(await expand.isVisible(), false);
      else {
        const box = await expand.boundingBox();
        assert(box.width >= 44 && box.height >= 44);
      }
    }
    await page.screenshot({
      path: `${output}/${locale}-sidebar-collapsed.png`,
    });
    await page.reload();
    await expand.waitFor();
    await page.goto(`${base}/${locale}/admin`);
    await expand.waitFor();
    await page.goto(`${base}/${locale}/staff`);
    await expand.waitFor();
    await page.setViewportSize({ width: 375, height: 900 });
    await page
      .getByRole("button", { name: /navigation|menu|قائمة/i })
      .filter({ visible: true })
      .first()
      .click();
    await page.getByRole("dialog").waitFor();
    assert(
      await page.getByRole("dialog").locator("nav a span").last().isVisible(),
    );
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 1920, height: 1100 });
    await expand.focus();
    await page.keyboard.press("Space");
    assert.equal(
      await page
        .getByRole("button", { name: collapseName, exact: true })
        .getAttribute("aria-expanded"),
      "true",
    );
    const ticket = page.getByRole("article").first();
    const modifiers = ticket.getByRole("region", {
      name:
        locale === "ar" ? "الإضافات والخيارات المختارة" : "Modifiers & add-ons",
    });
    assert(await modifiers.getByText("جبن إضافي", { exact: true }).isVisible());
    assert.equal(await modifiers.locator(".staff-special-note").count(), 0);
    assert(
      await ticket
        .getByText(locale === "ar" ? "ملاحظة خاصة" : "Special note", {
          exact: true,
        })
        .isVisible(),
    );
    assert(
      await ticket
        .getByText(locale === "ar" ? "ملاحظة عامة" : "General note", {
          exact: true,
        })
        .isVisible(),
    );
    assert(
      await ticket
        .getByText(locale === "ar" ? "سفري" : "Takeaway", { exact: true })
        .isVisible(),
    );
    await page.getByRole("searchbox").fill("0042");
    assert.equal(await page.getByRole("article").count(), 1);
    await page.getByRole("searchbox").fill("no matches");
    await page
      .getByText(
        locale === "ar" ? "لا توجد طلبات مطابقة" : "No matching orders",
        { exact: true },
      )
      .waitFor();
    await page.getByRole("searchbox").fill("");
  }
  // Confirm mutation failure keeps the ticket visible and retry is single-flight.
  failUpdate = true;
  await page.locator(".staff-ticket-action").first().click();
  await page.locator("main [role=alert]").waitFor();
  assert.equal(orders[0].status, "pending");
  failUpdate = false;
  delay = true;
  await page.locator(".staff-ticket-action").first().click();
  assert(await page.locator(".staff-ticket-action").first().isDisabled());
  await page.locator("article[data-status=preparing]").nth(1).waitFor();
  assert.equal(updates, 2);
  const transitioned = page.getByRole("article", {
    name: "Order 0042",
    exact: true,
  });
  await transitioned
    .getByRole("button", { name: "Ready for Pickup", exact: true })
    .click();
  await transitioned
    .getByRole("button", { name: "Confirm Handover", exact: true })
    .waitFor();
  await transitioned
    .getByRole("button", { name: "Confirm Handover", exact: true })
    .click();
  await transitioned.waitFor({ state: "hidden" });
  await page.locator('.staff-filters button[data-status="delivered"]').click();
  await transitioned.waitFor();
  assert.equal(await transitioned.getByRole("button").count(), 0);
  await page.locator('.staff-filters button[data-status="active"]').click();
  // Data failures remain recoverable without discarding last confirmed orders.
  failOrders = true;
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await page.locator("main [role=alert]").waitFor();
  assert.equal(await page.getByRole("article").count(), 2);
  failOrders = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.locator("main [role=alert]").waitFor({ state: "hidden" });
  // Cashier sees only explicitly permitted navigation and dashboard shortcuts.
  await page.goto(`${base}/en/admin`);
  await page.locator("nav").first().waitFor();
  assert.equal(await page.locator('a[href$="/admin/users"]').count(), 0);
  assert.equal(await page.locator('a[href$="/admin/menu"]').count(), 0);
  assert.equal(await page.locator('a[href$="/admin/branches"]').count(), 0);
  assert.equal(protectedReads, 0);
  await page.goto(`${base}/en/admin/users`);
  await page.locator("main [role=alert]").waitFor();
  assert.equal(protectedReads, 0);
  permissions = ["orders.read"];
  await page.goto(`${base}/en/staff`);
  await page.getByRole("article").first().waitFor();
  assert.equal(await page.locator(".staff-ticket-action").count(), 0);
  assert.equal(await page.locator('nav a[href$="/admin"]').count(), 0);
  await page.setViewportSize({ width: 375, height: 900 });
  await page
    .getByRole("button", { name: /navigation|menu/i })
    .first()
    .click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator(".staff-refresh")
      .evaluate((el) => getComputedStyle(el).transitionDuration),
    "0s",
  );
  orders = [];
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await page.locator(".staff-board-empty").waitFor();
  // Exercise a busy kitchen, not just the three sample tickets above.
  orders = Array.from({ length: 720 }, (_, index) => {
    const status =
      index >= 600 ? "delivered" : ["pending", "preparing", "ready"][index % 3];
    const order = makeOrder(
      String(1000 + index),
      status,
      index % 2
        ? ""
        : "Preparation details:\n• 2× Smash burger: Selected option: Extra cheese — Selected option: Large portion — Special note: No onion\nSauce separately\n\nGeneral notes: Bring drinks first",
    );
    if (index % 5 === 0) {
      order.items.push({
        productId: `long-${index}`,
        quantity: 99,
        product: {
          nameAr: "طبق مع اسم طويل جداً ".repeat(8),
          nameEn: "Very long dish name ".repeat(8),
        },
        selectedAttributes: ["Extra sauce", "X".repeat(160)],
        note: "ملاحظة خاصة طويلة ".repeat(20),
      });
    }
    if (status === "delivered") order.deliveredAt = new Date().toISOString();
    return order;
  });
  for (const locale of ["ar", "en"]) {
    await page
      .context()
      .addCookies([{ name: "NEXT_LOCALE", value: locale, url: base }]);
    await page.goto(`${base}/${locale}/staff`);
    await page.locator(".staff-pagination").first().waitFor();
    assert.equal(await page.getByRole("article").count(), 24);
    assert.equal(
      await page
        .locator(".staff-filters [data-status=active] strong")
        .innerText(),
      "600",
    );
    assert.equal(
      await page.locator(".staff-filters [data-status=all] strong").innerText(),
      "720",
    );
    for (const width of [320, 375, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${locale} backlog document overflow at ${width}`,
      );
      assert(
        await page
          .locator(".staff-ticket")
          .evaluateAll((cards) =>
            cards.every((card) => card.scrollWidth <= card.clientWidth),
          ),
        `${locale} backlog ticket overflow at ${width}`,
      );
      assert(
        await page
          .locator(".staff-pagination")
          .evaluateAll((navs) =>
            navs.every((nav) => nav.scrollWidth <= nav.clientWidth),
          ),
        `${locale} pagination overflow at ${width}`,
      );
      await page.locator(".staff-pagination").last().scrollIntoViewIfNeeded();
      assert(await page.locator(".staff-pagination").last().isVisible());
      await page.locator(".staff-board-toolbar").scrollIntoViewIfNeeded();
      if ([375, 1920].includes(width))
        await page.screenshot({
          path: `${output}/${locale}-busy-${width}.png`,
        });
    }
    // Search must find an order outside the current page.
    await page.getByRole("searchbox").fill("1599");
    assert.equal(await page.getByRole("article").count(), 1);
    assert.match(await page.getByRole("article").first().innerText(), /1599/);
    await page.getByRole("searchbox").fill("");
    await page.locator(".staff-filters [data-status=pending]").click();
    assert.equal(await page.getByRole("article").count(), 24);
    await page
      .locator(".staff-pagination")
      .first()
      .getByRole("button")
      .last()
      .click();
    assert.equal(await page.getByRole("article").count(), 24);
    assert.match(
      await page.locator(".staff-page-number").first().innerText(),
      /2/,
    );
    await page.locator(".staff-filters [data-status=all]").click();
    assert.match(
      await page.locator(".staff-page-number").first().innerText(),
      /1/,
    );
  }
  // Traverse every ticket, including history, with no duplicates or omissions.
  const visited = new Set();
  for (let current = 0; current < 30; current++) {
    const labels = await page
      .getByRole("article")
      .evaluateAll((cards) =>
        cards.map((card) => card.getAttribute("aria-label")),
      );
    assert.equal(labels.length, 24);
    labels.forEach((label) => {
      assert(!visited.has(label), `Repeated ${label}`);
      visited.add(label);
    });
    if (current < 29)
      await page
        .locator(".staff-pagination")
        .first()
        .getByRole("button")
        .last()
        .click();
  }
  assert.equal(visited.size, 720);
  assert(
    await page
      .locator(".staff-pagination")
      .first()
      .getByRole("button")
      .last()
      .isDisabled(),
  );
  // A remote delivery shrinks the final pending page: stay on a valid page.
  await page.locator(".staff-filters [data-status=pending]").click();
  for (let current = 0; current < 8; current++)
    await page
      .locator(".staff-pagination")
      .first()
      .getByRole("button")
      .last()
      .click();
  assert.equal(await page.getByRole("article").count(), 8);
  orders
    .filter((order) => order.status === "pending")
    .slice(-8)
    .forEach((order) => {
      order.status = "delivered";
    });
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await page.waitForFunction(
    () => document.querySelectorAll(".staff-ticket").length === 24,
  );
  assert.match(
    await page.locator(".staff-page-number").first().innerText(),
    /8 of 8/,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: Arabic/English, six widths, notes, search, transitions, loading, retry, empty state, reduced motion, mobile navigation, and cashier permissions.",
  );
  console.log(
    "PASS: 600 active + 120 delivered orders, 12 locale/viewport combinations, all 720 tickets reachable, 24-ticket DOM bound, long content, cross-page search, filters and shrinking queues.",
  );
} catch (error) {
  console.error((await page.locator("body").innerText()).slice(0, 2000));
  await page.screenshot({ path: `${output}/failure.png` });
  throw error;
} finally {
  await browser.close();
}
