/* Punch Checklist email worker (Cloudflare Workers, free tier).
   Receives the generated PDF from the app and emails it directly to
   Interior Surface via the Resend API. Not served by GitHub Pages —
   deploy this at dash.cloudflare.com (see README.md in this folder).

   Secrets/vars to configure on the Worker (never in code / never in git):
     RESEND_API_KEY  (secret)  — from resend.com
     FROM_ADDRESS    (var)     — e.g. "Punch Checklist <checklist@interiorsurface.com>"
*/

const TO_ADDRESS = "target@interiorsurface.com";
const ALLOWED_ORIGIN = "https://bpo311.github.io";
const MAX_PDF_BYTES = 8 * 1024 * 1024; // 8 MB safety cap

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (request.method !== "POST") {
      return new Response("POST only", { status: 405, headers: corsHeaders() });
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return new Response("Bad JSON", { status: 400, headers: corsHeaders() });
    }

    const { fileName, pdfBase64, store } = payload;
    if (!fileName || !pdfBase64) {
      return new Response("Missing fileName/pdfBase64", {
        status: 400, headers: corsHeaders()
      });
    }
    if (pdfBase64.length * 0.75 > MAX_PDF_BYTES) {
      return new Response("PDF too large", { status: 413, headers: corsHeaders() });
    }

    const storeLabel = store || "TXXXX";
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: env.FROM_ADDRESS,
        to: [TO_ADDRESS],
        subject: `Vendor Punch Checklist - ${storeLabel}`,
        text: `Please see the attached completed vendor punch checklist for Store ${storeLabel}.`,
        attachments: [{ filename: fileName, content: pdfBase64 }]
      })
    });

    if (!resp.ok) {
      const detail = await resp.text();
      return new Response(`Email provider error: ${detail}`, {
        status: 502, headers: corsHeaders()
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders() }
    });
  }
};
