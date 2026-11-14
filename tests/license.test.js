import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { checkLicense, GRACE_MS, RECHECK_MS } = require("../src/license/core");
const { createLicenseController, initializeLicense } = require("../src/license");

const config = { environment: "sandbox", organizationId: "00000000-0000-4000-8000-000000000001",
  benefitId: "00000000-0000-4000-8000-000000000002" };
const now = 1800000000000;
const data = { organization_id: config.organizationId, benefit_id: config.benefitId,
  status: "granted", expires_at: null };
const ok = () => ({ status: 200, json: { ...data } });
const args = (more = {}) => ({ config, key: "test-key", version: "1.11.1", now, request: vi.fn(async () => ok()), ...more });
const goodCache = async () => (await checkLicense(args())).cache;

describe("Polar client validation", () => {
  it("uses the public sandbox endpoint without a merchant secret", async () => {
    const a = args();
    const result = await checkLicense(a);
    expect(result.valid).toBe(true);
    const request = a.request.mock.calls[0][0];
    expect(request.url).toBe("https://sandbox-api.polar.sh/v1/customer-portal/license-keys/validate");
    expect(request.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(request.body)).toEqual({ key: "test-key", organization_id: config.organizationId, benefit_id: config.benefitId });
  });
  it("ships the production profile unless a sandbox build asks for it", () => {
    const shipped = require("../src/license/config");
    expect(shipped.environment).toBe("production");
    expect(shipped.checkoutUrl).toMatch(/^https:\/\/buy\.polar\.sh\/polar_cl_/);
    expect(shipped.portalUrl).toMatch(/^https:\/\/polar\.sh\/[^/]+\/portal$/);
    expect(JSON.stringify(shipped)).not.toContain("sandbox");
  });
  it("uses the live endpoint only with production config", async () => {
    const a = args({ config: { ...config, environment: "production" } });
    await checkLicense(a);
    expect(a.request.mock.calls[0][0].url).toContain("https://api.polar.sh/");
  });
  it("does not send blank keys or incomplete configuration", async () => {
    for (const override of [{ key: " " }, { config: { ...config, benefitId: "" } }, { config: { ...config, environment: "unknown" } }]) {
      const a = args(override);
      expect((await checkLicense(a)).valid).toBe(false);
      expect(a.request).not.toHaveBeenCalled();
    }
  });
  it.each([
    { organization_id: "another-org" }, { benefit_id: "another-product" },
    { status: "revoked" }, { status: "disabled" },
    { expires_at: new Date(now - 1).toISOString() }, { expires_at: "bad-date" },
  ])("rejects wrong product, revoked or expired grants: %j", async patch => {
    const result = await checkLicense(args({ request: async () => ({ status: 200, json: { ...data, ...patch } }) }));
    expect(result).toEqual({ valid: false, status: "invalid", cache: null });
  });
  it("reuses fresh cache but checks again after a version update or a day", async () => {
    const cache = await goodCache();
    const a = args({ cache });
    expect((await checkLicense(a)).valid).toBe(true);
    expect(a.request).not.toHaveBeenCalled();
    await checkLicense({ ...a, version: "1.11.2" });
    expect(a.request).toHaveBeenCalledTimes(1);
    await checkLicense({ ...a, now: now + RECHECK_MS });
    expect(a.request).toHaveBeenCalledTimes(2);
  });
  it("manual checks bypass the fresh cache", async () => {
    const a = args({ cache: await goodCache(), force: true });
    await checkLicense(a);
    expect(a.request).toHaveBeenCalledTimes(1);
  });
  it.each([429, 500, 503])("allows bounded offline grace for transient HTTP %s", async status => {
    const cache = await goodCache();
    const result = await checkLicense(args({ cache, force: true, request: async () => ({ status }) }));
    expect(result.valid).toBe(true);
    expect(result.status).toBe("offline");
    expect(result.cache.validatedAt).toBe(now);
  });
  it.each([400, 401, 403, 404, 422])("does not fall back after rejected HTTP %s", async status => {
    const result = await checkLicense(args({ cache: await goodCache(), force: true, request: async () => ({ status }) }));
    expect(result).toEqual({ valid: false, status: "invalid", cache: null });
  });
  it("network outages allow 14 days without extending the grace window", async () => {
    const cache = await goodCache();
    const request = async () => { throw new Error("offline"); };
    const day = 24 * 60 * 60 * 1000;
    expect(GRACE_MS).toBe(14 * day);
    expect(RECHECK_MS).toBe(day);
    const afterTenDays = await checkLicense(args({ cache, request, now: now + 10 * day }));
    expect(afterTenDays.valid).toBe(true);
    expect(afterTenDays.cache.validatedAt).toBe(now);
    expect((await checkLicense(args({ cache, request, now: now + GRACE_MS - 1 }))).valid).toBe(true);
    expect((await checkLicense(args({ cache, request, now: now + GRACE_MS }))).valid).toBe(false);
  });
  it.each([
    { key: "another-key" }, { environment: "production" }, { organizationId: "another-org" },
    { benefitId: "another-benefit" }, { validatedAt: now + 1 }, { expiresAt: now - 1 },
  ])("does not trust a cache for a different scope or time: %j", async patch => {
    const cache = { ...await goodCache(), ...patch };
    expect((await checkLicense(args({ cache, force: true, request: async () => { throw new Error("offline"); } }))).valid).toBe(false);
  });
});

describe("runtime-only license state", () => {
  beforeEach(() => { globalThis.window = globalThis; });
  afterEach(() => { delete globalThis.window; });
  function plugin(settings = {}) {
    return { settings: { licenseValid: true, ...settings }, manifest: { version: "1.11.1" }, saveData: vi.fn(async () => {}) };
  }
  it("a valid cache unlocks Pro before the network answers", async () => {
    const p = plugin({ licenseKey: "test-key", licenseCache: await goodCache() });
    createLicenseController(p, { config, now: () => now, request: () => new Promise(() => {}) });
    expect(p.settings.licenseValid).toBe(true);
  });
  it("a cache past the grace period does not unlock Pro at startup", async () => {
    const p = plugin({ licenseKey: "test-key", licenseCache: await goodCache() });
    createLicenseController(p, { config, now: () => now + GRACE_MS, request: () => new Promise(() => {}) });
    expect(p.settings.licenseValid).toBe(false);
  });
  it("a revoked key locks Pro when the background check answers", async () => {
    const p = plugin({ licenseKey: "test-key", licenseCache: await goodCache() });
    const c = createLicenseController(p, { config, now: () => now + RECHECK_MS, request: async () => ({ status: 404 }) });
    expect(p.settings.licenseValid).toBe(true);
    await c.refresh();
    expect(p.settings.licenseValid).toBe(false);
  });
  it("an unloaded plugin ignores a check still in flight", async () => {
    let resolve;
    const p = plugin({ licenseKey: "test-key" });
    const c = createLicenseController(p, { config, now: () => now, request: () => new Promise(r => { resolve = r; }) });
    const refreshing = c.refresh();
    c.dispose();
    resolve(ok());
    await refreshing;
    expect(c.disposed).toBe(true);
    expect(p.settings.licenseValid).toBe(false);
  });
  it("startup returns before the first license check finishes", async () => {
    let resolve;
    const p = { ...plugin({ licenseKey: "test-key" }), register: vi.fn(), registerInterval: clearInterval };
    initializeLicense(p, { config, now: () => now, request: () => new Promise(r => { resolve = r; }) });
    expect(p.settings.licenseValid).toBe(false);
    expect(p.license.state.status).toBe("checking");
    resolve(ok());
    await p.license.ready;
    expect(p.settings.licenseValid).toBe(true);
  });
  it("ignores persisted true and omits the derived flag from saved JSON", async () => {
    const p = plugin();
    const c = createLicenseController(p, { config, now: () => now, request: async () => ok() });
    expect(p.settings.licenseValid).toBe(false);
    await c.refresh();
    expect(p.settings.licenseValid).toBe(false);
    await c.refresh({ key: "test-key" });
    expect(p.settings.licenseValid).toBe(true);
    expect(JSON.parse(JSON.stringify(p.settings))).not.toHaveProperty("licenseValid");
  });
  it("a removed license stays removed when an older request finishes", async () => {
    let resolve;
    const pending = new Promise(r => { resolve = r; });
    const p = plugin();
    const c = createLicenseController(p, { config, now: () => now, request: () => pending });
    const refreshing = c.refresh({ key: "test-key" });
    await c.remove();
    resolve(ok());
    await refreshing;
    expect(p.settings.licenseValid).toBe(false);
    expect(p.settings.licenseKey).toBe("");
    expect(p.settings.licenseCache).toBeNull();
  });
  it("latest activation wins when responses arrive out of order", async () => {
    let resolve;
    const p = plugin();
    const c = createLicenseController(p, { config, now: () => now, request: vi.fn()
      .mockImplementationOnce(() => new Promise(r => { resolve = r; })).mockResolvedValueOnce(ok()) });
    const first = c.refresh({ key: "first" });
    await c.refresh({ key: "second" });
    resolve(ok()); await first;
    expect(p.settings.licenseKey).toBe("second");
  });
});
