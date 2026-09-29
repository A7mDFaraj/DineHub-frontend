import { test, expect, type Page } from "@playwright/test";
const branchId = "11111111-1111-4111-8111-111111111111";
const tableId = "22222222-2222-4222-8222-222222222222";
const productId = "33333333-3333-4333-8333-333333333333";
const token = "test_tracking_token_123456789";
type Mode = "ok" | "lost" | "price" | "sold" | "rate" | "malformed" | "server";
async function fixture(page: Page) {
  page.on("pageerror", (error) =>
    console.error("Customer page error:", error.message),
  );
  const state = {
    mode: "ok" as Mode,
    price: 99.75,
    available: true,
    posts: [] as {
      key: string;
      payload: {
        items: {
          productId: string;
          quantity: number;
          expectedUnitPrice: number;
        }[];
        note?: string;
        branchId: string;
        tableId: string;
      };
    }[],
    table: true,
    status: "pending",
    failTracking: false,
    failRating: false,
    rating: 0,
    delay: 0,
  };
  const staffOrder = () => ({
    id: "44444444-4444-4444-8444-444444444444",
    orderNumber: 42,
    publicToken: token,
    status: state.status,
    createdAt: "2026-09-28T12:00:00Z",
    table: { number: 7 },
    note: state.posts[0]?.payload.note,
    items:
      state.posts[0]?.payload.items.map((item) => ({
        ...item,
        product: { nameAr: "برجر", nameEn: "Burger" },
      })) ?? [],
  });
  await page.route(
    "https://dinehub-backend-42eq.onrender.com/**",
    async (route) => {
      const request = route.request(),
        path = new URL(request.url()).pathname;
      const send = (
        body: unknown,
        status = 200,
        headers: Record<string, string> = {},
      ) =>
        route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(body),
          headers: {
            "access-control-expose-headers": "Retry-After",
            ...headers,
          },
        });
      if (request.method() === "OPTIONS") return send({});
      if (path.endsWith("/auth/get-session"))
        return send({
          session: {
            id: "session",
            userId: "staff",
            expiresAt: "2099-01-01T00:00:00Z",
            token: "test",
          },
          user: {
            id: "staff",
            name: "Test staff",
            role: "cashier",
            branchId,
            email: "staff@example.test",
            emailVerified: true,
          },
        });
      if (path.endsWith("/access/me"))
        return send({
          role: "cashier",
          branchId,
          permissions: [
            "orders.read",
            "orders.prepare",
            "orders.ready",
            "orders.deliver",
          ],
        });
      if (path.endsWith("/staff/branches"))
        return send([{ id: branchId, name: "Test restaurant" }]);
      if (path.endsWith("/status") && request.method() === "PATCH") {
        state.status = request.postDataJSON().status;
        return send(staffOrder());
      }
      if (path.endsWith("/history"))
        return send({
          items: state.status === "delivered" ? [staffOrder()] : [],
          nextCursor: null,
        });
      if (path.endsWith(`/staff/orders/${branchId}`))
        return send(state.status === "delivered" ? [] : [staffOrder()]);
      if (path.endsWith("/stream")) return route.abort();
      if (path.includes("/menu/"))
        return send({
          branch: {
            id: branchId,
            publicCode: "test-menu",
            nameAr: "مطعم الاختبار",
            nameEn: "Test restaurant",
          },
          categories: [
            {
              id: "category",
              nameAr: "الأطباق",
              nameEn: "Dishes",
              products: [
                {
                  id: productId,
                  nameAr: "برجر",
                  nameEn: "Burger",
                  price: state.price,
                  isAvailable: state.available,
                  attributes: [
                    {
                      attribute: {
                        id: "sauce",
                        labelAr: "صلصة",
                        labelEn: "Sauce",
                      },
                    },
                  ],
                },
              ],
            },
          ],
        });
      if (path.includes("/table/"))
        return state.table
          ? send({ id: tableId, branchId, number: 7 })
          : send({ code: "TABLE" }, 404);
      if (path.endsWith("/orders") && request.method() === "POST") {
        const payload = request.postDataJSON();
        expect(payload.branchId).toBe(branchId);
        expect(payload.tableId).toBe(tableId);
        expect(payload.items.length).toBeGreaterThan(0);
        expect(payload.items.length).toBeLessThanOrEqual(100);
        expect(
          new Set(payload.items.map((i: { productId: string }) => i.productId))
            .size,
        ).toBe(payload.items.length);
        for (const item of payload.items) {
          expect(item.productId).toBe(productId);
          expect(Number.isInteger(item.quantity)).toBe(true);
          expect(item.quantity).toBeLessThanOrEqual(99);
          expect(item.expectedUnitPrice).toBeGreaterThanOrEqual(0);
        }
        expect((payload.note ?? "").length).toBeLessThanOrEqual(5000);
        state.posts.push({
          key: request.headers()["idempotency-key"],
          payload,
        });
        if (state.delay)
          await new Promise((resolve) => setTimeout(resolve, state.delay));
        if (state.mode === "lost") return route.abort("connectionreset");
        if (state.mode === "malformed") return send({ accepted: true }, 201);
        if (state.mode === "server")
          return send({ message: "internal database failure" }, 500);
        if (state.mode === "price") return send({ code: "PRICE_CHANGED" }, 409);
        if (state.mode === "sold")
          return send({ code: "UNAVAILABLE", productId }, 400);
        if (state.mode === "rate")
          return send({ code: "RATE_LIMIT" }, 429, { "retry-after": "1" });
        return send({ trackingPath: `/order/${token}` }, 201);
      }
      if (path.endsWith("/rating")) {
        if (state.failRating) return send({}, 500);
        state.rating = request.postDataJSON().rating;
        return send({ rating: state.rating });
      }
      if (path.includes("/orders/"))
        return state.failTracking
          ? send({}, 500)
          : send({
              publicToken: token,
              orderNumber: 42,
              status: state.status,
              rating: state.rating,
              createdAt: new Date().toISOString(),
              menuPath: "/menu/test-menu/7",
              trackingPath: `/order/${token}`,
              table: { number: 7 },
              items: [{ quantity: 2, nameAr: "برجر", nameEn: "Burger" }],
            });
      return send({});
    },
  );
  return state;
}
async function add(
  page: Page,
  ar: boolean,
  note: string,
  takeaway = false,
) {
  await page
    .getByRole("button", {
      name: ar ? "إضافة برجر" : "Add Burger",
      exact: true,
    })
    .click();
  if (takeaway) {
    await page
      .getByRole("button", {
        name: ar ? "سفري" : "Takeaway",
        exact: true,
      })
      .click();
  }
  await page.locator("#product-note").fill(note);
  await page
    .getByRole("button", { name: ar ? /إضافة إلى السلة/ : /Add to Cart/ })
    .click();
}
async function cart(page: Page, ar: boolean) {
  await page
    .getByRole("button", { name: ar ? /عرض السلة/ : /View Cart/ })
    .click();
}
for (const ar of [true, false]) {
  test(`${ar ? "Arabic" : "English"} customized portions submit one dish with precise notes`, async ({
    page,
  }, testInfo) => {
    const state = await fixture(page);
    await page.goto(`${ar ? "" : "/en"}/menu/test-menu/7`);
    await add(page, ar, "No onion");
    await add(page, ar, "Extra sauce", true);
    await page.reload();
    await cart(page, ar);
    await expect(page.getByText("No onion", { exact: true })).toBeVisible();
    await expect(
      page.getByText(ar ? "سفري" : "Takeaway", { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("cart.png"),
      fullPage: true,
    });
    for (const width of [320, 375, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 850 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(
        page.getByRole("button", {
          name: ar ? "إرسال الطلب إلى المطبخ" : "Send Order to Kitchen",
          exact: true,
        }),
      ).toBeInViewport();
    }
    await page
      .getByRole("button", {
        name: ar ? "إرسال الطلب إلى المطبخ" : "Send Order to Kitchen",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(new RegExp(`/order/${token}$`));
    expect(state.posts).toHaveLength(1);
    expect(state.posts[0].payload.items).toEqual([
      { productId, quantity: 2, expectedUnitPrice: 99.75 },
    ]);
    expect(state.posts[0].payload.note).toContain("No onion");
    expect(state.posts[0].payload.note).toContain("Extra sauce");
    expect(state.posts[0].payload.note).toContain(ar ? "سفري" : "Takeaway");
  });
}
for (const mode of ["lost", "malformed", "server"] as const) {
  test(`${mode}: refresh preserves pending payload and key`, async ({
    page,
  }) => {
    const state = await fixture(page);
    state.mode = mode;
    await page.goto("/en/menu/test-menu/7");
    await add(page, false, "Keep this instruction");
    await cart(page, false);
    await page
      .getByRole("button", { name: "Send Order to Kitchen", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Check order confirmation" }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator("#cart-note")).toBeDisabled();
    state.mode = "ok";
    await page
      .getByRole("button", { name: "Check order confirmation" })
      .click();
    await expect(page).toHaveURL(new RegExp(`/order/${token}$`));
    expect(state.posts).toHaveLength(2);
    expect(state.posts[1]).toEqual(state.posts[0]);
  });
}
test("price changes need consent; sold out items stay in cart", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto("/en/menu/test-menu/7");
  await add(page, false, "No onion");
  await cart(page, false);
  state.mode = "price";
  state.price = 105;
  await page
    .getByRole("button", { name: "Send Order to Kitchen", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Refresh menu and keep cart" })
    .click();
  await expect(
    page.getByRole("button", { name: "I reviewed and accept the new prices" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Send Order to Kitchen", exact: true })
    .click();
  expect(state.posts).toHaveLength(1);
  await page
    .getByRole("button", { name: "I reviewed and accept the new prices" })
    .click();
  state.mode = "sold";
  state.available = false;
  await page
    .getByRole("button", { name: "Send Order to Kitchen", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Refresh menu and keep cart" })
    .click();
  await expect(page.getByText("No onion", { exact: true })).toBeVisible();
  await expect(
    page
      .getByText(
        "This dish is no longer available. Remove it or choose another.",
        { exact: true },
      )
      .first(),
  ).toBeVisible();
});
test("edit, remove and undo keep instructions", async ({ page }) => {
  await fixture(page);
  await page.goto("/en/menu/test-menu/7");
  await add(page, false, "Original");
  await cart(page, false);
  await page.getByRole("button", { name: "Edit options and notes" }).click();
  await expect(page.locator("#product-note")).toHaveValue("Original");
  await page.locator("#product-note").fill("Updated");
  await page.getByRole("button", { name: /Save changes/ }).click();
  await expect(page.getByText("Updated", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Decrease quantity" }).click();
  await page.getByRole("button", { name: "Undo removed dish" }).click();
  await expect(page.getByText("Updated", { exact: true })).toBeVisible();
});
test("invalid table never allows ordering", async ({ page }) => {
  const state = await fixture(page);
  state.table = false;
  await page.goto("/en/menu/test-menu/7");
  await expect(
    page.getByText("Could not verify table. Please re-scan table QR code."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add Burger", exact: true }),
  ).toHaveCount(0);
  expect(state.posts).toHaveLength(0);
});

test("kitchen sees combined quantity and all instructions through handoff", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto("/en/menu/test-menu/7");
  await add(page, false, "No onion");
  await add(page, false, "Extra sauce", true);
  await cart(page, false);
  await expect(page.getByText("Takeaway", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Send Order to Kitchen", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/order/${token}$`));
  await page.goto("/en/staff");
  await expect(page.getByText("1× Burger", { exact: true })).toHaveCount(2);
  await expect(page.getByText("Takeaway", { exact: true })).toBeVisible();
  await expect(page.getByText("No onion", { exact: true })).toBeVisible();
  await expect(page.getByText("Extra sauce", { exact: true })).toBeVisible();
  expect(state.posts[0].payload.items).toEqual([
    { productId, quantity: 2, expectedUnitPrice: 99.75 },
  ]);
  await page.getByRole("button", { name: "Accept & Start Prep" }).click();
  await page
    .getByRole("button", { name: "Ready for Pickup", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm Handover" }).click();
  await expect.poll(() => state.status).toBe("delivered");
});

test("rate limiting after an uncertain result keeps the original key", async ({
  page,
}) => {
  const state = await fixture(page);
  state.mode = "lost";
  await page.goto("/en/menu/test-menu/7");
  await add(page, false, "Preserve");
  await cart(page, false);
  await page
    .getByRole("button", { name: "Send Order to Kitchen", exact: true })
    .click();
  state.mode = "rate";
  await page.getByRole("button", { name: "Check order confirmation" }).click();
  await expect(page.locator("#cart-note")).toBeDisabled();
  await expect.poll(() => state.posts.length).toBe(2);
  await page.reload();
  state.mode = "ok";
  await page.getByRole("button", { name: "Check order confirmation" }).click();
  await expect(page).toHaveURL(new RegExp(`/order/${token}$`));
  expect(new Set(state.posts.map((post) => post.key)).size).toBe(1);
});

test("language switching retains selected options and configuration identity", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/en/menu/test-menu/7");
  await page.getByRole("button", { name: "Add Burger", exact: true }).click();
  await page.getByRole("button", { name: "Sauce", exact: true }).click();
  await page.getByRole("button", { name: /Add to Cart/ }).click();
  await page.goto("/menu/test-menu/7");
  await page.getByRole("button", { name: "إضافة برجر", exact: true }).click();
  await page.getByRole("button", { name: "صلصة", exact: true }).click();
  await page.getByRole("button", { name: /إضافة إلى السلة/ }).click();
  await cart(page, true);
  await expect(page.getByRole("dialog").locator("article")).toHaveCount(1);
  await expect(page.getByText("صلصة", { exact: true })).toBeVisible();
});

test("slow checkout locks edits and double taps submit once", async ({
  page,
}) => {
  const state = await fixture(page);
  state.delay = 1200;
  await page.goto("/en/menu/test-menu/7");
  await add(page, false, "Slow");
  await cart(page, false);
  const submit = page.getByRole("button", {
    name: "Send Order to Kitchen",
    exact: true,
  });
  await submit.click();
  await expect(page.locator("#cart-note")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Decrease quantity" }),
  ).toBeDisabled();
  await expect(page).toHaveURL(new RegExp(`/order/${token}$`));
  expect(state.posts).toHaveLength(1);
});

test("keyboard dialog focus, search recovery and large text remain usable", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/en/menu/test-menu/7");
  await page.getByRole("button", { name: "Add Burger", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Add Burger", exact: true }),
  ).toBeFocused();
  const search = page.getByRole("searchbox");
  await search.fill("no matching dish");
  await expect(
    page.getByRole("button", { name: "Add Burger", exact: true }),
  ).toHaveCount(0);
  await search.fill("Burger");
  await add(page, false, "Long note ".repeat(45));
  await cart(page, false);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await page.setViewportSize({ width: 375, height: 500 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Send Order to Kitchen", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("button", { name: "Send Order to Kitchen", exact: true }),
  ).toBeInViewport();
});

test("tracking retains state during failures and never regresses; rating retry retains selection", async ({
  page,
}) => {
  const state = await fixture(page);
  state.status = "ready";
  await page.goto(`/en/order/${token}`);
  await expect(page.getByText("#0042", { exact: true })).toBeVisible();
  state.failTracking = true;
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  await expect(page.getByText("#0042", { exact: true })).toBeVisible();
  state.failTracking = false;
  state.status = "pending";
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Order is ready!", exact: true }),
  ).toBeVisible();
  state.status = "delivered";
  state.failRating = true;
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );
  await page.getByRole("button", { name: /5 \/ 5/ }).click();
  await expect(
    page.getByRole("button", { name: "Retry rating (5/5)" }),
  ).toBeVisible();
  state.failRating = false;
  await page.getByRole("button", { name: "Retry rating (5/5)" }).click();
  await expect(page.getByRole("button", { name: /5 \/ 5/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(state.rating).toBe(5);
});
