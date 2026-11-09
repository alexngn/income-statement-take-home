"""Export ledger.json into a spreadsheet with formulas for checking by hand.

Run from the repo root:  python3 scripts/export_ledger_to_xlsx.py
Writes scripts/ledger-check.xlsx. Every computed cell is a formula, so the
numbers come from the spreadsheet, not from this script or the app.
"""
import json
from datetime import date
from decimal import Decimal
from pathlib import Path

from openpyxl import Workbook
from openpyxl.comments import Comment
from openpyxl.styles import Font, PatternFill

ROOT = Path(__file__).resolve().parent.parent
LEDGER = json.loads((ROOT / "ledger.json").read_text())
OUT = ROOT / "scripts" / "ledger-check.xlsx"

FONT = "Arial"
BOLD = Font(name=FONT, bold=True)
PLAIN = Font(name=FONT)
BLUE = Font(name=FONT, color="0000FF")  # hardcoded values copied from ledger.json
GREEN = Font(name=FONT, color="008000")  # links to another sheet
YELLOW = PatternFill("solid", fgColor="FFFF00")  # cells you fill in
MONEY = '#,##0.00;(#,##0.00);"-"'
DATE = "yyyy-mm-dd"

wb = Workbook()


def header(ws, names, widths):
    for col, (name, width) in enumerate(zip(names, widths), start=1):
        cell = ws.cell(row=1, column=col, value=name)
        cell.font = BOLD
        ws.column_dimensions[cell.column_letter].width = width
    ws.freeze_panes = "A2"


def style_row(ws, row, fonts, formats=None):
    formats = formats or {}
    for col, font in enumerate(fonts, start=1):
        cell = ws.cell(row=row, column=col)
        cell.font = font
        if col in formats:
            cell.number_format = formats[col]


# ---------------------------------------------------------------- Accounts
accounts = wb.active
accounts.title = "Accounts"
header(accounts, ["Number", "Name", "Type", "Subtype", "Is active", "Section", "Sign on statement"],
       [10, 28, 11, 20, 10, 22, 18])
SECTION_FORMULA = (
    '=IF(D{r}="operating_revenue","Revenue",IF(D{r}="contra_revenue","Revenue",'
    'IF(D{r}="cogs","Cost of goods sold",IF(D{r}="operating_expense","Operating expenses",'
    'IF(D{r}="other_income","Other income",IF(D{r}="balance_sheet","(balance sheet)","UNKNOWN SUBTYPE"))))))'
)
for i, a in enumerate(LEDGER["accounts"], start=2):
    accounts.append([a["number"], a["name"], a["type"], a["subtype"], a["is_active"]])
    accounts.cell(row=i, column=6, value=SECTION_FORMULA.format(r=i))
    # Credit-normal (revenue) shows credit - debit; debit-normal (expense) shows debit - credit.
    accounts.cell(row=i, column=7, value=f'=IF(C{i}="revenue",1,IF(C{i}="expense",-1,""))')
    style_row(accounts, i, [BLUE] * 5 + [PLAIN] * 2)
accounts.cell(row=1, column=7).comment = Comment(
    "1 = revenue (shown as credit minus debit). -1 = expense (shown as debit minus credit). "
    "Blank = balance sheet.", "export script")
ACC_LAST = 1 + len(LEDGER["accounts"])
ACC_NUM = f"Accounts!$A$2:$A${ACC_LAST}"

# ---------------------------------------------------------------- Lines (one row per journal line)
lines = wb.create_sheet("Lines")
header(lines, ["Entry ID", "Date", "Status", "Memo", "Line #", "Account", "Debit", "Credit",
               "Account name", "Account type", "Account subtype", "Posted and in range?",
               "Debit - Credit", "One side only?"],
       [10, 12, 9, 44, 7, 9, 13, 13, 26, 12, 18, 18, 14, 14])
row = 2
for e in LEDGER["journal_entries"]:
    for n, ln in enumerate(e["lines"], start=1):
        r = row
        lines.append([e["id"], date.fromisoformat(e["date"]), e["status"], e["memo"], n,
                      ln["account"], float(ln["debit"]), float(ln["credit"])])
        lookup = lambda col: f'=IFERROR(INDEX(Accounts!${col}$2:${col}${ACC_LAST},MATCH(F{r},{ACC_NUM},0)),"UNKNOWN")'
        lines.cell(row=r, column=9, value=lookup("B"))
        lines.cell(row=r, column=10, value=lookup("C"))
        lines.cell(row=r, column=11, value=lookup("D"))
        lines.cell(row=r, column=12,
                   value=f"=AND(C{r}=\"posted\",B{r}>='Income Statement'!$B$3,B{r}<='Income Statement'!$B$4)")
        lines.cell(row=r, column=13, value=f"=G{r}-H{r}")
        lines.cell(row=r, column=14, value=f"=AND(OR(G{r}=0,H{r}=0),G{r}+H{r}>0,G{r}>=0,H{r}>=0)")
        style_row(lines, r, [BLUE] * 8 + [PLAIN] * 6, {2: DATE, 7: MONEY, 8: MONEY, 13: MONEY})
        row += 1
LN_LAST = row - 1
L = lambda col: f"Lines!${col}$2:${col}${LN_LAST}"

# ---------------------------------------------------------------- Entries (one row per entry)
entries = wb.create_sheet("Entries")
header(entries, ["Entry ID", "Date", "Status", "Memo", "Line count", "Total debit", "Total credit",
                 "Balanced?", "Lines with unknown account", "Lines not one-sided"],
       [10, 12, 9, 44, 10, 14, 14, 11, 16, 16])
for i, e in enumerate(LEDGER["journal_entries"], start=2):
    entries.append([e["id"], date.fromisoformat(e["date"]), e["status"], e["memo"]])
    entries.cell(row=i, column=5, value=f'=COUNTIF({L("A")},A{i})')
    entries.cell(row=i, column=6, value=f'=SUMIF({L("A")},A{i},{L("G")})')
    entries.cell(row=i, column=7, value=f'=SUMIF({L("A")},A{i},{L("H")})')
    entries.cell(row=i, column=8, value=f"=ROUND(F{i}-G{i},2)=0")
    entries.cell(row=i, column=9, value=f'=COUNTIFS({L("A")},A{i},{L("I")},"UNKNOWN")')
    entries.cell(row=i, column=10, value=f'=COUNTIFS({L("A")},A{i},{L("N")},FALSE)')
    style_row(entries, i, [BLUE] * 4 + [PLAIN] * 6, {2: DATE, 6: MONEY, 7: MONEY})
EN_LAST = 1 + len(LEDGER["journal_entries"])
EN = lambda col: f"Entries!${col}$2:${col}${EN_LAST}"

# ---------------------------------------------------------------- Income Statement
stmt = wb.create_sheet("Income Statement", 0)
for col, width in zip("ABCDE", [34, 30, 18, 18, 14]):
    stmt.column_dimensions[col].width = width
stmt["A1"] = f'{LEDGER["company"]}: income statement ({LEDGER["currency"]})'
stmt["A1"].font = Font(name=FONT, bold=True, size=13)
stmt["A2"] = "Yellow cells are yours to edit: the date range, and the app's numbers in column D."
stmt["A2"].font = Font(name=FONT, italic=True)
for r, label, value in [(3, "Start date (inclusive)", date(2026, 1, 1)),
                        (4, "End date (inclusive)", date(2026, 3, 31))]:
    stmt.cell(row=r, column=1, value=label).font = BOLD
    c = stmt.cell(row=r, column=2, value=value)
    c.font, c.fill, c.number_format = BLUE, YELLOW, DATE
stmt["C3"] = "Only status = posted is counted (drafts and voids are left out)."
stmt["C3"].font = Font(name=FONT, italic=True)

r = 6
for col, name in enumerate(["Line", "Account", "Spreadsheet", "App (paste here)", "Difference"], start=1):
    stmt.cell(row=r, column=col, value=name).font = BOLD


def amount_formula(acct_row):
    """Statement amount for the account on Accounts!row, posted entries in the date range."""
    num = f"Accounts!$A${acct_row}"
    crit = f'{L("F")},{num},{L("C")},"posted",{L("B")},">="&$B$3,{L("B")},"<="&$B$4'
    return f"=Accounts!$G${acct_row}*(SUMIFS({L('H')},{crit})-SUMIFS({L('G')},{crit}))"


def put(label, formula, bold=False, account_ref=None):
    global r
    r += 1
    stmt.cell(row=r, column=1, value=label).font = BOLD if bold else PLAIN
    if account_ref:
        c = stmt.cell(row=r, column=2, value=f'=Accounts!$A${account_ref}&" "&Accounts!$B${account_ref}')
        c.font = GREEN
    c = stmt.cell(row=r, column=3, value=formula)
    c.font, c.number_format = (BOLD if bold else PLAIN), MONEY
    app = stmt.cell(row=r, column=4)
    app.fill, app.number_format, app.font = YELLOW, MONEY, BLUE
    diff = stmt.cell(row=r, column=5, value=f'=IF(D{r}="","",ROUND(C{r}-D{r},2))')
    diff.number_format, diff.font = MONEY, PLAIN
    return r


SECTIONS = [  # (title, subtypes in display order, subtotal label)
    ("Revenue", ["operating_revenue", "contra_revenue"], "Net revenue"),
    ("Cost of goods sold", ["cogs"], "Total cost of goods sold"),
    ("Operating expenses", ["operating_expense"], "Total operating expenses"),
    ("Other income", ["other_income"], "Total other income"),
]
totals = {}
statement_acct_cells = []
for title, subtypes, total_label in SECTIONS:
    r += 1
    r += 1
    stmt.cell(row=r, column=1, value=title).font = BOLD
    first = r + 1
    for i, a in enumerate(LEDGER["accounts"], start=2):
        if a["subtype"] in subtypes:
            rr = put("", amount_formula(i), account_ref=i)
            statement_acct_cells.append(f"Accounts!$A${i}")
    totals[title] = put(total_label, f"=SUM(C{first}:C{r})", bold=True)
    if title == "Cost of goods sold":
        gp = put("Gross profit", f"=C{totals['Revenue']}-C{totals[title]}", bold=True)
    if title == "Operating expenses":
        oi = put("Operating income", f"=C{gp}-C{totals[title]}", bold=True)
r += 1
ni = put("Net income", f"=C{oi}+C{totals['Other income']}", bold=True)

r += 2
stmt.cell(row=r, column=1, value="Cross-check").font = BOLD
bs_crit = f'{L("K")},"balance_sheet",{L("C")},"posted",{L("B")},">="&$B$3,{L("B")},"<="&$B$4'
r += 1
stmt.cell(row=r, column=1, value="Net income from balance-sheet lines").font = PLAIN
stmt.cell(row=r, column=1).comment = Comment(
    "Every entry balances, so in any range: income statement (credit - debit) = "
    "balance sheet (debit - credit). Computed from the balance-sheet lines only.", "export script")
c = stmt.cell(row=r, column=3, value=f"=SUMIFS({L('G')},{bs_crit})-SUMIFS({L('H')},{bs_crit})")
c.number_format, c.font = MONEY, PLAIN
bs_row = r
r += 1
stmt.cell(row=r, column=1, value="Difference from Net income (should be 0)").font = PLAIN
c = stmt.cell(row=r, column=3, value=f"=ROUND(C{ni}-C{bs_row},2)")
c.number_format, c.font = MONEY, PLAIN
r += 1
stmt.cell(row=r, column=1, value="Rows where the app differs").font = PLAIN
stmt.cell(row=r, column=3, value=f'=COUNTIF(E7:E{ni},"<>0")-COUNTBLANK(E7:E{ni})').font = PLAIN

# ---------------------------------------------------------------- Checks (data loaded correctly)
checks = wb.create_sheet("Checks", 1)
header(checks, ["Check", "Spreadsheet", "Expected", "OK?", "How the expected value was found"],
       [52, 16, 16, 8, 60])
src_lines = [ln for e in LEDGER["journal_entries"] for ln in e["lines"]]
src_debit = sum(Decimal(ln["debit"]) for ln in src_lines)
src_credit = sum(Decimal(ln["credit"]) for ln in src_lines)
statuses = [e["status"] for e in LEDGER["journal_entries"]]
FROM_JSON = "Counted from ledger.json by the export script (control total)"
RULE = "Rule: should always be this"
rows = [
    ("Accounts loaded", f"=COUNTA({ACC_NUM})", len(LEDGER["accounts"]), FROM_JSON, False),
    ("Duplicate account numbers", f"=SUMPRODUCT(--(COUNTIF({ACC_NUM},{ACC_NUM})>1))", 0, RULE, False),
    ("Accounts with an unknown subtype", f'=COUNTIF(Accounts!$F$2:$F${ACC_LAST},"UNKNOWN SUBTYPE")', 0, RULE, False),
    ("Journal entries loaded", f'=COUNTA({EN("A")})', len(LEDGER["journal_entries"]), FROM_JSON, False),
    ("Duplicate entry IDs", f'=SUMPRODUCT(--(COUNTIF({EN("A")},{EN("A")})>1))', 0, RULE, False),
    ("Journal lines loaded", f'=COUNTA({L("A")})', len(src_lines), FROM_JSON, False),
    ("Sum of every debit (all statuses)", f'=SUM({L("G")})', float(src_debit), FROM_JSON, True),
    ("Sum of every credit (all statuses)", f'=SUM({L("H")})', float(src_credit), FROM_JSON, True),
    ("Entries with status posted", f'=COUNTIF({EN("C")},"posted")', statuses.count("posted"), FROM_JSON, False),
    ("Entries with status draft", f'=COUNTIF({EN("C")},"draft")', statuses.count("draft"), FROM_JSON, False),
    ("Entries with status void", f'=COUNTIF({EN("C")},"void")', statuses.count("void"), FROM_JSON, False),
    ("Entries with any other status", f'=COUNTA({EN("C")})-COUNTIF({EN("C")},"posted")-COUNTIF({EN("C")},"draft")-COUNTIF({EN("C")},"void")', 0, RULE, False),
    ("Entries that do not balance", f'=COUNTIF({EN("H")},FALSE)', 0, RULE, False),
    ("Entries with fewer than 2 lines", f'=COUNTIF({EN("E")},"<2")', 0, RULE, False),
    ("Lines pointing at an unknown account", f'=COUNTIF({L("I")},"UNKNOWN")', 0, RULE, False),
    ("Lines not exactly one-sided (both, neither, or negative)", f'=COUNTIF({L("N")},FALSE)', 0, RULE, False),
    ("Lines missing a date", f'=COUNTBLANK({L("B")})', 0, RULE, False),
    ("Income statement accounts not on the statement exactly once",
     f"=SUMPRODUCT((Accounts!$D$2:$D${ACC_LAST}<>\"balance_sheet\")"
     f"*(COUNTIF('Income Statement'!$B$7:$B${ni},Accounts!$A$2:$A${ACC_LAST}&\" \"&Accounts!$B$2:$B${ACC_LAST})<>1))",
     0, "Rule: every non-balance-sheet account gets one line", False),
]
for i, (name, formula, expected, how, money) in enumerate(rows, start=2):
    checks.append([name, formula, expected, f"=ROUND(B{i}-C{i},2)=0", how])
    style_row(checks, i, [PLAIN, PLAIN, BLUE, PLAIN, PLAIN], {2: MONEY, 3: MONEY} if money else {})

for ws in wb.worksheets:
    for row_cells in ws.iter_rows():
        for cell in row_cells:
            if cell.font is None or cell.font.name != FONT:
                cell.font = Font(name=FONT, bold=cell.font.bold if cell.font else False)

OUT.parent.mkdir(exist_ok=True)
wb.save(OUT)
print(f"wrote {OUT}")
