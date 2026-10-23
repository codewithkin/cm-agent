import { amount, clock, dayLabel, shortDate } from "./format";
import { answers, changeLabel, hourLabel, keyDate, moneyPair, rangeLabel, WEEKDAYS, type Insights } from "./insights";

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function table(head: string[], rows: string[][]): string {
  if (rows.length === 0) return `<p class="muted">Nothing to show.</p>`;
  return `<table><tr>${head.map((cell) => `<th>${escape(cell)}</th>`).join("")}</tr>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escape(cell)}</td>`).join("")}</tr>`)
    .join("")}</table>`;
}

/** Simple CSS bars, so the PDF needs no chart library. */
function bars(values: number[], labels: string[]): string {
  const max = Math.max(1, ...values);
  return `<div class="bars">${values
    .map(
      (value, index) =>
        `<div class="bar"><div class="fill" style="height:${Math.max((value / max) * 100, value ? 4 : 1)}%"></div><span>${escape(labels[index] ?? "")}</span></div>`,
    )
    .join("")}</div>`;
}

function stat(label: string, value: string, note?: string | null): string {
  return `<div class="stat"><div class="label">${escape(label)}</div><div class="value">${escape(value)}</div>${note ? `<div class="note">${escape(note)}</div>` : ""}</div>`;
}

/** The Reports tab as a printable A4 page: the same questions, answered in the same words. */
export function insightsPdfHtml(data: Insights, businessName: string): string {
  const text = answers(data);
  const usd = data.totals.USD;
  const zig = data.totals.ZIG;
  const versus = `vs ${rangeLabel(data.previous.from, data.previous.to)}`;
  const usdChange = changeLabel(data.change.commissionUsd);
  const zigChange = changeLabel(data.change.commissionZig);
  const countChange = changeLabel(data.change.count);

  const dailyBars =
    data.days > 1
      ? `<h3>Transactions per day</h3>${bars(
          data.daily.map((day) => day.count),
          data.daily.map((day, index) => (index === 0 || index === data.daily.length - 1 || data.days <= 10 ? String(keyDate(day.date).getDate()) : "")),
        )}`
      : "";

  const firstHour = data.hours.findIndex((count) => count > 0);
  const lastHour = 23 - [...data.hours].reverse().findIndex((count) => count > 0);
  const hourBars =
    firstHour >= 0
      ? bars(
          data.hours.slice(firstHour, lastHour + 1),
          data.hours.slice(firstHour, lastHour + 1).map((_, index) => String(firstHour + index).padStart(2, "0")),
        )
      : "";

  const problems = data.problems;
  const problemRows = [
    ["No SMS", problems.noSms],
    ["SMS didn't match", problems.mismatch],
    ["Typed in by hand", problems.manual],
    ["Reported", problems.flagged],
    ["Cancelled", problems.voided],
    ["Edited", problems.edited],
  ].filter(([, count]) => Number(count) > 0) as [string, number][];

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box} body{font-family:-apple-system,Roboto,sans-serif;color:#141416;padding:28px;margin:0;font-size:12px}
    header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #F5CF5E;padding-bottom:10px;margin-bottom:16px}
    h1{font-size:22px;margin:0} h2{font-size:14px;margin:22px 0 6px} h3{font-size:12px;margin:14px 0 6px;color:#6E6D68}
    .muted{color:#6E6D68} .answer{font-size:13px;font-weight:600;margin:0 0 8px}
    .stats{display:flex;gap:8px;flex-wrap:wrap} .stat{flex:1;min-width:120px;background:#F4F3EF;border-radius:10px;padding:10px}
    .stat .label{color:#6E6D68;font-size:11px} .stat .value{font-size:18px;font-weight:800;margin-top:2px} .stat .note{font-size:11px;color:#2E7D4F;margin-top:2px}
    table{width:100%;border-collapse:collapse} th{text-align:left;color:#6E6D68;border-bottom:1px solid #DCD9D1;padding:5px 4px;font-size:11px}
    td{border-bottom:1px solid #ECEAE4;padding:5px 4px} td:not(:first-child),th:not(:first-child){text-align:right}
    .bars{display:flex;align-items:flex-end;gap:2px;height:90px;margin-bottom:16px} .bar{flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center}
    .fill{width:100%;background:#141416;border-radius:2px 2px 0 0} .bar span{font-size:8px;color:#6E6D68;height:12px;margin-top:2px}
    .alarm{color:#B3261E} .ok{color:#2E7D4F} section{page-break-inside:avoid}
  </style></head><body>
  <header><div><h1>${escape(businessName)}</h1><div class="muted">EcoCash agent report · ${escape(rangeLabel(data.from, data.to))}</div></div>
  <div class="muted">Made ${escape(shortDate(new Date()))} ${escape(clock(new Date()))}</div></header>

  <section><h2>How much did I make?</h2>
  <div class="stats">
    ${stat("Earned · USD", amount(usd.commission), usdChange ? `${usdChange} ${versus}` : null)}
    ${stat("Earned · ZiG", amount(zig.commission), zigChange ? `${zigChange} ${versus}` : null)}
    ${stat("Transactions", String(data.totals.transactionCount), countChange ? `${countChange} ${versus}` : null)}
  </div>
  ${data.bestDay ? `<p class="answer" style="margin-top:10px">Best day: ${escape(dayLabel(keyDate(data.bestDay.date)))}, ${data.bestDay.count} transactions, earned ${escape(moneyPair(data.bestDay.commissionUsd, data.bestDay.commissionZig))}.</p>` : ""}
  <h3>Money handled</h3>
  ${table(["", "Cash-in", "Cash-out", "Fees", "Earned"], [
    ["USD", `${usd.cashInCount} · ${amount(usd.cashInValue)}`, `${usd.cashOutCount} · ${amount(usd.cashOutValue)}`, amount(usd.fees), amount(usd.commission)],
    ["ZiG", `${zig.cashInCount} · ${amount(zig.cashInValue)}`, `${zig.cashOutCount} · ${amount(zig.cashOutValue)}`, amount(zig.fees), amount(zig.commission)],
  ])}
  ${dailyBars}</section>

  <section><h2>Is any money missing?</h2>
  <p class="answer ${data.missing.shortShifts ? "alarm" : "ok"}">${escape(text.missingText)}</p>
  ${data.missing.worst.length ? table(["Shift", "Closed", "Short", "Note"], data.missing.worst.map((row) => [`${row.name} · ${row.deviceLabel}`, row.closedAt ? `${dayLabel(row.closedAt)} ${clock(row.closedAt)}` : "", moneyPair(row.shortUsd, row.shortZig), row.note ?? ""])) : ""}
  </section>

  <section><h2>Who did what?</h2>
  ${table(["Person", "Done", "USD handled", "ZiG handled", "Earned USD", "Problems", "Short shifts"], data.people.map((row) => [row.name, String(row.count), amount(row.valueUsd), amount(row.valueZig), amount(row.commissionUsd), String(row.problems), row.shortShifts ? `${row.shortShifts} · ${moneyPair(row.shortUsd, row.shortZig)}` : "0"]))}
  </section>

  <section><h2>When is it busy?</h2>
  <p class="answer">${escape(text.busyText)}</p>
  ${hourBars}
  ${data.days >= 7 ? table(["Day of the week", "Transactions"], WEEKDAYS.map((day, index) => [day, String(data.weekdays[index] ?? 0)])) : ""}
  </section>

  <section><h2>How much cash and EcoCash do I need?</h2>
  ${text.needLines.length ? text.needLines.map((line) => `<p class="answer">${escape(line)}</p>`).join("") : `<p class="muted">Not enough transactions to tell yet.</p>`}
  <p class="muted">Worked out from the busiest stretch of each day: how far cash or EcoCash went down before money came back in.</p>
  </section>

  <section><h2>Who are my customers?</h2>
  <p class="answer">${escape(text.customerText)}</p>
  ${table(["Top customers", "Visits", "USD", "ZiG"], data.customers.top.map((row) => [row.name, String(row.count), amount(row.usd), amount(row.zig)]))}
  </section>

  <section><h2>Biggest transactions</h2>
  ${table(["Customer", "When", "Served by", "Type", "Amount"], data.largest.map((row) => [row.customerName, `${dayLabel(row.occurredAt)} ${clock(row.occurredAt)}`, row.servedBy, row.type === "CASH_IN" ? "Cash-in" : "Cash-out", `${row.currency === "USD" ? "USD" : "ZiG"} ${amount(row.amount)}`]))}
  </section>

  <section><h2>Anything to check?</h2>
  ${problemRows.length ? table(["What", "How many"], problemRows.map(([label, count]) => [label, String(count)])) : `<p class="answer ok">Nothing to check.</p>`}
  </section>
  </body></html>`;
}
