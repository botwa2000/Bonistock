/**
 * App Store Screenshot Generator
 * Captures key screens in EN and DE for iPhone 6.7", 6.5", and iPad 12.9"
 */

import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.BASE_URL || "https://dev.bonistock.com";
const EMAIL = process.env.EMAIL || "alexanderperel@yahoo.com";
const PASSWORD = process.env.PASSWORD;

if (!PASSWORD) {
  console.error("Usage: PASSWORD=yourpassword node scripts/appstore-screenshots.mjs");
  process.exit(1);
}

const DEVICES = {
  iphone67: { width: 430, height: 932, scaleFactor: 3, name: "iPhone 6.7" },
  iphone65: { width: 414, height: 896, scaleFactor: 3, name: "iPhone 6.5" },
  ipad:     { width: 1024, height: 1366, scaleFactor: 2, name: "iPad 12.9" },
};

const LOCALES = ["en", "de"];

const SCREENS = [
  { name: "01-dashboard-stocks", path: "/dashboard" },
  { name: "02-stock-detail", path: "/dashboard/stock/RBRK" },
  { name: "03-dashboard-etfs", path: "/dashboard/etfs" },
  { name: "04-mix", path: "/dashboard/mix" },
  { name: "05-watchlist", path: "/dashboard/watchlist" },
  { name: "06-pricing", path: "/pricing" },
  { name: "07-landing", path: "/" },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function dismissCookies(page) {
  try {
    // Click "Reject optional" or "Accept all" to dismiss the cookie banner
    const rejectBtn = page.locator('button:has-text("Reject optional"), button:has-text("Optionale ablehnen")');
    if (await rejectBtn.isVisible({ timeout: 2000 })) {
      await rejectBtn.click();
      await sleep(500);
    }
  } catch {
    // No cookie banner, that's fine
  }
}

async function login(page) {
  console.log("    Navigating to login page...");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle", timeout: 30000 });
  await sleep(2000);

  // Dismiss cookie consent first if it's in the way
  await dismissCookies(page);
  await sleep(500);

  // Fill email
  const emailInput = page.locator('input[type="email"]');
  await emailInput.waitFor({ state: "visible", timeout: 10000 });
  await emailInput.fill(EMAIL);

  // Fill password
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.fill(PASSWORD);

  // Click Log In button
  const submitBtn = page.locator('button[type="submit"]');
  await submitBtn.click();

  // Wait for navigation away from login page
  console.log("    Waiting for login redirect...");
  try {
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20000 });
    console.log(`    Logged in. Current URL: ${page.url()}`);
    await sleep(2000);
    return true;
  } catch {
    console.log(`    Login may have failed. Current URL: ${page.url()}`);
    // Take a debug screenshot
    await page.screenshot({ path: path.join(__dirname, "..", "screenshots", "debug-login.png") });
    return false;
  }
}

async function captureScreen(page, screen, locale, deviceKey, outDir) {
  const filePath = path.join(outDir, locale, deviceKey, `${screen.name}.png`);

  await page.goto(`${BASE_URL}${screen.path}`, { waitUntil: "networkidle", timeout: 30000 });
  await sleep(3000);

  // Dismiss cookie banner if it appears
  await dismissCookies(page);
  await sleep(300);

  // Remove any remaining overlays via JS
  await page.evaluate(() => {
    // Remove cookie consent components
    document.querySelectorAll('[class*="CookieConsent"], [class*="cookie-consent"]').forEach((el) => el.remove());
    // Remove toasts
    document.querySelectorAll('[class*="toast"], [class*="Toast"]').forEach((el) => el.remove());
  });

  await sleep(300);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`    ✓ ${screen.name}`);
}

async function run() {
  const outDir = path.join(__dirname, "..", "screenshots");
  const browser = await chromium.launch({ headless: true });

  for (const [deviceKey, device] of Object.entries(DEVICES)) {
    console.log(`\n📱 ${device.name} (${device.width}x${device.height} @${device.scaleFactor}x)`);

    for (const locale of LOCALES) {
      console.log(`\n  🌐 Locale: ${locale.toUpperCase()}`);

      const context = await browser.newContext({
        viewport: { width: device.width, height: device.height },
        deviceScaleFactor: device.scaleFactor,
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        locale: locale === "de" ? "de-DE" : "en-US",
        colorScheme: "dark",
      });

      // Set locale cookie and dismiss cookies preference
      await context.addCookies([
        { name: "NEXT_LOCALE", value: locale, domain: "dev.bonistock.com", path: "/" },
        { name: "cookie_consent", value: "necessary", domain: "dev.bonistock.com", path: "/" },
      ]);

      const page = await context.newPage();

      // Login via form
      const loggedIn = await login(page);

      if (!loggedIn) {
        console.error("    ✗ Login failed, skipping this locale");
        await context.close();
        continue;
      }

      // Set locale cookie again (may have been overwritten)
      await context.addCookies([
        { name: "NEXT_LOCALE", value: locale, domain: "dev.bonistock.com", path: "/" },
      ]);

      for (const screen of SCREENS) {
        try {
          await captureScreen(page, screen, locale, deviceKey, outDir);
        } catch (err) {
          console.error(`    ✗ ${screen.name}: ${err.message}`);
        }
      }

      await page.close();
      await context.close();
    }
  }

  await browser.close();
  console.log(`\n✅ All screenshots saved to ./screenshots/`);
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
