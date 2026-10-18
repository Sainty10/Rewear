import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
// One page per test gives each full scan its own timeout and failure report.
for (const path of ["/", "/sell", "/auth", "/how-it-works", "/safety"]) {
  test(`public page ${path} passes automated WCAG A/AA checks`, async ({
    page,
  }) => {
    await page.goto(path);
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
}
