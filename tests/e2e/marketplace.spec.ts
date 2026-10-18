import { test, expect } from "@playwright/test";
test("empty marketplace is honest and searchable", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A little outgrown. A lot to love." }),
  ).toBeVisible();
  await expect(
    page.getByText("The next chapter starts with you."),
  ).toBeVisible();
  await expect(
    page.getByText("No sample listings", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Category", exact: true })
    .selectOption("Kids");
  await page.getByRole("textbox", { name: "Size", exact: true }).fill("2–3");
  await page.getByRole("button", { name: "Find bundles" }).click();
  await expect(page).toHaveURL(/category=Kids/);
  await expect(
    page.getByRole("heading", { name: "No bundles match just yet." }),
  ).toBeVisible();
});
test("sell flow requires an account rather than publishing fake inventory", async ({
  page,
}) => {
  await page.goto("/sell");
  await expect(
    page.getByRole("heading", { name: "A bundle of possibilities." }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Sign in or create an account" })
    .click();
  await expect(page).toHaveURL(/\/auth/);
  await expect(
    page.getByText("Accounts are opening soon.", { exact: false }),
  ).toBeVisible();
});
test("mobile and desktop layout fits the viewport", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `/tmp/rewear-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
test("admin page is unavailable without authentication", async ({ page }) => {
  const response = await page.goto("/admin");
  expect(response?.status()).toBe(404);
});
test("buyers and sellers can calculate the price transparently", async ({
  page,
}) => {
  await page.goto("/#fees");
  await page.getByLabel("Number of pieces", { exact: true }).fill("8");
  await page.getByLabel("Bundle price (£)", { exact: true }).fill("20");
  const result = page.locator(".pricing-summary");
  await expect(result.getByText("£20.00", { exact: true })).toBeVisible();
  await expect(result.getByText("£2.50", { exact: true })).toBeVisible();
  await expect(result.getByText("£2.00", { exact: true })).toBeVisible();
  await expect(result.getByText("£18.00", { exact: true })).toBeVisible();
});
test("family size shortcuts preserve budget and brand", async ({ page }) => {
  await page.goto("/?brand=Mixed&max_price=15");
  await page.getByRole("link", { name: "6–12 months", exact: true }).click();
  await expect(page).toHaveURL(/category=Baby/);
  await expect(page).toHaveURL(/brand=Mixed/);
  await expect(page).toHaveURL(/max_price=15/);
  await expect(
    page.getByRole("textbox", { name: "Size", exact: true }),
  ).toHaveValue("6–12 months");
});
test("search keeps sort preference and clears all active filters", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "Sort bundles" })
    .selectOption("per_piece");
  await page.getByRole("textbox", { name: "Brand", exact: true }).fill("Mixed");
  await page.getByRole("button", { name: "Find bundles" }).click();
  await expect(page).toHaveURL(/sort=per_piece/);
  await expect(
    page.getByRole("combobox", { name: "Sort bundles" }),
  ).toHaveValue("per_piece");
  await page.getByRole("link", { name: "Clear filters", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Brand", exact: true }),
  ).toHaveValue("");
});
test("fees and safety guides are reachable without signing in", async ({
  page,
}) => {
  await page.goto("/how-it-works");
  await expect(
    page.getByRole("heading", { name: "What does it cost?" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Read the safety guide →" }).click();
  await expect(page).toHaveURL(/\/safety/);
  await expect(
    page.getByRole("heading", { name: "At local pickup" }),
  ).toBeVisible();
});
