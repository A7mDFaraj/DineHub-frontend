import { test, expect, type Page } from "@playwright/test";
const branchId = "11111111-1111-4111-8111-111111111111";
const categoryId = "22222222-2222-4222-8222-222222222222";
async function setup(page: Page, locale = "en") {
  page.on("console", (message) => {
    if (message.text().startsWith("Browser OCR failed:"))
      console.log(message.text());
  });
  await page.context().addCookies([
    {
      name: "dinehub_admin_guide",
      value: "v1",
      url: "http://localhost:3101",
    },
  ]);
  const posts: Record<string, unknown>[] = [];
  const state = { fail: false };
  await page.route(
    "https://dinehub-backend-42eq.onrender.com/**",
    async (route) => {
      const path = new URL(route.request().url()).pathname;
      let data: unknown = [];
      if (path.includes("/auth/get-session"))
        data = {
          user: {
            id: "test-user",
            name: "Test Owner",
            email: "test@example.invalid",
            emailVerified: true,
          },
          session: {
            id: "test-session",
            userId: "test-user",
            expiresAt: "2099-01-01T00:00:00Z",
          },
        };
      else if (path === "/api/access/me")
        data = {
          id: "test-user",
          businessId: "test-business",
          permissions: [
            "menu.read",
            "menu.create",
            "categories.read",
            "categories.create",
            "branches.read",
            "branches.all",
          ],
        };
      else if (path === "/api/staff/branches")
        data = [
          {
            id: branchId,
            name: "Test branch",
            nameAr: "فرع الاختبار",
            nameEn: "Test branch",
          },
        ];
      else if (path.includes("/admin/categories/"))
        data = [{ id: categoryId, nameAr: "مشروبات", nameEn: "Drinks" }];
      else if (path === "/api/admin/menu-imports") {
        posts.push(route.request().postDataJSON());
        if (state.fail) return route.abort("failed");
        data = {
          productsCreated: 1,
          categoriesCreated: 0,
          productIds: ["test-product"],
        };
      }
      await route.fulfill({ json: data });
    },
  );
  await page.goto(`/${locale}/admin/menu`);
  await page
    .getByRole("button", {
      name: locale === "ar" ? "استيراد من صورة" : "Import photo",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByText(
      locale === "ar" ? "جارٍ تحميل القائمة الحالية…" : "Loading current menu…",
      { exact: true },
    ),
  ).toHaveCount(0);
  return { posts, state };
}
async function manualItem(page: Page, locale = "en") {
  const label = (en: string, ar: string) => (locale === "ar" ? ar : en);
  await page
    .getByRole("button", {
      name: label("Add category mapping", "إضافة تصنيف للمطابقة"),
      exact: true,
    })
    .click();
  await page
    .getByRole("combobox", {
      name: label("Use category", "استخدام تصنيف"),
      exact: true,
    })
    .selectOption(categoryId);
  await page
    .getByRole("button", {
      name: label("Add missed item", "إضافة صنف لم تتم قراءته"),
      exact: true,
    })
    .click();
  await page
    .getByLabel(label("Arabic name *", "الاسم العربي *"), { exact: true })
    .fill("عصير برتقال");
  await page
    .getByLabel(label("English name", "الاسم الإنجليزي"), { exact: true })
    .fill("Orange juice");
  await page
    .getByLabel(label("Price (SAR) *", "السعر (ر.س) *"), { exact: true })
    .fill("15.50");
  await page
    .getByLabel(label("Calories (kcal)", "السعرات الحرارية"), { exact: true })
    .fill("120");
}
test("review is required and failed requests reuse the identical batch after reopening", async ({
  page,
}) => {
  const { posts, state } = await setup(page);
  await manualItem(page);
  await page.getByRole("button", { name: "Import 1 item" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Review each selected item",
  );
  expect(posts).toHaveLength(0);
  await page
    .getByLabel(
      "I checked the name, price, calories and category against the photo.",
    )
    .check();
  state.fail = true;
  await page.getByRole("button", { name: "Import 1 item" }).click();
  await expect(
    page.getByRole("button", { name: "Retry same import" }),
  ).toBeEnabled();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Import photo", exact: true }).click();
  await expect(
    page.getByText("An import is awaiting confirmation"),
  ).toBeVisible();
  state.fail = false;
  await page.getByRole("button", { name: "Retry same import" }).click();
  await expect(page.getByRole("status")).toContainText(
    "1 items imported successfully",
  );
  expect(posts).toHaveLength(2);
  expect(posts[0]).toEqual(posts[1]);
  expect((posts[0].items as Record<string, unknown>[])[0]).toMatchObject({
    nameAr: "عصير برتقال",
    price: "15.50",
    calories: 120,
  });
});
for (const locale of ["en", "ar"]) {
  test(`${locale} populated review fits required widths and offers native camera capture`, async ({
    page,
  }) => {
    await setup(page, locale);
    await manualItem(page, locale);
    await expect(page.locator('input[capture="environment"]')).toHaveCount(1);
    for (const width of [320, 375, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page
        .getByRole("dialog")
        .evaluate((el) => el.scrollWidth > el.clientWidth + 1);
      expect(overflow, `dialog overflow at ${width}`).toBe(false);
    }
    await page.setViewportSize({ width: 375, height: 900 });
    await page.screenshot({
      path: `test-results/menu-import-${locale}-mobile.png`,
      fullPage: true,
    });
  });
}
test("real browser OCR reads a clean menu fixture and keeps price separate from calories", async ({
  page,
}) => {
  await setup(page);
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1500;
    canvas.height = 650;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#fff";
    context.fillRect(0, 0, 1500, 650);
    context.fillStyle = "#000";
    context.font = "bold 64px Arial";
    context.fillText("Drinks", 70, 120);
    context.font = "48px Arial";
    context.fillText("Orange Juice 15 SAR 120 kcal", 70, 280);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "menu.png",
      mimeType: "image/png",
      buffer: Buffer.from(image, "base64"),
    });
  await page.getByLabel("Printed language").selectOption("eng");
  await expect(
    page.getByRole("button", { name: "Read menu", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Read menu", exact: true }).click();
  await expect(page.getByLabel("Price (SAR) *", { exact: true })).toHaveValue(
    "15",
    { timeout: 170000 },
  );
  await expect(page.getByLabel("Calories (kcal)", { exact: true })).toHaveValue(
    "120",
  );
  await expect(page.getByLabel("English name", { exact: true })).toHaveValue(
    "Orange Juice",
  );
  await expect(page.getByLabel("Arabic name *", { exact: true })).toHaveValue(
    "",
  );
  await expect(
    page.getByLabel(
      "I checked the name, price, calories and category against the photo.",
    ),
  ).not.toBeChecked();
  await page.screenshot({
    path: "test-results/menu-import-en-review.png",
    fullPage: true,
  });
});

test("real Arabic OCR preserves the source and supports correcting misread numerals before import", async ({
  page,
}) => {
  const { posts } = await setup(page);
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1500;
    canvas.height = 650;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#fff";
    context.fillRect(0, 0, 1500, 650);
    context.fillStyle = "#000";
    context.font = "bold 64px Arial";
    context.direction = "rtl";
    context.textAlign = "right";
    context.fillText("برجر", 1430, 120);
    context.font = "48px Arial";
    context.fillText("برجر لحم ٢٥ ر.س ٦٥٠ سعرة حرارية", 1430, 280);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "arabic-menu.png",
      mimeType: "image/png",
      buffer: Buffer.from(image, "base64"),
    });
  await page
    .getByRole("combobox", { name: "Printed language", exact: true })
    .selectOption("ara");
  await expect(
    page.getByRole("button", { name: "Read menu", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Read menu", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Cancel reading", exact: true }),
  ).toBeHidden({
    timeout: 170000,
  });
  await expect(page.locator("blockquote")).toContainText("برجر لحم");
  const observed = {
    nameAr: await page
      .getByLabel("Arabic name *", { exact: true })
      .inputValue(),
    price: await page.getByLabel("Price (SAR) *", { exact: true }).inputValue(),
    calories: await page
      .getByLabel("Calories (kcal)", { exact: true })
      .inputValue(),
  };
  const expected = { nameAr: "برجر لحم", price: "25", calories: "650" };
  await test.info().attach("arabic-accuracy.json", {
    body: JSON.stringify(
      {
        expected,
        observed,
        exactMatch: JSON.stringify(expected) === JSON.stringify(observed),
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  // Keep an opt-in strict accuracy gate; assisted-flow success is not OCR accuracy.
  if (process.env.OCR_STRICT_ACCURACY === "1")
    expect(observed).toEqual(expected);
  await page.getByRole("button", { name: "Import 1 item" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Review each selected item",
  );
  expect(posts).toHaveLength(0);
  await page.getByLabel("Arabic name *", { exact: true }).fill(expected.nameAr);
  await page.getByLabel("Price (SAR) *", { exact: true }).fill(expected.price);
  await page
    .getByLabel("Calories (kcal)", { exact: true })
    .fill(expected.calories);
  await page
    .getByLabel(
      "I checked the name, price, calories and category against the photo.",
    )
    .check();
  await page.getByRole("button", { name: "Import 1 item" }).click();
  await expect(page.getByRole("status")).toContainText(
    "1 items imported successfully",
  );
  expect((posts[0].items as Record<string, unknown>[])[0]).toMatchObject({
    nameAr: expected.nameAr,
    price: "25.00",
    calories: 650,
  });
});

test("invalid photos and failed model initialization recover without a save", async ({
  page,
}) => {
  const { posts } = await setup(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "photo.heic",
      mimeType: "image/heic",
      buffer: Buffer.from("invalid"),
    });
  await expect(page.getByRole("alert")).toContainText(
    "Could not prepare this image",
  );
  await expect(
    page.getByRole("button", { name: "Read menu", exact: true }),
  ).toBeDisabled();
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: Buffer.from(image, "base64"),
    });
  await page.route("https://cdn.jsdelivr.net/**", (route) => route.abort());
  await page.getByRole("button", { name: "Read menu", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Reading failed");
  await expect(
    page.getByRole("button", { name: "Read menu", exact: true }),
  ).toBeEnabled();
  expect(posts).toHaveLength(0);
});

test("cancelling initialization immediately terminates its worker", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    const counts = { created: 0, terminated: 0 };
    Object.assign(window, { ocrWorkerCounts: counts });
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        counts.created++;
      }
      terminate() {
        counts.terminated++;
        super.terminate();
      }
    };
  });
  const { posts } = await setup(page);
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    return canvas.toDataURL("image/png").split(",")[1];
  });
  // A bootstrap that never initializes makes early cancellation deterministic.
  await page.route(
    "https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js",
    (route) =>
      route.fulfill({
        body: "/* intentionally stalled worker */",
        contentType: "text/javascript",
      }),
  );
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: Buffer.from(image, "base64"),
    });
  await page.getByRole("button", { name: "Read menu", exact: true }).click();
  const counts = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            ocrWorkerCounts: { created: number; terminated: number };
          }
        ).ocrWorkerCounts,
    );
  await expect.poll(async () => (await counts()).created).toBe(1);
  await page
    .getByRole("button", { name: "Cancel reading", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Read menu", exact: true }),
  ).toBeEnabled();
  expect((await counts()).terminated).toBeGreaterThan(0);
  expect(posts).toHaveLength(0);
});

test("existing categories are immediately available without a mapping", async ({ page }) => {
  await setup(page);
  await page.getByRole("button", { name: "Add missed item", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Category *", exact: true })).toHaveValue(`existing-${categoryId}`);
  await expect(page.getByRole("combobox", { name: "Category *", exact: true }).locator("option", { hasText: "Drinks" })).toHaveCount(1);
  await expect(page.getByText("0 of 1 selected items checked", { exact: true })).toBeVisible();
});

test("empty categories explain how to create one from an item", async ({ page }) => {
  await setup(page);
  await page.route("**/api/admin/categories/**", (route) => route.fulfill({ json: [] }));
  await page.getByRole("button", { name: "Refresh menu", exact: true }).click();
  await expect(page.getByText("This branch has no categories yet.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Add missed item", exact: true }).click();
  await page.getByRole("combobox", { name: "Category *", exact: true }).selectOption("__new__");
  await page.getByLabel("Arabic category", { exact: true }).fill("ساندويتشات");
  await page.getByLabel("English category", { exact: true }).fill("Sandwiches");
  await expect(page.getByRole("combobox", { name: "Category *", exact: true }).locator("option:checked")).toHaveText("Sandwiches");
});

test("real supplied menu photo groups burger translations and decimal prices", async ({ page }, testInfo) => {
  test.skip(!process.env.OCR_MENU_PHOTO, "Local opt-in restaurant photo fixture");
  await setup(page);
  await page.locator("input[type=file]").first().setInputFiles(process.env.OCR_MENU_PHOTO!);
  await page.getByRole("button", { name: "Read menu", exact: true }).click();
  await expect(page.getByRole("button", { name: "Read again", exact: true })).toBeEnabled({ timeout: 170000 });
  const rows = await page.locator('fieldset').filter({ has: page.getByLabel("Price (SAR) *", { exact: true }) }).evaluateAll((elements) => elements.map((el) => ({
    source: el.querySelector("blockquote")?.textContent,
    fields: [...el.querySelectorAll<HTMLInputElement>('input:not([type=checkbox])')].map((input) => input.value),
  })));
  await testInfo.attach("restaurant-photo-results", { body: JSON.stringify(rows, null, 2), contentType: "application/json" });
  const burger = rows.find((row) => row.fields[1].includes("Grilled Beef Burger"));
  expect(burger?.fields[0]).toContain("برجر");
  expect(burger?.fields[2]).toBe("16.00");
  expect(burger?.fields[3]).toBe("200");
  for (const name of ["Grilled Chicken Burger", "Grilled Shrimp Burger", "Grilled Hammor Burger", "Chicken Quesadi with Potato", "Meat Quesadi with Potato"]) {
    const item = rows.find((row) => row.fields[1].includes(name));
    expect(item?.fields[0], `${name} has its Arabic name on the same item`).toMatch(/[\u0621-\u064a]/);
    expect(item?.fields[2], `${name} has a decimal price`).toMatch(/^\d+\.\d{2}$/);
  }
  await page.setViewportSize({ width: 375, height: 900 });
  const card = page.locator('fieldset').filter({ has: page.getByLabel("English name", { exact: true }).filter({ visible: true }) }).filter({ hasText: "Grilled Beef Burger" }).first();
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/restaurant-photo-mobile.png" });
});
