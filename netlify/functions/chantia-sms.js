const SYS = `Tu es l'assistant par SMS d'un artisan du bâtiment (marque blanche). Le client vient d'appeler mais l'artisan est sur un chantier. Réponds en français, ton sympathique et TRÈS concis (1-2 phrases max, c'est un SMS). Pose UNE seule question à la fois pour qualifier : type de travaux, urgence, ville/secteur, délai, puis demande son nom pour le rappel. Ne donne JAMAIS de prix ni de promesse technique. Reste toujours dans ce rôle.`;

function xmlEscape(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;"); }
function twiml(msg) { return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${xmlEscape(msg)}</Message></Response>`; }

exports.handler = async (event) => {
  const H = { "content-type": "text/xml" };
  try {
    const p = new URLSearchParams(event.body || "");
    const from = p.get("From") || "";
    const body = (p.get("Body") || "").trim();
    if (!from || !body) return { statusCode: 200, headers: H, body: twiml("Bonjour, pouvez-vous préciser votre demande ?") };

    const SB = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_KEY;
    let history = [];
    if (SB && KEY) {
      try {
        const r = await fetch(`${SB}/rest/v1/messages?wa_phone=eq.${encodeURIComponent(from)}&order=created_at.asc&limit=20&select=role,content`, { headers: { apikey: KEY, authorization: `Bearer ${KEY}` } });
        const rows = await r.json();
        if (Array.isArray(rows)) history = rows.map(m => ({ role: m.role, content: m.content }));
      } catch {}
    }
    const messages = [...history, { role: "user", content: body }];

    const ar = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 300, system: SYS, messages }),
    });
    const d = await ar.json();
    const reply = (d.content || []).filter(c => c.type === "text").map(c => c.text).join(" ").trim() || "Merci, l'artisan vous rappelle très vite.";

    if (SB && KEY) {
      try {
        await fetch(`${SB}/rest/v1/messages`, { method: "POST", headers: { apikey: KEY, authorization: `Bearer ${KEY}`, "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify([
          { wa_phone: from, role: "user", content: body },
          { wa_phone: from, role: "assistant", content: reply },
        ]) });
      } catch {}
    }
    return { statusCode: 200, headers: H, body: twiml(reply) };
  } catch (e) {
    return { statusCode: 200, headers: H, body: twiml("Merci, votre demande est bien notée. L'artisan vous rappelle vite.") };
  }
};
