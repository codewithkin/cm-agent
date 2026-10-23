import { Directory, File, Paths } from "expo-file-system";
import { getContentUriAsync } from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { openFile } from "@/modules/file-viewer";

const PDF = "application/pdf";

/** "Day report 2026-10-23" → "Day-report-2026-10-23", safe as a file name. */
const fileName = (title: string) => title.replace(/[^\w-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "report";

type PdfOptions = { landscape?: boolean };

/** Renders HTML to an A4 PDF and keeps it in the app's Reports folder. Returns the saved file. */
async function writePdf(html: string, title: string, { landscape }: PdfOptions = {}): Promise<File> {
  const { uri } = await Print.printToFileAsync({ html, width: landscape ? 842 : 595, height: landscape ? 595 : 842 });
  const folder = new Directory(Paths.document, "reports");
  if (!folder.exists) folder.create();
  const file = new File(folder, `${fileName(title)}.pdf`);
  if (file.exists) file.delete();
  await new File(uri).move(file);
  return file;
}

/**
 * Saves the PDF and opens it straight away in the phone's PDF viewer, where it
 * can be printed or shared. Falls back to the share sheet when there is no viewer.
 */
export async function savePdf(html: string, title: string, options?: PdfOptions) {
  const file = await writePdf(html, title, options);
  if (openFile(await getContentUriAsync(file.uri), PDF)) return;
  await Sharing.shareAsync(file.uri, { mimeType: PDF, dialogTitle: title, UTI: "com.adobe.pdf" });
}

/** Saves the PDF and opens the share sheet (WhatsApp, Drive, email…). */
export async function sharePdf(html: string, title: string) {
  const file = await writePdf(html, title);
  await Sharing.shareAsync(file.uri, { mimeType: PDF, dialogTitle: title, UTI: "com.adobe.pdf" });
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
