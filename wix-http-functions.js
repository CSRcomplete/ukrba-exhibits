// Paste into Wix: Dev Mode > Backend > http-functions.js
// Endpoint: https://www.ukrba.org/_functions/exhibitLead  (after publishing the site)
//
// Setup:
//  1. Wix Secrets Manager: add a secret named EXHIBITS_API_KEY (same value as the Railway variable).
//  2. Replace COLLECTION_ID below with your CMS collection ID.
//  3. Make sure the collection has fields with keys: name, email, phone, source, submittedAt.

import { ok, badRequest, forbidden, serverError } from "wix-http-functions";
import wixData from "wix-data";
import { getSecret } from "wix-secrets-backend";

const COLLECTION_ID = "YourCollectionID";

export async function post_exhibitLead(request) {
  try {
    const expectedKey = await getSecret("EXHIBITS_API_KEY");
    const providedKey = request.headers["x-api-key"];
    if (!expectedKey || !providedKey || providedKey !== expectedKey) {
      return forbidden({ body: { ok: false, error: "Forbidden" } });
    }

    let data;
    try {
      data = await request.body.json();
    } catch (e) {
      return badRequest({ body: { ok: false, error: "Invalid JSON" } });
    }

    const name = String((data && data.name) || "").trim();
    const email = String((data && data.email) || "").trim();
    const phone = String((data && data.phone) || "").trim();

    if (!name || !email) {
      return badRequest({ body: { ok: false, error: "name and email are required" } });
    }

    await wixData.insert(
      COLLECTION_ID,
      {
        name,
        email,
        phone,
        source: "exhibits",
        submittedAt: new Date(),
      },
      { suppressAuth: true }
    );

    return ok({ body: { ok: true } });
  } catch (err) {
    console.error("exhibitLead failed", err);
    return serverError({ body: { ok: false, error: "Server error" } });
  }
}
