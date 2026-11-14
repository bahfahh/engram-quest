"use strict";

// Public identifiers only. Never put a Polar organization access token here.
// Every build uses production. `npm run build:sandbox` builds against the Polar sandbox for local
// payment tests (test cards, sandbox keys only); the define is replaced at build time, so a
// production bundle does not carry the sandbox profile.
const SANDBOX = typeof __POLAR_SANDBOX__ !== "undefined" && __POLAR_SANDBOX__ === true;

const profile = SANDBOX
  ? {
    environment: "sandbox",
    organizationId: "0da0b02f-e716-4f9e-80da-332056199263",
    benefitId: "876d831e-9ad7-4186-b9a5-f288a2954ad8",
    checkoutUrl: "https://sandbox-api.polar.sh/v1/checkout-links/polar_cl_lvgDKSpLQQpUn64MZ5KpTmztuulJCPQSSyPkv0VKBIM/redirect",
    portalUrl: "",
  }
  : {
    environment: "production",
    organizationId: "13564b2c-5a08-4d30-a419-bbcfcba599dd",
    benefitId: "9ef5dc28-a7cd-440f-beae-fc405fd9be81",
    // Released plugins keep this URL forever: change price or discounts by editing this link in Polar, never by replacing it.
    checkoutUrl: "https://buy.polar.sh/polar_cl_f02aOe5jdhgwtG4mIn4VYdIRHXZSpKLgdX1ug0YjqN4",
    // Buyers sign in with their purchase email to copy their key again.
    portalUrl: "https://polar.sh/ai-dev/portal",
  };

module.exports = {
  ...profile,
  // Shown in the upgrade dialog and Help; keep it the same as the Polar product.
  price: "US$11.99",
};
