import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("appearance is saved across navigation and reloads", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "Appearance", exact: true })
    .selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Appearance", exact: true }),
  ).toHaveValue("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.goto("/account");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("combobox", { name: "Appearance", exact: true })
    .selectOption("light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
test("system mode follows device changes while an explicit choice overrides them", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("combobox", { name: "Appearance", exact: true }),
  ).toHaveValue("system");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page
    .getByRole("combobox", { name: "Appearance", exact: true })
    .selectOption("dark");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("combobox", { name: "Appearance", exact: true })
    .selectOption("system");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
test("appearance still works when browser storage is blocked", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = function () {
      throw new Error("Storage blocked");
    };
    Storage.prototype.setItem = function () {
      throw new Error("Storage blocked");
    };
  });
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "Appearance", exact: true })
    .selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("combobox", { name: "Appearance", exact: true })
    .selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
test("an invalid stored value safely falls back to the system preference", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("rewear-appearance", "invalid"),
  );
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("combobox", { name: "Appearance", exact: true }),
  ).toHaveValue("system");
});
test("dark mode fits the viewport including narrow phones", async ({
  page,
}, info) => {
  if (info.project.name === "mobile")
    await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "Appearance", exact: true })
    .selectOption("dark");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `/tmp/rewear-dark-${info.project.name}.png`,
    fullPage: true,
  });
});
for (const path of [
  "/",
  "/account",
  "/sell",
  "/auth",
  "/how-it-works",
  "/safety",
])
  test(`dark page ${path} passes automated accessibility checks`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const report = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      report.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([]);
  });
