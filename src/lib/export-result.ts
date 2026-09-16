function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "result";
}

function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&" + "amp;")
    .replace(/</g, "&" + "lt;")
    .replace(/>/g, "&" + "gt;")
    .replace(/"/g, "&" + "quot;");
}

function latin1(text: string) {
  const map: Record<string, string> = {
    "’": "'",
    "‘": "'",
    "“": '"',
    "”": '"',
    "–": "-",
    "—": "-",
    "…": "...",
    "•": "-",
  };
  return [...text]
    .map((ch) => {
      const c = ch.charCodeAt(0);
      if (c === 10 || c === 13 || (c >= 32 && c <= 126)) return ch;
      if (c === 9) return "  ";
      if (map[ch]) return map[ch];
      return c < 256 ? ch : "?";
    })
    .join("");
}

function wrap(text: string, width: number) {
  const lines: string[] = [];
  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = raw.length ? raw : " ";
    if (line.length <= width) {
      lines.push(line);
      continue;
    }
    let rest = line;
    while (rest.length > width) {
      let cut = rest.lastIndexOf(" ", width);
      if (cut < width * 0.5) cut = width;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut).trimStart();
    }
    if (rest) lines.push(rest);
  }
  return lines;
}

function pdfEscape(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildPdf(title: string, body: string) {
  const header = latin1(title);
  const lines = wrap(latin1(body), 90);
  const linesPerPage = 48;
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) pages.push(lines.slice(i, i + linesPerPage));
  if (!pages.length) pages.push([""]);

  const pageIds = pages.map((_, i) => 3 + i * 2);
  const contentIds = pages.map((_, i) => 4 + i * 2);
  const fontId = 3 + pages.length * 2;
  const pageRefs = pageIds.map((id) => `${id} 0 R`).join(" ");

  const store: { id: number; data: string }[] = [
    { id: 1, data: "<< /Type /Catalog /Pages 2 0 R >>" },
    { id: 2, data: `<< /Type /Pages /Kids [${pageRefs}] /Count ${pages.length} >>` },
  ];

  pages.forEach((pageLines, i) => {
    store.push({
      id: pageIds[i],
      data: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentIds[i]} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`,
    });
    const ops = [
      "BT",
      "/F1 11 Tf",
      "16 TL",
      "54 740 Td",
      `(${pdfEscape("STACKS  ·  " + header)}) Tj`,
      "T*",
      "/F1 9 Tf",
      `(${pdfEscape("Generated on stacks.ng  ·  text result")}) Tj`,
      "T*",
      "T*",
      "/F1 11 Tf",
    ];
    for (const line of pageLines) {
      ops.push(`(${pdfEscape(line)}) Tj`, "T*");
    }
    ops.push("ET");
    const stream = ops.join("\n");
    store.push({
      id: contentIds[i],
      data: `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    });
  });
  store.push({ id: fontId, data: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>" });
  store.sort((a, b) => a.id - b.id);

  const chunks = ["%PDF-1.4\n"];
  const xref: number[] = [0];
  let cursor = chunks[0].length;
  for (const item of store) {
    const chunk = `${item.id} 0 obj\n${item.data}\nendobj\n`;
    xref[item.id] = cursor;
    chunks.push(chunk);
    cursor += chunk.length;
  }
  const xrefStart = cursor;
  const maxId = store[store.length - 1].id;
  let table = `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= maxId; i++) {
    table += `${String(xref[i] ?? 0).padStart(10, "0")} 00000 n \n`;
  }
  chunks.push(table);
  chunks.push(`trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);
  return chunks.join("");
}

export async function downloadUrlFile(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("fetch");
    const blob = await res.blob();
    triggerDownload(filename, blob);
  } catch {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

export function downloadTextResult(toolName: string, text: string, format: "txt" | "pdf" | "html" | "doc") {
  const base = slug(toolName) + "-result";
  if (format === "txt") {
    triggerDownload(`${base}.txt`, new Blob([text], { type: "text/plain;charset=utf-8" }));
    return;
  }
  if (format === "html") {
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(toolName)} · Stacks</title>
  <style>
    body { margin: 0; background: #f3f6f4; color: #101412; font: 16px/1.55 ui-sans-serif, system-ui, sans-serif; }
    main { max-width: 720px; margin: 48px auto; padding: 32px; background: #fff; border: 1px solid #d7e0da; border-radius: 24px; }
    p.kicker { letter-spacing: .2em; text-transform: uppercase; color: #008151; font-size: 11px; font-weight: 600; }
    h1 { margin: 8px 0 24px; font-size: 28px; }
    pre { white-space: pre-wrap; word-break: break-word; background: #f3f6f4; padding: 20px; border-radius: 16px; }
    footer { margin-top: 28px; color: #6b756f; font-size: 13px; }
  </style>
</head>
<body>
  <main>
    <p class="kicker">Stacks</p>
    <h1>${escapeHtml(toolName)}</h1>
    <pre>${escapeHtml(text)}</pre>
    <footer>Generated on stacks.ng · text result from the tool library.</footer>
  </main>
</body>
</html>`;
    triggerDownload(`${base}.html`, new Blob([html], { type: "text/html;charset=utf-8" }));
    return;
  }
  if (format === "doc") {
    const doc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(toolName)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 12pt; color: #101412; }
  h1 { font-size: 20pt; }
  p.kicker { color: #008151; font-size: 10pt; letter-spacing: 2px; text-transform: uppercase; }
  pre { white-space: pre-wrap; font-family: Calibri, Arial, sans-serif; }
</style>
</head>
<body>
  <p class="kicker">STACKS</p>
  <h1>${escapeHtml(toolName)}</h1>
  <pre>${escapeHtml(text)}</pre>
  <p>Generated on stacks.ng</p>
</body>
</html>`;
    triggerDownload(`${base}.doc`, new Blob(["\uFEFF" + doc], { type: "application/msword" }));
    return;
  }
  triggerDownload(`${base}.pdf`, new Blob([buildPdf(toolName, text)], { type: "application/pdf" }));
}
