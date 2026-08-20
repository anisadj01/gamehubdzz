/** Client-side report exports (CSV / Excel / PDF). Imported lazily to keep SSR clean. */

export type Column = { header: string; key: string };

export function exportCsv(filename: string, columns: Column[], rows: Record<string, unknown>[]) {
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    columns.map((c) => escape(c.header)).join(";"),
    ...rows.map((r) => columns.map((c) => escape(r[c.key])).join(";")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filename}.csv`);
}

export async function exportExcel(
  filename: string,
  columns: Column[],
  rows: Record<string, unknown>[],
) {
  const XLSX = await import("xlsx");
  const data = rows.map((r) => {
    const o: Record<string, unknown> = {};
    for (const c of columns) o[c.header] = r[c.key];
    return o;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rapport");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export async function exportPdf(
  filename: string,
  title: string,
  columns: Column[],
  rows: Record<string, unknown>[],
  summary?: string[],
) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(16);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleString("fr-FR"), 14, 22);

  let startY = 28;
  if (summary?.length) {
    doc.setFontSize(10);
    summary.forEach((line, i) => doc.text(line, 14, startY + i * 5));
    startY += summary.length * 5 + 4;
  }

  autoTable(doc, {
    startY,
    head: [columns.map((c) => c.header)],
    body: rows.map((r) => columns.map((c) => String(r[c.key] ?? ""))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [0, 190, 120] },
  });

  doc.save(`${filename}.pdf`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
