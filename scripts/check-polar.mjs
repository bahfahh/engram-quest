// Checks the live Polar setup the shipped plugin points at, without paying and without any Polar secret.
//   npm run check:polar                      checkout link, product, price, benefit, customer portal
//   EQ_LICENSE_KEY=<key> npm run check:polar  also validates one real key exactly as the plugin does
// Exit code 1 when anything does not match src/license/config.js. Run it before every release.
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const config = require('../src/license/config.js');
const { checkLicense } = require('../src/license/core.js');

const failures = [];
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `: ${detail}` : ''}`);
  if (!ok) failures.push(label);
};

const api = config.environment === 'sandbox' ? 'https://sandbox-api.polar.sh' : 'https://api.polar.sh';
const cents = Math.round(Number(config.price.replace(/[^0-9.]/g, '')) * 100);
console.log(`Polar ${config.environment}, organization ${config.organizationId}\n`);

// 1. The checkout link opens a checkout session for this organization's product.
const link = await fetch(config.checkoutUrl, { redirect: 'manual' });
const secret = (link.headers.get('location') || '').match(/polar_c_[A-Za-z0-9]+/)?.[0];
check(link.status >= 300 && link.status < 400 && !!secret, 'checkout link opens a checkout', `HTTP ${link.status}`);

if (secret) {
  const res = await fetch(`${api}/v1/checkouts/client/${secret}`);
  const checkout = res.ok ? await res.json() : null;
  check(!!checkout, 'checkout session is readable', `HTTP ${res.status}`);
  if (checkout) {
    const product = checkout.product || {};
    const price = (product.prices || []).find((p) => !p.is_archived) || {};
    check(checkout.organization_id === config.organizationId, 'checkout belongs to the configured organization', checkout.organization_id);
    check(price.amount_type === 'fixed' && price.price_amount === cents && /usd/i.test(price.price_currency || ''),
      `price matches ${config.price}`, `${price.amount_type} ${price.price_amount} ${price.price_currency}`);
    check(!product.is_recurring, 'one-time purchase, not a subscription');
    const benefits = (product.benefits || []).map((b) => `${b.id} (${b.type})`);
    check((product.benefits || []).some((b) => b.id === config.benefitId && b.type === 'license_keys'),
      'product grants the configured license-key benefit', benefits.join(', ') || 'none listed');
  }
}

// 2. The customer portal the settings page links to is up.
if (config.portalUrl) {
  const portal = await fetch(config.portalUrl, { redirect: 'manual' });
  check(portal.status < 400, 'customer portal responds', `HTTP ${portal.status}`);
}

// 3. Optional: one real key, through the plugin's own validation code.
const key = process.env.EQ_LICENSE_KEY;
if (key) {
  const request = async ({ url, method, headers, body }) => {
    const r = await fetch(url, { method, headers, body });
    let json = null;
    try { json = await r.json(); } catch (_) { /* checkLicense treats a missing body as unavailable. */ }
    return { status: r.status, json };
  };
  const result = await checkLicense({ key, config, version: 'check-polar', request, force: true });
  check(result.status === 'active', 'license key activates Pro', result.status);
} else {
  console.log('SKIP  license key (set EQ_LICENSE_KEY to test one)');
}

console.log(failures.length ? `\n${failures.length} check(s) failed.` : '\nAll checks passed.');
process.exit(failures.length ? 1 : 0);
