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
    page.getByText("Accounts are not connected yet.", { exact: false }),
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
