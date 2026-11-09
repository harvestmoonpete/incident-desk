import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("evidence references open a report-scoped inspector with keyboard return and clean scenario changes", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: /Run investigation/ }).click();
  const deployment = page.getByRole("link", {
    name: "↗ deploy-1",
    exact: true,
  });
  await deployment.press("Enter");
  const preview = page.getByRole("region", {
    name: "Evidence: deploy-1",
    exact: true,
  });
  await expect(
    preview.getByRole("heading", { name: "Evidence: deploy-1" }),
  ).toBeFocused();
  await expect(preview).toContainText("Release v2.4 preceded the error spike");
  await expect(preview).toContainText("Offline fixture");
  await expect(preview).toContainText("Deployment regression");
  await expect(preview).toContainText(
    "does not establish the cause on its own",
  );
  await preview.getByRole("heading").press("Escape");
  await expect(preview).toHaveCount(0);
  await expect(deployment).toBeFocused();
  await expect(deployment).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("link", { name: "↗ http-1", exact: true }).click();
  const errors = page.getByRole("region", {
    name: "Evidence: http-1",
    exact: true,
  });
  await expect(errors).toContainText(
    "8 of 12 sample requests returned HTTP 500",
  );
  await errors.getByRole("button", { name: "Return to hypothesis" }).click();
  await expect(
    page.getByRole("link", { name: "↗ http-1", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("navigation", { name: "Incident scenarios" })
    .getByRole("button", { name: /No connections left/ })
    .click();
  await expect(page.locator("#evidence-preview")).toHaveCount(0);
  await page.getByRole("button", { name: /Run investigation/ }).click();
  await page.getByRole("link", { name: "↗ pool-1", exact: true }).click();
  const pool = page.getByRole("region", {
    name: "Evidence: pool-1",
    exact: true,
  });
  await expect(pool).toContainText("All 4 database connection slots are held");
  await expect(pool).not.toContainText("Deployment regression");
  expect(
    (await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze())
      .violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: /Reset workspace/ }).click();
  await expect(page.locator("#evidence-preview")).toHaveCount(0);
});
