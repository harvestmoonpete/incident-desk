import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function checkContrast(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const result = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
  expect(result.violations.map(v => ({ rule: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('evidence and report contrast across all scenarios', async ({ page }) => {
  await page.goto('./');
  await checkContrast(page);
  await expect(page.getByRole('button', {name:'Download report JSON'})).toBeDisabled();
  for (let i = 0; i < 3; i++) {
    await page.getByRole('navigation', { name: 'Incident scenarios' }).getByRole('button').nth(i).click();
    await page.getByRole('button', { name: /Run investigation/ }).click();
    await expect(page.locator('.findings h3').first()).toBeVisible();
    await checkContrast(page);
    const pending = page.waitForEvent('download');
    await page.getByRole('button', {name:'Download report JSON'}).click();
    const download = await pending;
    const stream = await download.createReadStream();
    const chunks: Buffer[] = []; for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    expect(data.environment).toBe('offline browser fixtures');
    expect(data.scenario).toBe(['deployment','pool','queue'][i]);
    expect(data.report.evidence.length).toBeGreaterThan(0);
    for (const hypothesis of data.report.hypotheses) for (const id of hypothesis.evidence_ids)
      expect(data.report.evidence.some((e: {id:string}) => e.id === id)).toBe(true);
  }
});
