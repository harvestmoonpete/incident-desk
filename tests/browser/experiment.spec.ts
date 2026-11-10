import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";

for (const scenario of [
  {
    name: "A deployment goes wrong",
    title: "Deployment regression",
    support: "deploy-1",
  },
  {
    name: "No connections left",
    title: "Database connection exhaustion",
    support: "pool-1",
  },
  {
    name: "Work is piling up",
    title: "Worker throughput deficit",
    support: "queue-1",
  },
]) {
  test(`${scenario.name}: withhold evidence, predict, compare, and restore`, async ({
    page,
  }) => {
    await page.goto("./");
    await page
      .getByRole("navigation", { name: "Incident scenarios" })
      .getByRole("button", { name: new RegExp(scenario.name) })
      .click();
    await page.getByRole("button", { name: /Run investigation/ }).click();
    await page
      .getByRole("button", { name: "Test evidence", exact: true })
      .click();
    const lab = page.getByRole("region", {
      name: "Would the diagnosis survive missing evidence?",
    });
    await expect(lab.getByRole("heading", { level: 2 })).toBeFocused();
    await expect(
      lab.getByRole("button", { name: "3. Test selected evidence" }),
    ).toBeDisabled();
    await lab
      .getByRole("checkbox", {
        name: `Include ${scenario.support}`,
        exact: true,
      })
      .uncheck();
    await lab
      .getByRole("combobox", { name: "2. Predict the rule result" })
      .selectOption("changed");
    await lab
      .getByRole("button", { name: "3. Test selected evidence" })
      .click();
    const result = lab.getByRole("region", {
      name: "Selected evidence diagnosis",
    });
    await expect(result).toContainText("Insufficient evidence");
    await expect(result).toContainText("low confidence");
    await expect(result.getByRole("status")).toContainText(
      "Your prediction matched",
    );
    await expect(
      page
        .locator(".report")
        .getByRole("heading", { name: scenario.title, exact: true }),
    ).toBeVisible();
    const pending = page.waitForEvent("download");
    await result
      .getByRole("button", { name: "Download comparison JSON" })
      .click();
    const download = await pending;
    const data = JSON.parse(await readFile((await download.path())!, "utf8"));
    expect(data.mode).toBe("browser-rule-experiment");
    expect(data.source.environment).toBe("offline fixtures");
    expect(data.excludedIds).toEqual([scenario.support]);
    expect(data.includedIds).not.toContain(scenario.support);
    expect(data.result.hypotheses[0].title).toBe("Insufficient evidence");
    expect(data.baseline.hypotheses[0].title).toBe(scenario.title);
    expect(
      (await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze())
        .violations,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await lab.getByRole("button", { name: "Restore all signals" }).click();
    await expect(result.getByRole("status")).toHaveCount(0);
    await expect(
      lab.getByRole("checkbox", {
        name: `Include ${scenario.support}`,
        exact: true,
      }),
    ).toBeChecked();
    await lab.getByRole("combobox").selectOption("same");
    await lab
      .getByRole("button", { name: "3. Test selected evidence" })
      .click();
    await expect(result).toContainText(scenario.title);
    await expect(result.getByRole("status")).toContainText(
      "Diagnosis unchanged",
    );
    await page.getByRole("button", { name: /Reset workspace/ }).click();
    await expect(lab).toHaveCount(0);
  });
}

test("non-supporting signals, wrong predictions, new runs, and empty selections are handled honestly", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("navigation", { name: "Incident scenarios" })
    .getByRole("button", { name: /Work is piling up/ })
    .click();
  await page.getByRole("button", { name: /Run investigation/ }).click();
  const lab = page.getByRole("region", {
    name: "Would the diagnosis survive missing evidence?",
  });
  const result = lab.getByRole("region", {
    name: "Selected evidence diagnosis",
  });
  await lab
    .getByRole("checkbox", { name: "Include http-1", exact: true })
    .uncheck();
  await lab.getByRole("combobox").selectOption("changed");
  await lab.getByRole("button", { name: "3. Test selected evidence" }).click();
  await expect(result.getByRole("status")).toContainText("Diagnosis unchanged");
  await expect(result.getByRole("status")).toContainText(
    "Your prediction did not match",
  );
  await lab
    .getByRole("checkbox", { name: "Include queue-1", exact: true })
    .uncheck();
  await expect(result.getByRole("status")).toHaveCount(0);
  await expect(
    lab.getByRole("button", { name: "Download comparison JSON" }),
  ).toHaveCount(0);
  await lab
    .getByRole("checkbox", { name: "Include worker-1", exact: true })
    .uncheck();
  await lab.getByRole("combobox").selectOption("changed");
  await lab.getByRole("button", { name: "3. Test selected evidence" }).click();
  await expect(result).toContainText("EXPERIMENT · 0 SIGNALS");
  await expect(result).toContainText("Insufficient evidence");
  await page.getByRole("button", { name: /Run investigation/ }).click();
  await expect(
    lab.getByRole("checkbox", { name: "Include http-1", exact: true }),
  ).toBeChecked();
  await expect(result.getByRole("status")).toHaveCount(0);
  await lab.getByRole("button", { name: "Hide a supporting signal" }).click();
  await expect(
    lab.getByRole("checkbox", { name: "Include queue-1", exact: true }),
  ).not.toBeChecked();
  await page
    .getByRole("navigation", { name: "Incident scenarios" })
    .getByRole("button", { name: /No connections left/ })
    .click();
  await expect(lab).toHaveCount(0);
});
