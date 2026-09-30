import { test, expect } from "@playwright/test";

test("login, swipe, and reach matches", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="username"]', "cara");
  await page.fill('input[name="password"]', "password123");
  await page.click('button:has-text("Sign in")');
  await expect(page).toHaveURL(/\/swipe/);
  await expect(page.getByText(/Duke|Titan|Willow|Sage/)).toBeVisible();

  await page.click('button:has-text("♥")');
  await page.goto("/matches");
  await expect(page.getByRole("heading", { name: "Matches" })).toBeVisible();
});
