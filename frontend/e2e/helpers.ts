/**
 * helpers.ts — Browser + dev server lifecycle for `bun test` e2e specs.
 *
 * Playwright's own test runner is not used here; e2e specs run under
 * `bun:test` alongside the unit tests in `src/`. A single dev server and
 * browser are shared across all e2e files, and each test gets a fresh
 * browser context + page (equivalent to Playwright's `page` fixture).
 *
 * If port 3000 is already serving (e.g. from a previous `bun test` run or a
 * dev `bun run dev` in another shell) the existing server is reused; a
 * fresh one is spawned otherwise. Note that bun:test does not dispatch
 * `process.exit` / `beforeExit` events and files are processed serially
 * (next file loads only after the previous file's `afterAll` runs), so
 * there is no hook where we can tear the server down cleanly at the very
 * end — it is left running on purpose and reused next time. Run
 * `pkill -f 'vite dev'` to clean it up manually.
 *
 * `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can be set to override the browser
 * binary in environments where the default Playwright-managed browser is
 * not available (e.g. pre-baked sandbox images).
 */

import { afterEach, beforeAll, beforeEach, setDefaultTimeout } from "bun:test";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

const BASE_URL = "http://localhost:3000";
const SERVER_STARTUP_TIMEOUT_MS = 60_000;
const TEST_TIMEOUT_MS = 60_000;

let browserInstance: Browser | null = null;
let setupPromise: Promise<void> | null = null;

async function isServerRunning(): Promise<boolean> {
  try {
    const res = await fetch(BASE_URL, { method: "HEAD" });
    return res.status < 500;
  } catch {
    return false;
  }
}

async function waitForServer(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isServerRunning()) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Dev server did not start at ${BASE_URL} within ${timeoutMs}ms`);
}

async function ensureSetup(): Promise<void> {
  if (setupPromise) return setupPromise;
  setupPromise = (async () => {
    if (!(await isServerRunning())) {
      // Spawn the vite bin directly (not `bun run dev`) so we don't leak an
      // extra wrapper process — the spawned pid IS the vite process.
      Bun.spawn(["node", "node_modules/.bin/vite", "dev", "--port", "3000"], {
        cwd: `${import.meta.dir}/..`,
        stdout: "ignore",
        stderr: "ignore",
      });
      await waitForServer(SERVER_STARTUP_TIMEOUT_MS);
    }
    const executablePath = process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"];
    browserInstance = await chromium.launch(executablePath ? { executablePath } : {});
  })();
  return setupPromise;
}

interface BrowserFixture {
  /** The current test's page. Only valid inside `test(...)` callbacks. */
  page: Page;
}

/**
 * Wires a bun:test suite into the shared browser lifecycle.
 * Call once at the top of a spec file and read `page` inside each test.
 */
export function useBrowser(): BrowserFixture {
  // Unit tests in ./src finish in milliseconds, but e2e tests that boot a dev
  // server, launch a browser, and navigate pages routinely take longer than
  // bun's 5s default. `setDefaultTimeout` only affects the current file, so
  // call it here — useBrowser() runs once in each spec file at module load.
  setDefaultTimeout(TEST_TIMEOUT_MS);

  const fixture = {} as BrowserFixture;
  let context: BrowserContext | null = null;

  beforeAll(async () => {
    await ensureSetup();
  });

  beforeEach(async () => {
    context = await browserInstance!.newContext({ baseURL: BASE_URL });
    fixture.page = await context.newPage();
  });

  afterEach(async () => {
    await context?.close();
    context = null;
  });

  return fixture;
}

/**
 * Polls `locator.count()` until it equals `expected` or the timeout elapses.
 * Replaces Playwright's auto-retrying `expect(locator).toHaveCount(n)` for
 * scenarios where we wait for elements to unmount entirely.
 */
export async function waitForCount(
  locator: { count: () => Promise<number> },
  expected: number,
  timeoutMs = 15_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let actual = await locator.count();
  while (Date.now() < deadline) {
    if (actual === expected) return;
    await new Promise((r) => setTimeout(r, 100));
    actual = await locator.count();
  }
  throw new Error(
    `Locator count did not become ${expected} within ${timeoutMs}ms (last: ${actual})`,
  );
}
