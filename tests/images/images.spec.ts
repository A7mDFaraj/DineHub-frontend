import { test, expect, type Page } from "@playwright/test";

const branchId = "11111111-1111-4111-8111-111111111111";
const categoryId = "22222222-2222-4222-8222-222222222222";
const imageUrl = "https://images.example.invalid/brand.png";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aC1sAAAAASUVORK5CYII=", "base64");

async function setup(page: Page, target: "settings" | "menu", locale = "en") {
  const branch = { id: branchId, name: "Test branch", logoUrl: "", themeColor: "#f2644b" };
  const products: Record<string, unknown>[] = [];
  const writes: Record<string, unknown>[] = [];
  const uploads = { fail: false, delay: 0, count: 0 };
  await page.context().addCookies([{ name: "dinehub_admin_guide", value: "v1", url: "http://localhost:3101" }]);
  await page.route("https://images.example.invalid/**", route => route.fulfill({ contentType: "image/png", body: png }));
  await page.route("https://dinehub-backend-42eq.onrender.com/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let data: unknown = [];
    if (path.includes("/auth/get-session")) data = {
      user: { id: "test-user", name: "Test Owner", email: "test@example.invalid", emailVerified: true },
      session: { id: "test-session", userId: "test-user", expiresAt: "2099-01-01T00:00:00Z" },
    };
    else if (path === "/api/access/me") data = { id: "test-user", businessId: "test-business", isBusinessOwner: true,
      permissions: ["settings.read", "settings.update", "menu.read", "menu.create", "menu.update", "branches.read", "branches.all", "categories.read"] };
    else if (path === "/api/staff/branches") data = [branch];
    else if (path === `/api/admin/branches/${branchId}` && request.method() === "PATCH") {
      const payload = request.postDataJSON(); writes.push(payload); Object.assign(branch, payload); data = branch;
    } else if (path === "/api/admin/upload") {
      uploads.count++;
      expect(request.headers()["content-type"]).toContain("multipart/form-data; boundary=");
      expect(request.postDataBuffer()?.includes(Buffer.from('name="file"'))).toBeTruthy();
      if (uploads.delay) await new Promise(resolve => setTimeout(resolve, uploads.delay));
      if (uploads.fail) return route.fulfill({ status: 503, json: { message: "Storage unavailable" } });
      data = { url: imageUrl };
    } else if (path.includes("/admin/categories/")) data = [{ id: categoryId, nameAr: "مشروبات", nameEn: "Drinks" }];
    else if (path.includes("/admin/products/branch/")) data = products;
    else if (path === "/api/admin/products" && request.method() === "POST") {
      const payload = request.postDataJSON(); writes.push(payload); const product = { id: "product-1", ...payload }; products.push(product); data = product;
    } else if (path === "/api/admin/products/product-1" && request.method() === "PATCH") {
      const payload = request.postDataJSON(); writes.push(payload); Object.assign(products[0], payload); data = products[0];
    }
    await route.fulfill({ json: data });
  });
  await page.goto(`/${locale}/admin/${target}`);
  if (target === "settings") await expect(page.getByRole("button", { name: locale === "en" ? "Save Changes" : "حفظ التغييرات" })).toBeEnabled();
  else {
    await page.getByRole("button", { name: "Add Product", exact: true }).click();
    await page.locator("#prod-name-ar").fill("Test item");
    await page.locator("#prod-price").fill("12");
  }
  return { writes, uploads, branch, products };
}

for (const target of ["settings", "menu"] as const) {
  test(`${target}: URL saves without Apply, survives reload, and clears`, async ({ page }) => {
    const { writes } = await setup(page, target);
    const save = page.getByRole("button", { name: target === "settings" ? "Save Changes" : "Add product", exact: true });
    await page.getByRole("button", { name: "Image URL", exact: true }).click();
    await page.getByRole("textbox", { name: "Image URL", exact: true }).fill(` ${imageUrl} `);
    await save.click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0][target === "settings" ? "logoUrl" : "imageUrl"]).toBe(imageUrl);
    if (target === "settings") {
      await page.reload();
      await expect(page.getByRole("button", { name: "Delete image" })).toBeVisible();
      await page.getByRole("button", { name: "Delete image" }).click();
      await page.getByRole("button", { name: "Save Changes" }).click();
      await expect.poll(() => writes.length).toBe(2);
      expect(writes[1].logoUrl).toBe("");
      await page.reload();
      await expect(page.getByRole("button", { name: "Upload image", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Delete image" })).toHaveCount(0);
    } else {
      await page.reload();
      await page.getByRole("button", { name: "Edit Product Test item", exact: true }).click();
      await expect(page.getByRole("button", { name: "Delete image" })).toBeVisible();
      await page.getByRole("button", { name: "Image URL", exact: true }).click();
      const replacement = "https://images.example.invalid/replacement.png";
      await page.getByRole("textbox", { name: "Image URL", exact: true }).fill(replacement);
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await expect.poll(() => writes.length).toBe(2);
      expect(writes[1].imageUrl).toBe(replacement);
      await page.reload();
      await page.getByRole("button", { name: "Edit Product Test item", exact: true }).click();
      await page.getByRole("button", { name: "Delete image" }).click();
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await expect.poll(() => writes.length).toBe(3);
      expect(writes[2].imageUrl).toBe("");
      await page.reload();
      await page.getByRole("button", { name: "Edit Product Test item", exact: true }).click();
      await expect(page.getByRole("button", { name: "Delete image" })).toHaveCount(0);
    }
  });

  test(`${target}: uploads block saving, failures preserve the image, retry succeeds`, async ({ page }) => {
    const { writes, uploads } = await setup(page, target);
    const save = page.getByRole("button", { name: target === "settings" ? "Save Changes" : "Add product", exact: true });
    uploads.delay = 700;
    const file = { name: "image.png", mimeType: "image/png", buffer: png };
    await page.locator('input[type="file"]').setInputFiles(file);
    await expect(save).toBeDisabled();
    await expect(page.getByText("Image attached", { exact: true })).toBeVisible();
    await expect(save).toBeEnabled();
    uploads.fail = true;
    await page.locator('input[type="file"]').setInputFiles(file);
    await expect(page.getByRole("alert").filter({ hasText: "Storage unavailable" })).toBeVisible();
    await expect(page.getByText("Image attached", { exact: true })).toBeVisible();
    uploads.fail = false;
    await page.locator('input[type="file"]').setInputFiles(file);
    await expect(page.getByRole("alert").filter({ hasText: "Storage unavailable" })).toHaveCount(0);
    await expect(save).toBeEnabled();
    await save.click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0][target === "settings" ? "logoUrl" : "imageUrl"]).toBe(imageUrl);
    expect(uploads.count).toBe(3);
  });

  test(`${target}: invalid URLs and unsupported files cannot save an image`, async ({ page }) => {
    const { writes, uploads } = await setup(page, target);
    await page.locator('input[type="file"]').setInputFiles({ name: "image.gif", mimeType: "image/gif", buffer: png });
    await expect(page.getByRole("alert").filter({ hasText: "Unsupported file format" })).toBeVisible();
    expect(uploads.count).toBe(0);
    await page.locator('input[type="file"]').setInputFiles({ name: "large.png", mimeType: "image/png", buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
    await expect(page.getByRole("alert").filter({ hasText: "5MB limit" })).toBeVisible();
    expect(uploads.count).toBe(0);
    await page.getByRole("button", { name: "Image URL", exact: true }).click();
    await page.getByRole("textbox", { name: "Image URL", exact: true }).fill("http://example.com/image.png");
    await page.getByRole("button", { name: target === "settings" ? "Save Changes" : "Add product", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "Image URL", exact: true })).toHaveAttribute("aria-invalid", "true");
    expect(writes).toHaveLength(0);
  });
}
