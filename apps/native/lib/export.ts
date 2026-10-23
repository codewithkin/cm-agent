import { File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

/** Saves CSV text to a file and opens the share sheet (WhatsApp, Drive, email…). */
export async function shareCsv(filename: string, csv: string) {
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(csv);
  await Sharing.shareAsync(file.uri, { mimeType: "text/csv", dialogTitle: filename, UTI: "public.comma-separated-values-text" });
}

/** Renders HTML to a PDF and opens the share sheet; `save` only prints it to a file. */
export async function sharePdf(html: string, title: string) {
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
  await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: title, UTI: "com.adobe.pdf" });
}

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A plain printable page in the app's style, for reports. */
export function reportHtml(title: string, subtitle: string, sections: { heading: string; rows: string[][] }[]) {
  const tables = sections
    .map(
      (section) => `
      <h2>${escape(section.heading)}</h2>
      <table>${section.rows
        .map((row, i) => `<tr>${row.map((cell) => (i === 0 ? `<th>${escape(cell)}</th>` : `<td>${escape(cell)}</td>`)).join("")}</tr>`)
        .join("")}</table>`,
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:-apple-system,Roboto,sans-serif;color:#141416;padding:28px}
    h1{font-size:22px;margin:0} .sub{color:#6E6D68;margin:4px 0 20px}
    h2{font-size:14px;margin:22px 0 8px} table{width:100%;border-collapse:collapse;font-size:12px}
    th{text-align:left;color:#6E6D68;border-bottom:1px solid #DCD9D1;padding:6px 4px}
    td{border-bottom:1px solid #ECEAE4;padding:6px 4px}
    td:not(:first-child),th:not(:first-child){text-align:right}
  </style></head><body><h1>${escape(title)}</h1><div class="sub">${escape(subtitle)}</div>${tables}</body></html>`;
}
