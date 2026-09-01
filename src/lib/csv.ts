/**
 * Shared CSV reading/writing for the member dashboard's Import/Export buttons.
 *
 * Extracted from IndustryManager once a second page needed it: the delimiter sniffing below was
 * added after a tab-separated file (exported from a spreadsheet, still named .csv) collapsed into
 * a single column, and a fix like that must not exist in only one of two copies.
 */

/** Column separators worth guessing between. */
const DELIMITERS = [",", "\t", ";", "|"] as const;

export const DELIMITER_LABELS: Record<string, string> = {
  ",": "comma-separated",
  "\t": "tab-separated",
  ";": "semicolon-separated",
  "|": "pipe-separated",
};

/**
 * Works out what actually separates the columns.
 *
 * "CSV" out of a spreadsheet is frequently not comma-separated: "Text (Tab delimited)" export, or
 * a range copied straight out of Excel or Google Sheets, produces TAB-separated text that still
 * gets saved with a .csv extension. Assuming a comma there collapses the whole header into one
 * cell and the import then reports it cannot find its required column.
 *
 * Only the header line is sniffed: it is the one line guaranteed to contain every separator
 * exactly once per column boundary, and headers do not contain quoted separators.
 */
export function detectDelimiter(headerLine: string): string {
  let best: string = ",";
  let bestCount = 0;
  for (const candidate of DELIMITERS) {
    const count = headerLine.split(candidate).length - 1;
    if (count > bestCount) { best = candidate; bestCount = count; }
  }
  return best;
}

/**
 * Minimal RFC-4180 reader, parameterised by delimiter.
 *
 * Splitting naively is not an option whatever the separator: descriptions routinely contain
 * commas, and the Export buttons quote every field and double embedded quotes. This handles
 * quoted fields, "" escapes, and newlines inside quotes.
 */
export function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  // Strip a UTF-8 BOM, which Excel adds and which would otherwise corrupt the first header cell.
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === delimiter) { row.push(field); field = ""; continue; }
    if (c === "\r") continue;
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export interface ReadCsvResult {
  header: string[];
  rows: string[][];
  delimiter: string;
  delimiterLabel: string;
}

/** Parses and lower-cases the header, leaving column mapping to the caller. */
export function readCsv(text: string): ReadCsvResult {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = detectDelimiter(firstLine);
  const table = parseCsv(text, delimiter);
  const header = (table.shift() ?? []).map((h) => h.trim().toLowerCase());
  return {
    header,
    rows: table,
    delimiter,
    delimiterLabel: DELIMITER_LABELS[delimiter] ?? "delimited",
  };
}

/** Finds a column by any of its accepted header spellings; -1 when absent. */
export function columnIndex(header: string[], ...names: string[]): number {
  return header.findIndex((h) => names.includes(h));
}

/** Quotes a value for CSV output: always quoted, embedded quotes doubled. */
export function csvCell(value: string | number | null | undefined): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

/** Builds a CSV document and hands it to the browser as a download. */
export function downloadCsv(filename: string, header: string[], rows: (string | number | null | undefined)[][]): void {
  const body = [header.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n");
  // The BOM makes Excel open UTF-8 correctly instead of mangling accented characters.
  const blob = new Blob(["﻿" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
