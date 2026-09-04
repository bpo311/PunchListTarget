# CBAR Flooring Projects Checklist (Punch Checklist PWA)

An offline-first iPad web application that replaces the paper
**TXXXX CBAR Vendor Punch Checklist** used on flooring job-site walkthroughs.

## What it does

- Digital checklist with the exact sections/questions of the paper form
  (VCT, Vestibule/Walk-Off Carpet, Sales Floor Carpet, Fitting Room,
  Overall Project Status)
- Tap **YES / NO / N/A** — an X appears instantly; answers are mutually
  exclusive; tap again to clear
- Per-item comments, outstanding deficiencies, project + contact info
- Handwritten signatures (finger / Apple Pencil) for the **Installation
  Vendor Representative** and the **Store Team Member**, each date-stamped
  when signed
- **Auto-saves every change** locally (localStorage) — survives closing the
  browser, restarting the iPad, and working with no internet connection
- Multiple checklists, duplicate/delete, draft recovery on launch
- One-page **PDF** that mirrors the original Target form (red bullseye
  heading, bordered grid, X marks, signatures) with
  **PREVIEW / SAVE PDF / EMAIL PDF / SHARE PDF** actions
  (emails default to target@interiorsurface.com)
- Installable PWA: on the iPad open the site in Safari → Share →
  **Add to Home Screen** (red checkmark icon); runs full-screen and offline

## Technology

Plain static web app — no framework, no build step.

| | |
|---|---|
| Entry point | `index.html` |
| Logic | `app.js` (checklist/auto-save/signatures), `pdf.js` (jsPDF output) |
| Offline | `sw.js` service worker + `manifest.webmanifest` |
| PDF library | jsPDF from CDN (cached by the service worker for offline use) |
| Data | Browser `localStorage` (per-device, offline-first — no backend) |

`test-pdf.html` is a development-only harness that renders the stored
checklist's PDF for inspection.

## Run locally

No build required. Either open `index.html` directly in a browser, or (for
service-worker/offline testing) serve the folder with any static server:

```bash
# examples — use whichever you have
python -m http.server 8080
npx serve .
```

Then open http://localhost:8080. Append `?demo=1` to seed a sample
checklist, `?reset=1` to clear stored data.

## Build

There is no build step — the repository contents are the production site.

## Deployment (GitHub Pages)

Pushing to `main` triggers `.github/workflows/deploy.yml`, which uploads
the repository as-is to GitHub Pages (Settings → Pages → Source must be
set to **GitHub Actions**).

Live site: `https://<USERNAME>.github.io/<REPOSITORY>/`

All asset paths are relative, so the app works correctly from the
repository subpath. Data is stored per-origin in the visitor's browser —
deployment never touches user data.

## Update workflow

```
edit code → git add . → git commit -m "..." → git push
          → GitHub Actions builds → GitHub Pages updates (~1 minute)
```
