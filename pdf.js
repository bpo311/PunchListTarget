/* Punch Checklist PWA — PDF generation (jsPDF).
   Mirrors the original single-page "TXXXX CBAR-Vendor Punch Checklist":
   red Target bullseye heading, bordered grid (Question | YES | NO | N/A |
   Comments), shaded section rows, drawn X marks, deficiencies, contacts,
   signature box — compacted so the entire form fits on ONE Letter page. */

"use strict";

async function buildChecklistPDF(cl) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "letter" }); // 612 x 792

  const M = 36, W = 612 - M * 2;                 // margin, content width (540)
  const COLS = [0, 256, 282, 308, 334, W];       // Q | YES | NO | N/A | Comments
  const RED = [204, 0, 0], BLACK = [17, 17, 17];
  const SEC_FILL = 209, HEAD_FILL = 235;
  const BOTTOM = 792 - M - 14;

  let y = M;
  const store = cl.storeNumber || "TXXXX";
  const heading = `${store} CBAR Flooring Projects Checklist`;
  const headingNote = "PML to complete with vendor";

  /* ---------- primitives ---------- */

  const setFont = (size, bold, color) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(color || BLACK));
  };
  const lineH = size => size * 1.16;

  function wrap(text, size, bold, width) {
    setFont(size, bold);
    return doc.splitTextToSize(text || "", width);
  }
  function drawLines(lines, x, ty, size, bold, color) {
    setFont(size, bold, color);
    lines.forEach((ln, i) => doc.text(ln, x, ty + lineH(size) * (i + 0.82)));
  }
  function rect(x, ry, w, h, fillGray) {
    if (fillGray != null) {
      doc.setFillColor(fillGray, fillGray, fillGray);
      doc.rect(x, ry, w, h, "F");
    }
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.8);
    doc.rect(x, ry, w, h);
  }
  function gridRow(ry, h) {
    rect(M, ry, W, h);
    doc.setLineWidth(0.6);
    for (let i = 1; i < 5; i++)
      doc.line(M + COLS[i], ry, M + COLS[i], ry + h);
  }
  function drawX(cx, cy, r) {
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(1.5);
    doc.setLineCap("round");
    doc.line(cx - r, cy - r, cx + r, cy + r);
    doc.line(cx + r, cy - r, cx - r, cy + r);
  }

  /* ---------- pagination (only reached by very long comments) ---------- */

  function ensure(h) {
    if (y + h <= BOTTOM) return;
    doc.addPage();
    y = M;
    setFont(8, true, [100, 100, 100]);
    doc.text(`${heading} (continued)`, M, y + 5);
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.5);
    doc.line(M, y + 10, M + W, y + 10);
    y += 20;
  }

  /* ---------- brand header (compact) ---------- */

  function bullseye(cx, cy, r) {
    doc.setFillColor(...RED); doc.circle(cx, cy, r, "F");
    doc.setFillColor(255, 255, 255); doc.circle(cx, cy, r * 2 / 3, "F");
    doc.setFillColor(...RED); doc.circle(cx, cy, r / 3, "F");
  }
  bullseye(M + 14, y + 14, 13);
  setFont(13, true, RED);
  doc.text(heading, M + W / 2 + 10, y + 18, { align: "center" });
  // Grey note next to the heading.
  setFont(8, false, [120, 120, 120]);
  doc.text(headingNote, M + W, y + 18, { align: "right" });
  doc.setDrawColor(...RED);
  doc.setLineWidth(1.6);
  doc.line(M, y + 32, M + W, y + 32);
  y += 40;

  /* ---------- store / date row ---------- */

  const dateTxt = cl.completionDate
    ? new Date(cl.completionDate + "T00:00:00").toLocaleDateString() : "";
  rect(M, y, 66, 16); rect(M + 66, y, 200, 16);
  rect(M + 266, y, 92, 16); rect(M + 358, y, W - 358, 16);
  setFont(7.5, true); doc.text("Store T#:", M + 4, y + 11);
  setFont(8, false); doc.text(cl.storeNumber || "", M + 70, y + 11);
  setFont(7.5, true); doc.text("Completion Date:", M + 270, y + 11);
  setFont(8, false); doc.text(dateTxt, M + 362, y + 11);
  y += 16;

  /* ---------- table rows (compact) ---------- */

  function sectionRow(t) {
    ensure(13 + 10 + 12);
    rect(M, y, W, 13, SEC_FILL);
    setFont(9, true);
    doc.text(t, M + 4, y + 9.5);
    y += 13;
    rect(M, y, W, 10, HEAD_FILL);
    doc.setLineWidth(0.6);
    for (let i = 1; i < 5; i++) doc.line(M + COLS[i], y, M + COLS[i], y + 10);
    setFont(6.5, true);
    ["YES", "NO", "N/A"].forEach((t2, i) =>
      doc.text(t2, M + COLS[i + 1] + 13, y + 7.2, { align: "center" }));
    doc.text("Comments", M + COLS[4] + 4, y + 7.2);
    y += 10;
  }

  function questionRow(item) {
    const qLines = wrap(item.question, 7, false, 248);
    const cLines = wrap((item.comments || "").trim(), 7, false, 198);
    const h = Math.max(qLines.length * lineH(7), cLines.length * lineH(7), 8) + 4.5;
    ensure(h);
    gridRow(y, h);
    drawLines(qLines, M + 4, y + 1.5, 7, false);
    const idx = { yes: 1, no: 2, na: 3 }[item.answer];
    if (idx) drawX(M + COLS[idx] + 13, y + Math.min(h / 2, 7.5), 3.4);
    if (cLines.length) drawLines(cLines, M + COLS[4] + 4, y + 1.5, 7, false);
    y += h;
  }

  for (const [name] of SECTIONS) {
    sectionRow(name);
    for (const item of cl.items.filter(i => i.section === name))
      questionRow(item);
    if (name === "Overall Project Status") {
      const label = "Please list any additional outstanding deficiencies in the product or installation:";
      const dLines = wrap((cl.deficiencies || "").trim(), 7, false, W - 8);
      const dh = Math.max(dLines.length * lineH(7) + 16, 40);
      ensure(dh);
      rect(M, y, W, dh);
      drawLines(wrap(label, 7, true, W - 8), M + 4, y + 1.5, 7, true);
      if (dLines.length) drawLines(dLines, M + 4, y + 11, 7, false);
      y += dh;
    }
  }

  /* ---------- contacts (compact) ---------- */

  const contacts = [
    ["Installation Vendor Representative:", cl.vendorRep],
    ["Company:", cl.company],
    ["Store Team Member:", cl.teamMember],
    ["Role:", cl.role]
  ];
  for (const [label, value] of contacts) {
    ensure(14);
    rect(M, y, 190, 14); rect(M + 190, y, W - 190, 14);
    setFont(7, true); doc.text(label, M + 4, y + 9.5);
    setFont(7.5, false); doc.text(value || "", M + 194, y + 9.5);
    y += 14;
  }

  /* ---------- signature boxes (vendor rep + store team member) ---------- */

  const signers = [
    ["Installation Vendor Representative Signature:", cl.vendorSignature, cl.vendorSignatureDate],
    ["Store Team Member Signature:", cl.signature, cl.signatureDate]
  ];
  for (const [label, sig, sigDate] of signers) {
    const sigBoxH = 44;
    ensure(sigBoxH + 5);
    y += 3;
    rect(M, y, W, sigBoxH);
    setFont(7.5, true);
    doc.text(label, M + 4, y + 10);
    const labelW = doc.getTextWidth(label);
    const sigLineY = y + sigBoxH - 9;
    const lineX0 = M + 8 + labelW + 8;
    doc.setLineWidth(0.6);
    doc.line(lineX0, sigLineY, M + W * 0.62, sigLineY);
    doc.text("Date:", M + W * 0.7, sigLineY - 8);
    doc.line(M + W * 0.7 + 24, sigLineY, M + W - 8, sigLineY);
    // Date auto-filled when the signature was saved; blank when unsigned
    // (so a printed copy can be signed and dated by hand).
    if (sig && sigDate) {
      setFont(8, false);
      doc.text(new Date(sigDate).toLocaleDateString(),
               M + W * 0.7 + 30, sigLineY - 3);
    }
    // Render the captured handwritten signature above the line.
    if (sig) {
      try {
        const dim = await imageSize(sig);
        const areaW = M + W * 0.62 - lineX0 - 4, areaH = sigBoxH - 10;
        const s = Math.min(areaW / dim.w, areaH / dim.h);
        doc.addImage(sig, "PNG",
                     lineX0 + 2, sigLineY - 2 - dim.h * s,
                     dim.w * s, dim.h * s);
      } catch (e) { /* unreadable image — leave line blank */ }
    }
    y += sigBoxH + 2;
  }

  /* ---------- page numbers ---------- */

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    setFont(7, false, [110, 110, 110]);
    doc.text(`Page ${p} of ${total}`, 612 / 2, 792 - 18, { align: "center" });
  }

  /* ---------- filename ---------- */

  const dateName = cl.completionDate || "Draft";
  const fileName = `${store} - Vendor Punch Checklist - ${dateName}.pdf`
    .replace(/[/\\?%*|"<>:]/g, "");

  return { blob: doc.output("blob"), fileName };
}

function imageSize(dataURL) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => res({ w: img.width, h: img.height });
    img.src = dataURL;
  });
}
