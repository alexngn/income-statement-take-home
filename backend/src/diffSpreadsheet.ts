// Compares a CSV export of the spreadsheet's "Income Statement" tab with the app's numbers.
//
//   npm run diff     (newest of ~/Desktop/ledger-check.numbers and scripts/ledger-check.xlsx)
//   npm run diff -- path/to/ledger-check.xlsx        (.xlsx, .numbers, or a CSV export of the Income Statement tab)
//
// The path can be absolute, start with ~, or be relative to the folder you ran the command in.
//
// It reads the start and end dates from the CSV (rows "Start date" and "End date"),
// runs the same calculation the API uses for those dates, and prints every row side by side.
// Exits with code 1 if any row differs.

import { existsSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isValidDate } from "./dates.ts";
import { buildIncomeStatement, type IncomeStatement } from "./incomeStatement.ts";
import { loadLedger } from "./ledger.ts";
import { formatCents } from "./money.ts";

/** Minimal CSV parser: commas, double-quoted fields, "" as an escaped quote. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

/**
 * Spreadsheet display text to cents, without floats.
 * "35,650.75" -> 3565075n, "(800.25)" -> -80025n, "-44,480.14" -> -4448014n, "-" or "" -> 0n.
 */
export function displayToCents(text: string): bigint | null {
  let s = text.trim().replace(/[$,\s]/g, "");
  if (s === "" || s === "-") return 0n;
  let negative = false;
  if (s.startsWith("(") && s.endsWith(")")) { negative = true; s = s.slice(1, -1); }
  if (s.startsWith("-")) { negative = !negative; s = s.slice(1); }
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(s);
  if (!match) return null;
  const cents = BigInt(match[1]) * 100n + BigInt((match[2] ?? "0").padEnd(2, "0"));
  return negative ? -cents : cents;
}

/** Labels of the spreadsheet's total rows, mapped to the app's value. */
function totalsByLabel(statement: IncomeStatement): Map<string, bigint> {
  const section = (key: string) => statement.sections.find((s) => s.key === key)!.total;
  return new Map([
    ["net revenue", section("revenue")],
    ["total cost of goods sold", section("cogs")],
    ["gross profit", statement.grossProfit],
    ["total operating expenses", section("operating_expenses")],
    ["operating income", statement.operatingIncome],
    ["total other income", section("other_income")],
    ["net income", statement.netIncome],
  ]);
}

interface DiffRow {
  label: string;
  sheet: bigint | null;
  app: bigint | null;
}

export function diffSpreadsheet(csvText: string, ledger = loadLedger()) {
  const rows = parseCsv(csvText);
  const findDate = (prefix: string) => {
    const row = rows.find((r) => r[0]?.trim().toLowerCase().startsWith(prefix));
    const value = row?.[1]?.trim();
    if (!isValidDate(value)) {
      throw new Error(`Could not find a YYYY-MM-DD date on the "${prefix}..." row (got "${value}")`);
    }
    return value;
  };
  const start = findDate("start date");
  const end = findDate("end date");
  const statement = buildIncomeStatement(ledger, start, end);

  const appByAccount = new Map<string, bigint>();
  for (const s of statement.sections) for (const l of s.lines) appByAccount.set(l.account, l.amount);
  const appTotals = totalsByLabel(statement);

  const diff: DiffRow[] = [];
  const seenAccounts = new Set<string>();
  for (const r of rows) {
    const label = (r[0] ?? "").trim();
    const accountCell = (r[1] ?? "").trim();
    const accountNumber = /^(\d+)\s/.exec(accountCell)?.[1];
    if (accountNumber) {
      seenAccounts.add(accountNumber);
      // The app leaves out accounts with no activity in the range, which means 0.
      diff.push({ label: accountCell, sheet: displayToCents(r[2] ?? ""), app: appByAccount.get(accountNumber) ?? 0n });
    } else if (appTotals.has(label.toLowerCase())) {
      diff.push({ label, sheet: displayToCents(r[2] ?? ""), app: appTotals.get(label.toLowerCase())! });
    }
  }
  // Accounts the app shows that the spreadsheet has no row for.
  for (const [account, amount] of appByAccount) {
    if (!seenAccounts.has(account)) diff.push({ label: `${account} (missing from spreadsheet)`, sheet: null, app: amount });
  }
  // Totals the spreadsheet has no row for.
  for (const [label, amount] of appTotals) {
    if (!diff.some((d) => d.label.toLowerCase() === label)) diff.push({ label: `${label} (missing from spreadsheet)`, sheet: null, app: amount });
  }
  return { start, end, diff };
}

const SOFFICE = "/Applications/LibreOffice.app/Contents/MacOS/soffice";

/**
 * Exports the first tab (Income Statement) of a spreadsheet to CSV with LibreOffice, headless.
 * Values are the ones last saved in the file, formatted as shown.
 */
function spreadsheetToCsv(path: string): string {
  const dir = mkdtempSync(join(tmpdir(), "statement-diff-"));
  // CSV options: comma, double quote, UTF-8, start row 1, no column formats, language,
  // quote text, detect numbers, save cell content as shown, ..., sheet 1.
  const filter = "csv:Text - txt - csv (StarCalc):44,34,76,1,,0,false,true,true,false,false,1";
  execFileSync(SOFFICE, [
    `-env:UserInstallation=file://${join(dir, "profile")}`, // separate profile, so an open LibreOffice window does not interfere
    "--headless", "--convert-to", filter, "--outdir", dir, path,
  ], { stdio: "ignore" });
  const csv = readdirSync(dir).find((f) => f.endsWith(".csv"));
  if (!csv) throw new Error(`LibreOffice did not export ${path}`);
  return readFileSync(join(dir, csv), "utf8");
}

/** Has Numbers export a .numbers file to a temporary .xlsx (values as last saved in Numbers). */
function numbersToXlsx(path: string): string {
  const out = join(mkdtempSync(join(tmpdir(), "statement-diff-")), "sheet.xlsx");
  const script = [
    "on run argv",
    '  tell application "Numbers"',
    "    set doc to open (POSIX file (item 1 of argv))",
    "    export doc to (POSIX file (item 2 of argv)) as Microsoft Excel with properties {exclude summary worksheet:true}",
    "  end tell",
    "end run",
  ].join("\n");
  execFileSync("osascript", ["-e", script, path, out], { stdio: ["ignore", "ignore", "inherit"] });
  return out;
}

/** Default files, newest first: the Numbers copy on the Desktop, then the .xlsx in scripts/. */
function newestDefaultSpreadsheet(): string {
  const candidates = [
    join(homedir(), "Desktop", "ledger-check.numbers"),
    fileURLToPath(new URL("../../scripts/ledger-check.xlsx", import.meta.url)),
  ].filter((p) => existsSync(p));
  candidates.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return candidates[0] ?? "scripts/ledger-check.xlsx";
}

function main() {
  // No path given: whichever copy of the spreadsheet was saved most recently.
  const arg = process.argv[2] ?? newestDefaultSpreadsheet();
  // npm run moves into backend/, so resolve against the folder the command was typed in (INIT_CWD).
  const path = resolve(process.env.INIT_CWD ?? process.cwd(), arg.replace(/^~(?=\/|$)/, homedir()));
  if (!existsSync(path)) {
    console.error(`No file at ${path}.`);
    process.exit(2);
  }
  const lower = path.toLowerCase();
  const csv = lower.endsWith(".csv")
    ? readFileSync(path, "utf8")
    : spreadsheetToCsv(lower.endsWith(".numbers") ? numbersToXlsx(path) : path);
  const { start, end, diff } = diffSpreadsheet(csv);
  const show = (c: bigint | null) => (c === null ? "(none)" : formatCents(c));
  const width = Math.max(...diff.map((d) => d.label.length), 10);

  console.log(`File: ${path} (last saved ${statSync(path).mtime.toLocaleString()})`);
  console.log(`Income statement ${start} to ${end} (both days included)\n`);
  console.log(`${"Row".padEnd(width)}  ${"Spreadsheet".padStart(14)}  ${"App".padStart(14)}  ${"Difference".padStart(12)}`);
  let mismatches = 0;
  for (const d of diff) {
    const differs = d.sheet === null || d.app === null || d.sheet !== d.app;
    const difference = d.sheet !== null && d.app !== null ? formatCents(d.sheet - d.app) : "n/a";
    if (differs) mismatches++;
    console.log(
      `${d.label.padEnd(width)}  ${show(d.sheet).padStart(14)}  ${show(d.app).padStart(14)}  ${difference.padStart(12)}${differs ? "  <-- differs" : ""}`,
    );
  }
  console.log(mismatches === 0 ? "\nAll rows match." : `\n${mismatches} row(s) differ.`);
  process.exit(mismatches === 0 ? 0 : 1);
}

if (import.meta.main) main();
