/* Punch Checklist PWA — data model, auto-save, dashboard, checklist UI.
   Storage: checklist JSON in localStorage (instant, synchronous, crash-safe). */

"use strict";

/* ---------------- Template (exact wording from the supplied PDF) -------- */

const SECTIONS = [
  ["VCT Installation", [
    "Tile was installed in a consistent quarter-turned pattern throughout the entire area",
    "Tiles lay flush to the ground with no visible bubbling or joint lines",
    "Tile seams line up",
    "No excess adhesive present coming up through tile seams",
    "Installer thoroughly cleaned area and removed all excess scrap material, tools, and trash from the property",
    "Expansion joints properly filled to create a smooth surface"
  ]],
  ["Vestibule/Walk-Off Carpet Installation", [
    "Carpet tile installed in a consistent quarter-turned pattern throughout",
    "Carpet tiles lay flush to the ground",
    "Carpet seams line up",
    "Carpet edges tightly adhered and do not overlap",
    "Carpet tile is flush to all fixtures (walls, cart rails, EAS towers, etc)",
    "EAS towers are re-connected and operational",
    "Transition strips/Cove base securely fastened and even"
  ]],
  ["Sales Floor Carpet Installation", [
    "Carpet lays flush to the ground with no rippling or loose areas",
    "If tile, carpet is lined up and consistent with entire area",
    "Transition strips/Cove base securely fastened and even"
  ]],
  ["Fitting Room Flooring Installation", [
    "Transition strips/Cove base securely fastened and even",
    "Tile pattern is lined up and consistent throughout the entire area",
    "Tiles lay flush to the ground with no visible bubbling or joints",
    "No excess adhesive coming up through tile seams"
  ]],
  ["Overall Project Status", [
    "Installer thoroughly cleaned the area and removed all excess scrap material, tools, and trash from the property",
    "Is this project complete?"
  ]]
];

/* ---------------- Storage ---------------- */

const LS_KEY = "punchChecklists.v1";
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function loadAll() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
  catch { return []; }
}
function persistAll(list) { localStorage.setItem(LS_KEY, JSON.stringify(list)); }

let checklists = loadAll();
let current = null;          // checklist being edited
let saveTimer = null;

function newChecklist() {
  const cl = {
    id: uid(), storeNumber: "", completionDate: "",
    vendorRep: "", company: "", teamMember: "", role: "",
    deficiencies: "", status: "In Progress",
    signature: null,                 // Store Team Member signature (PNG dataURL)
    signatureDate: null,             // when it was saved
    vendorSignature: null,           // Installation Vendor Representative signature
    vendorSignatureDate: null,       // when it was saved
    created: Date.now(), modified: Date.now(), lastPDF: null,
    items: SECTIONS.flatMap(([section, qs]) =>
      qs.map(q => ({ id: uid(), section, question: q,
                     answer: "", comments: "", modified: Date.now() })))
  };
  checklists.unshift(cl);
  persistAll(checklists);
  return cl;
}

/* Auto-save: model mutates first (UI already updated), then persists.
   localStorage writes are synchronous — every change is crash-safe. */
function save(debounced) {
  setBadge("saving");
  if (current) current.modified = Date.now();
  clearTimeout(saveTimer);
  const commit = () => { persistAll(checklists); setBadge("saved"); };
  if (debounced) saveTimer = setTimeout(commit, 350);
  else commit();
}
window.addEventListener("pagehide", () => persistAll(checklists));
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") persistAll(checklists);
});

function setBadge(state) {
  document.querySelectorAll(".save-badge").forEach(el => {
    el.innerHTML = state === "saving"
      ? '<span class="dot saving"></span>Saving…'
      : '<span class="dot"></span>Saved';
  });
}

/* ---------------- Helpers ---------------- */

const esc = s => (s || "").replace(/[&<>"']/g,
  c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = ts => new Date(ts).toLocaleDateString(undefined,
  { month: "short", day: "numeric", year: "numeric" });
const title = cl => cl.storeNumber ? "Store " + cl.storeNumber : "New Checklist";
const unanswered = cl => cl.items.filter(i => !i.answer).length;

const XSVG = '<svg width="20" height="20" viewBox="0 0 20 20">' +
  '<path d="M2 2 L18 18 M18 2 L2 18" stroke="#111" stroke-width="3.4" stroke-linecap="round" fill="none"/></svg>';

/* ---------------- Router ---------------- */

function route() {
  const m = location.hash.match(/^#\/c\/(.+)$/);
  if (m) {
    current = checklists.find(c => c.id === m[1]) || null;
    if (current) return renderChecklist();
  }
  current = null;
  renderDashboard();
}
window.addEventListener("hashchange", route);

/* ---------------- Dashboard ---------------- */

function renderDashboard() {
  const app = document.getElementById("app");
  const cards = checklists.map(cl => `
    <div class="cl-card" onclick="location.hash='#/c/${cl.id}'">
      <div class="row1">
        <span class="title">${esc(title(cl))}</span>
        <span class="status">${esc(cl.status)}</span>
      </div>
      <div class="meta">
        <span>Created ${fmtDate(cl.created)}</span>
        <span>Modified ${fmtDate(cl.modified)}</span>
        ${unanswered(cl) ? `<span>${unanswered(cl)} unanswered</span>` : ""}
      </div>
      <div class="card-btns" onclick="event.stopPropagation()">
        <button class="btn outline mini" onclick="duplicateChecklist('${cl.id}')">Duplicate</button>
        <button class="btn outline mini" onclick="deleteChecklist('${cl.id}')">Delete</button>
      </div>
    </div>`).join("");

  app.innerHTML = `
    <div class="topnav"><h1>Punch Checklists</h1>
      <button class="btn" onclick="startNew()">+ New Checklist</button></div>
    <div class="dashboard">
      ${checklists.length ? `<div class="card-list">${cards}</div>` : `
        <div class="empty"><div class="big">☑</div>
          <h2>No checklists yet</h2>
          <button class="btn" onclick="startNew()">NEW CHECKLIST</button></div>`}
    </div>`;

  maybeOfferDraft();
}

let draftOffered = false;
function maybeOfferDraft() {
  if (draftOffered) return;
  draftOffered = true;
  const draft = checklists.find(c => c.status === "In Progress");
  if (draft && confirm(
    `Unfinished Checklist Found\n\nWould you like to continue your previous checklist for ${title(draft)}?`)) {
    location.hash = "#/c/" + draft.id;
  }
}

function startNew() {
  persistAll(checklists);                 // never lose pending changes
  const cl = newChecklist();
  location.hash = "#/c/" + cl.id;
}
function duplicateChecklist(id) {
  const src = checklists.find(c => c.id === id);
  if (!src) return;
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = uid();
  copy.created = copy.modified = Date.now();
  copy.lastPDF = null;
  copy.status = "In Progress";
  copy.items.forEach(i => { i.id = uid(); });
  checklists.unshift(copy);
  persistAll(checklists);
  renderDashboard();
}
function deleteChecklist(id) {
  const cl = checklists.find(c => c.id === id);
  if (!cl || !confirm(`Delete ${title(cl)}? This cannot be undone.`)) return;
  checklists = checklists.filter(c => c.id !== id);
  persistAll(checklists);
  renderDashboard();
}

/* ---------------- Checklist screen ---------------- */

function renderChecklist() {
  const cl = current;
  const app = document.getElementById("app");

  const sections = SECTIONS.map(([name]) => {
    const items = cl.items.filter(i => i.section === name);
    const rows = items.map(itemRowHTML).join("");
    const defs = name === "Overall Project Status" ? `
      <div class="defs">
        <label>Please list any additional outstanding deficiencies in the product or installation:</label>
        <textarea oninput="setField('deficiencies', this.value)">${esc(cl.deficiencies)}</textarea>
      </div>` : "";
    return `<div class="section-bar">${esc(name)}</div>${rows}${defs}`;
  }).join("");

  app.innerHTML = `
    <div class="topnav">
      <button class="btn-plain" style="color:#fff" onclick="location.hash=''">&larr; Checklists</button>
      <h1>Vendor Punch Checklist</h1>
      <span class="save-badge"><span class="dot"></span>Saved</span>
    </div>
    <div class="doc-wrap"><div class="doc">
      <div class="info-row">
        <div class="field"><label>Store T#:</label>
          <input value="${esc(cl.storeNumber)}" oninput="setField('storeNumber', this.value)" style="width:180px"></div>
        <div class="field"><label>Completion Date:</label>
          <input type="date" value="${esc(cl.completionDate)}" onchange="setField('completionDate', this.value, true)"></div>
      </div>
      ${sections}
      <div class="section-bar">Contact Information and Signature</div>
      <div class="contacts">
        <div class="field grow"><label>Installation Vendor Representative:</label>
          <input value="${esc(cl.vendorRep)}" oninput="setField('vendorRep', this.value)"></div>
        <div class="field grow"><label>Company:</label>
          <input value="${esc(cl.company)}" oninput="setField('company', this.value)"></div>
        <div class="field grow"><label>Installation Vendor Representative Signature:</label>
          <div class="sigbox" id="sigbox-vendor" onclick="openSignature('vendor')"></div>
          <div class="sig-note"></div></div>
        <div class="field grow"><label>Store Team Member:</label>
          <input value="${esc(cl.teamMember)}" oninput="setField('teamMember', this.value)"></div>
        <div class="field grow"><label>Role:</label>
          <input value="${esc(cl.role)}" oninput="setField('role', this.value)"></div>
        <div class="field grow"><label>Store Team Member Signature:</label>
          <div class="sigbox" id="sigbox-team" onclick="openSignature('team')"></div>
          <div class="sig-note"></div>
        </div>
      </div>
    </div></div>
    <div class="actionbar">
      <span class="warn" id="pdfWarn"></span><span class="spacer"></span>
      <button class="btn outline" onclick="doAction('preview')">PREVIEW</button>
      <button class="btn" onclick="doAction('save')">SAVE PDF</button>
      <button class="btn" onclick="doAction('email')">EMAIL PDF</button>
      <button class="btn" onclick="doAction('share')">SHARE PDF</button>
    </div>`;

  refreshSigBoxes();
  updateWarn();
}

/* Two signers: Store Team Member and Installation Vendor Representative. */
const SIGNERS = {
  team:   { sig: "signature",       date: "signatureDate",
            title: "Store Team Member Signature" },
  vendor: { sig: "vendorSignature", date: "vendorSignatureDate",
            title: "Installation Vendor Representative Signature" }
};
let sigTarget = "team";

function refreshSigBoxes() {
  if (!current) return;
  for (const key of Object.keys(SIGNERS)) {
    const box = document.getElementById("sigbox-" + key);
    if (!box) continue;
    const f = SIGNERS[key];
    const sig = current[f.sig];
    box.innerHTML = sig
      ? `<img src="${sig}" alt="${f.title}">`
      : `<span class="signhere">SIGN HERE</span>`;
    const note = box.nextElementSibling;
    if (note) note.textContent = sig
      ? `Signed ${new Date(current[f.date] || current.modified).toLocaleDateString()} — tap to view, replace, or clear.`
      : "Tap to sign — finger or Apple Pencil. Tap an existing signature to view, replace, or clear it.";
  }
}

/* ---------------- Signature capture ----------------
   Real handwritten input on a canvas (pointer events cover finger, Apple
   Pencil, and mouse). Stored as a high-resolution PNG dataURL on the
   checklist record — persisted with everything else, survives app close /
   termination / restart, and is rendered into the PDF. */

let sigHasInk = false, sigDrawn = false, sigLast = null, sigScale = 2;

function sigCanvasSetup() {
  const c = document.getElementById("sigCanvas");
  const logicalW = Math.min(760, window.innerWidth - 60);
  const logicalH = Math.min(320, Math.max(240, window.innerHeight - 220));
  sigScale = Math.max(window.devicePixelRatio || 1, 2);   // print-sharp
  c.width = logicalW * sigScale;
  c.height = logicalH * sigScale;
  c.style.width = logicalW + "px";
  c.style.height = logicalH + "px";
  const ctx = c.getContext("2d");
  ctx.setTransform(sigScale, 0, 0, sigScale, 0, 0);
  ctx.clearRect(0, 0, logicalW, logicalH);   // transparent PNG for the PDF
  ctx.lineCap = ctx.lineJoin = "round";
  ctx.strokeStyle = "#101010";
  return c;
}

function sigBind(c) {
  if (c._bound) return;
  c._bound = true;
  const ctx = c.getContext("2d");
  const pos = e => {
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, p: e.pressure || 0.5 };
  };
  c.addEventListener("pointerdown", e => {
    e.preventDefault();
    c.setPointerCapture(e.pointerId);
    sigLast = pos(e);
    sigHasInk = sigDrawn = true;
    ctx.beginPath();                       // dot for taps
    ctx.arc(sigLast.x, sigLast.y, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = "#101010";
    ctx.fill();
  });
  c.addEventListener("pointermove", e => {
    if (!sigLast) return;
    e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of evs) {
      const p = pos(ev);
      ctx.lineWidth = 1.6 + p.p * 2.2;     // pressure-sensitive with Pencil
      ctx.beginPath();
      ctx.moveTo(sigLast.x, sigLast.y);
      ctx.quadraticCurveTo(sigLast.x, sigLast.y,
                           (sigLast.x + p.x) / 2, (sigLast.y + p.y) / 2);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      sigLast = p;
    }
  });
  const end = () => { sigLast = null; };
  c.addEventListener("pointerup", end);
  c.addEventListener("pointercancel", end);
}

function openSignature(target) {
  sigTarget = target || "team";
  const f = SIGNERS[sigTarget];
  document.getElementById("sigModalTitle").textContent = f.title;
  const c = sigCanvasSetup();
  sigBind(c);
  sigHasInk = false;
  sigDrawn = false;
  // Existing signature: load it for viewing / replacing / clearing.
  if (current[f.sig]) {
    const img = new Image();
    img.onload = () => {
      const ctx = c.getContext("2d");
      const lw = parseFloat(c.style.width), lh = parseFloat(c.style.height);
      const w = img.width / sigScale, h = img.height / sigScale;
      const fit = Math.min(lw / w, lh / h, 1);
      ctx.drawImage(img, (lw - w * fit) / 2, (lh - h * fit) / 2, w * fit, h * fit);
      sigHasInk = true;
    };
    img.src = current[f.sig];
  }
  document.getElementById("sigModal").classList.remove("hidden");
}

function clearSignature() {
  sigCanvasSetup();          // repaint blank
  sigHasInk = false;
  sigDrawn = true;           // user made a deliberate change
}

function cancelSignature() {
  document.getElementById("sigModal").classList.add("hidden");
}

function saveSignature() {
  const c = document.getElementById("sigCanvas");
  const f = SIGNERS[sigTarget];
  current[f.sig] = sigHasInk ? c.toDataURL("image/png") : null;
  current[f.date] = sigHasInk ? Date.now() : null;   // captured at signing
  current.modified = Date.now();
  save(false);               // persisted immediately with the checklist
  refreshSigBoxes();
  cancelSignature();
}

function itemRowHTML(item) {
  const boxes = [["YES", "yes"], ["NO", "no"], ["N/A", "na"]].map(([lbl, val]) => `
    <button class="ans" onclick="tapAnswer('${item.id}','${val}')">
      <span class="lbl">${lbl}</span>
      <span class="box" id="box-${item.id}-${val}">${item.answer === val ? XSVG : ""}</span>
    </button>`).join("");
  return `
    <div class="item">
      <div class="qrow">
        <div class="q">${esc(item.question)}</div>
        <div class="answers">${boxes}</div>
      </div>
      <div class="comments"><label>Comments</label>
        <textarea oninput="setComment('${item.id}', this.value)">${esc(item.comments)}</textarea>
      </div>
    </div>`;
}

/* Instant X: DOM + model update first, then persist. */
function tapAnswer(itemId, val) {
  const item = current.items.find(i => i.id === itemId);
  item.answer = item.answer === val ? "" : val;   // exclusive; tap again clears
  item.modified = Date.now();
  ["yes", "no", "na"].forEach(v => {
    document.getElementById(`box-${itemId}-${v}`).innerHTML =
      item.answer === v ? XSVG : "";
  });
  updateWarn();
  save(false);                                    // immediate
}

function setComment(itemId, text) {
  const item = current.items.find(i => i.id === itemId);
  item.comments = text;
  item.modified = Date.now();
  save(true);                                     // debounced while typing
}
function setField(key, value, immediate) {
  current[key] = value;
  save(!immediate);
  if (key === "storeNumber") updateWarn();
}
function updateWarn() {
  const el = document.getElementById("pdfWarn");
  if (!el || !current) return;
  el.textContent = (current.lastPDF && current.modified > current.lastPDF)
    ? "⚠ Modified since last PDF" : "";
}

/* ---------------- PDF actions ---------------- */

/* Punch checklist PDFs are always emailed to Interior Surface. */
const EMAIL_TO = "target@interiorsurface.com";

async function doAction(kind) {
  persistAll(checklists);                          // final automatic save
  const n = unanswered(current);
  if (n > 0 && kind !== "preview") {
    if (!confirm(`${n} checklist item${n === 1 ? " has" : "s have"} not been answered. Would you like to continue?`))
      return;                                      // GO BACK
  }
  const { blob, fileName } = await buildChecklistPDF(current);

  if (kind === "preview") {
    const url = URL.createObjectURL(blob);
    document.getElementById("previewFrame").src = url;
    document.getElementById("previewModal").classList.remove("hidden");
    return;
  }

  if (kind === "save") {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();                                     // iPad: saves via Files
    markPDF();
    return;
  }

  // EMAIL / SHARE — native share sheet with the PDF attached automatically.
  const file = new File([blob], fileName, { type: "application/pdf" });
  const store = current.storeNumber || "TXXXX";
  const bodyText = `Please see the attached completed vendor punch checklist for Store ${store}.`;

  if (kind === "email") {
    // The Web Share sheet cannot pre-fill a recipient, so put the address
    // on the clipboard (paste into the To: field) and in the email body.
    try { await navigator.clipboard.writeText(EMAIL_TO); } catch (e) {}
  }

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Vendor Punch Checklist - ${store}`,
        text: kind === "email"
          ? `To: ${EMAIL_TO}\n\n${bodyText}\n\n(Recipient address copied — paste into the To: field.)`
          : bodyText
      });
      markPDF();
    } catch (e) { /* user cancelled — data untouched */ }
  } else {
    // Fallback (desktop browsers): download, then open a pre-addressed draft.
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    if (kind === "email") {
      location.href = `mailto:${EMAIL_TO}?subject=${encodeURIComponent(
        "Vendor Punch Checklist - " + store)}&body=${encodeURIComponent(
        bodyText + ` (PDF downloaded — attach the file "${fileName}".)`)}`;
    }
    markPDF();
  }
}
function markPDF() {
  current.lastPDF = Date.now();
  save(false);
  updateWarn();
}
function closePreview() {
  document.getElementById("previewModal").classList.add("hidden");
  document.getElementById("previewFrame").src = "about:blank";
}

/* ---------------- Offline (PWA) ---------------- */

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

/* Demo seed for testing: index.html?demo=1 creates a sample checklist.
   ?reset=1 wipes storage first. */
if (location.search.includes("reset")) {
  localStorage.removeItem(LS_KEY);
  checklists = [];
}
function demoSignature() {
  const c = document.createElement("canvas");
  c.width = 900; c.height = 260;
  const x = c.getContext("2d");
  x.lineCap = x.lineJoin = "round";
  x.strokeStyle = "#101010";
  x.lineWidth = 5;
  x.beginPath();
  x.moveTo(60, 180);
  x.bezierCurveTo(90, 60, 150, 60, 160, 150);
  x.bezierCurveTo(168, 210, 120, 220, 110, 180);
  x.bezierCurveTo(180, 120, 240, 100, 300, 150);
  x.bezierCurveTo(340, 185, 360, 120, 400, 140);
  x.bezierCurveTo(450, 165, 470, 100, 530, 130);
  x.bezierCurveTo(580, 155, 620, 110, 690, 135);
  x.bezierCurveTo(740, 152, 780, 130, 830, 120);
  x.stroke();
  x.lineWidth = 4;
  x.beginPath();
  x.moveTo(340, 200); x.lineTo(720, 190);
  x.stroke();
  return c.toDataURL("image/png");
}
if (location.search.includes("demo") && !checklists.length) {
  const cl = newChecklist();
  cl.storeNumber = "T1234";
  cl.completionDate = "2026-02-18";
  cl.vendorRep = "Mike Alvarez — (555) 214-8890";
  cl.company = "Precision Floor Systems LLC";
  cl.teamMember = "Dana Whitfield";
  cl.role = "Store Manager";
  cl.deficiencies = "1. VCT seam misalignment near register 4 — vendor returning 2/20.\n2. Carpet tile gap at east entrance cart rail.";
  cl.items.forEach((it, i) => { it.answer = "yes"; });
  cl.items[2].answer = "no";
  cl.items[2].comments = "Seam misalignment near register 4 — installer scheduled to correct 2/20.";
  cl.items[11].answer = "na";
  cl.items[11].comments = "No EAS towers at this location.";
  cl.items[5].answer = "";
  cl.items[21].answer = "no";
  cl.items[21].comments = "Pending seam correction in VCT area and cart rail gap in vestibule.";
  cl.signature = demoSignature();
  cl.signatureDate = Date.now();
  cl.vendorSignature = demoSignature();
  cl.vendorSignatureDate = Date.now();
  persistAll(checklists);
  draftOffered = true;
  location.hash = "#/c/" + cl.id;
}

route();
