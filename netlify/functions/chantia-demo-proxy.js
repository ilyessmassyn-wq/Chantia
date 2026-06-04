const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type", "access-control-allow-methods": "POST, OPTIONS", "content-type": "application/json" };

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: CORS, body: JSON.stringify({ text: "" }) };
  try {
    const { messages, system, tools } = JSON.parse(event.body || "{}");
    const payload = { model: "claude-haiku-4-5-20251001", max_tokens: 600, messages };
    if (system) payload.system = system;
    if (tools) payload.tools = tools;
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    const text = (d.content || []).filter(c => c.type === "text").map(c => c.text).join("\n");
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ text }) };
  } catch (e) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ text: "" }) };
  }
};
