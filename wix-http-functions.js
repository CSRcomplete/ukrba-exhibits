// Paste into Wix: Dev Mode > Backend > http-functions.js
// Endpoint: https://www.ukrba.org/_functions/exhibitLead  (after publishing the site)
//
// Setup:
//  1. Wix Secrets Manager: add a secret named EXHIBITS_API_KEY (same value as the Railway variable).
//  2. Replace COLLECTION_ID below with your CMS collection ID.
//  3. Make sure the collection has fields with these keys (rename the keys on the left of the
//     insert below if your collection uses different ones):
//     firstName, surname, businessName, postcode, email, phone, pledge, consent, source, submittedAt

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

    const str = (v) => String((data && v) || "").trim();
    const firstName = str(data.firstName);
    const surname = str(data.surname);
    const email = str(data.email);

    if (!firstName || !email) {
      return badRequest({ body: { ok: false, error: "firstName and email are required" } });
    }

    await wixData.insert(
      COLLECTION_ID,
      {
        firstName,
        surname,
        businessName: str(data.businessName),
        postcode: str(data.postcode),
        email,
        phone: str(data.phone),
        pledge: data.pledge === true,
        consent: data.consent === true,
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
