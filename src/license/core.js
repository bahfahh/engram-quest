"use strict";

const DAY = 24 * 60 * 60 * 1000;
const RECHECK_MS = DAY;
const GRACE_MS = 14 * DAY;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function configured(config) {
  return ["sandbox", "production"].includes(config.environment) &&
    UUID.test(config.organizationId) && UUID.test(config.benefitId);
}

function cacheMatches(cache, key, config, now) {
  return !!key && !!cache && cache.key === key &&
    cache.environment === config.environment &&
    cache.organizationId === config.organizationId && cache.benefitId === config.benefitId &&
    Number.isFinite(cache.validatedAt) && cache.validatedAt <= now &&
    now - cache.validatedAt < GRACE_MS &&
    (cache.expiresAt === null || (Number.isFinite(cache.expiresAt) && cache.expiresAt > now));
}

async function checkLicense({ key, cache, config, version, request, now = Date.now(), force = false }) {
  key = typeof key === "string" ? key.trim() : "";
  if (!configured(config)) return { valid: false, status: "unconfigured", cache: null };
  if (!key) return { valid: false, status: "inactive", cache: null };
  const cached = cacheMatches(cache, key, config, now);
  if (!force && cached && cache.version === version && now - cache.validatedAt < RECHECK_MS) {
    return { valid: true, status: "active", cache };
  }
  const base = config.environment === "sandbox" ? "https://sandbox-api.polar.sh" : "https://api.polar.sh";
  let response;
  try {
    response = await request({
      url: `${base}/v1/customer-portal/license-keys/validate`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, organization_id: config.organizationId, benefit_id: config.benefitId }),
      throw: false,
    });
  } catch (_) {
    return { valid: cached, status: cached ? "offline" : "unavailable", cache: cached ? cache : null };
  }
  if (response.status === 429 || response.status >= 500) {
    return { valid: cached, status: cached ? "offline" : "unavailable", cache: cached ? cache : null };
  }
  if (response.status !== 200) return { valid: false, status: "invalid", cache: null };
  let data;
  try { data = response.json; } catch (_) { /* Treat an unreadable response as unavailable. */ }
  if (!data || typeof data !== "object") {
    return { valid: cached, status: cached ? "offline" : "unavailable", cache: cached ? cache : null };
  }
  const expiresAt = data.expires_at === null ? null : Date.parse(data.expires_at);
  if (data.organization_id !== config.organizationId || data.benefit_id !== config.benefitId ||
      data.status !== "granted" || (expiresAt !== null && (!Number.isFinite(expiresAt) || expiresAt <= now))) {
    return { valid: false, status: "invalid", cache: null };
  }
  return {
    valid: true, status: "active",
    cache: { key, environment: config.environment, organizationId: config.organizationId,
      benefitId: config.benefitId, version, validatedAt: now, expiresAt },
  };
}

module.exports = { checkLicense, configured, cacheMatches, RECHECK_MS, GRACE_MS };
