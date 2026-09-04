# Direct-email endpoint setup (one-time, ~15 minutes, free)

Makes the app's **EMAIL PDF** button send the PDF straight to
**target@interiorsurface.com** — no mail composer, no manual steps.

The app POSTs the generated PDF to a tiny Cloudflare Worker, which emails
it via Resend. Both services are free at this volume (Resend: 100
emails/day, 3,000/month; Workers: 100k requests/day).

## 1. Resend (the email sender)

1. Create a free account at https://resend.com
2. **Domains → Add Domain** → `interiorsurface.com` → add the DNS records
   it shows (SPF/DKIM) at your domain host → wait for **Verified**
   *(you must control the interiorsurface.com DNS for this — it's what
   authorizes sending as your domain)*
3. **API Keys → Create API Key** → copy it (shown once; don't share it,
   don't commit it, don't paste it into chat)

## 2. Cloudflare Worker (the endpoint)

1. Free account at https://dash.cloudflare.com → **Workers & Pages →
   Create → Worker** → name it e.g. `punch-mailer` → Deploy
2. **Edit code** → replace the contents with `worker.js` from this folder
   → Deploy
3. Worker → **Settings → Variables and Secrets**:
   - Add **Secret** `RESEND_API_KEY` = the key from step 1.3
   - Add **Variable** `FROM_ADDRESS` =
     `Punch Checklist <checklist@interiorsurface.com>`
     (any address at your verified domain)
4. Copy the worker URL, e.g. `https://punch-mailer.YOURNAME.workers.dev`

## 3. Connect the app

In `app.js`, set:

```js
const EMAIL_ENDPOINT = "https://punch-mailer.YOURNAME.workers.dev";
```

commit and push — done. EMAIL PDF now sends directly and shows
“PDF sent to target@interiorsurface.com”.

## Behavior & safety

- If the endpoint is unset or a send fails (offline job site, provider
  hiccup), the app automatically falls back to the share-sheet flow with
  the PDF attached — nothing is ever lost.
- The worker only accepts requests from `https://bpo311.github.io`
  (adjust `ALLOWED_ORIGIN` in worker.js if the app moves).
- Recipient is fixed server-side to target@interiorsurface.com.
- No credentials live in the app or in this repository.
