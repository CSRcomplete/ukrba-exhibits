// Paste into Wix: Dev Mode > Backend > http-functions.js
// Endpoint: https://www.ukrba.org/_functions/exhibitLead  (after publishing the site)
//
// Setup:
//  1. Wix Secrets Manager: add a secret named EXHIBITS_API_KEY (same value as the Railway variable).
//  2. Collection "Pledges" fields used: title (first name), surname, businessName, emailAddress,
//     mobileNumber, iPledge (boolean), contactConsent (boolean), refId.
//  3. The form also collects postcode, but the Pledges collection has no postcode field yet. To save it,
//     add a text field "postcode" to the collection and add `postcode: str(data.postcode),` to the insert.

import { ok, badRequest, forbidden, serverError } from "wix-http-functions";
import wixData from "wix-data";
import { getSecret } from "wix-secrets-backend";

const COLLECTION_ID = "Pledges";

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

    const str = (v) => String(v || "").trim();
    const firstName = str(data.firstName);
    const email = str(data.email);

    if (!firstName || !email) {
      return badRequest({ body: { ok: false, error: "firstName and email are required" } });
    }

    await wixData.insert(
      COLLECTION_ID,
      {
        title: firstName,
        surname: str(data.surname),
        businessName: str(data.businessName),
        emailAddress: email,
        mobileNumber: str(data.phone),
        iPledge: data.pledge === true,
        contactConsent: data.consent === true,
        refId: "shows",
      },
      { suppressAuth: true }
    );

    return ok({ body: { ok: true } });
  } catch (err) {
    console.error("exhibitLead failed", err);
    return serverError({ body: { ok: false, error: "Server error" } });
  }
}
