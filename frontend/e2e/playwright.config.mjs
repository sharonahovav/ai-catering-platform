import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: "retain-on-failure" },
  webServer: { command: "node serve.mjs", url: `http://127.0.0.1:${PORT}/table/`, reuseExistingServer: !process.env.CI, env: { PORT: String(PORT) } },
  // Chromium only for now: Firefox/WebKit need their own browser installs and have not been run here.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
