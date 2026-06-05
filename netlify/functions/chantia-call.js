const OPENING = "Bonjour 👋 Réponse automatique : l'artisan est sur un chantier, je prends votre demande pour qu'il vous rappelle vite. C'est pour quel type de travaux ?";

exports.handler = async (event) => {
  const H = { "content-type": "text/xml" };
  try {
    const p = new URLSearchParams(event.body || "");
    const caller = p.get("From") || "";
    const twilioNumber = p.get("To") || "";
    const SID = process.env.TWILIO_ACCOUNT_SID, TOKEN = process.env.TWILIO_AUTH_TOKEN;

    if (caller && twilioNumber && SID && TOKEN) {
      const form = new URLSearchParams({ From: twilioNumber, To: caller, Body: OPENING });
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
        method: "POST",
        headers: { authorization: "Basic " + Buffer.from(`${SID}:${TOKEN}`).toString("base64"), "content-type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
      const SB = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_KEY;
      if (SB && KEY) {
        try { await fetch(`${SB}/rest/v1/messages`, { method: "POST", headers: { apikey: KEY, authorization: `Bearer ${KEY}`, "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify([{ wa_phone: caller, role: "assistant", content: OPENING }]) }); } catch {}
      }
    }
    return { statusCode: 200, headers: H, body: `<?xml version="1.0" encoding="UTF-8"?><Response><Reject reason="busy"/></Response>` };
  } catch (e) {
    return { statusCode: 200, headers: H, body: `<?xml version="1.0" encoding="UTF-8"?><Response><Reject/></Response>` };
  }
};
