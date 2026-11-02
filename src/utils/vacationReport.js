import * as Print from 'expo-print';
import { formatDate, getLocale, todayKey } from './format';
import { fmtDays, fmtHours } from './vacation';

// One person's vacation / overtime report for a year as a plain bordered
// HTML page (same layout as the web's printVacationReport), handed to the
// system print dialog -- from there it can also be saved as PDF.

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const table = (headers, rows, numCols = []) => {
  const td = (tag, v, i) =>
    `<${tag}${numCols.includes(i) ? ' class="num"' : ''}>${esc(v === '' || v == null ? '-' : v)}</${tag}>`;
  return `<table><thead><tr>${headers.map((h, i) => td('th', h, i)).join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((v, i) => td('td', v, i)).join('')}</tr>`)
    .join('')}</tbody></table>`;
};

export const printVacationReport = async (data, year, t) => {
  const s = data.summary;
  const today = todayKey();
  const state = (e) => (e.end_date < today ? t('vacations.statePast') : e.start_date > today ? t('vacations.stateUpcoming') : t('vacations.stateNow'));
  const title = `${t('vacations.reportTitle', { year })} – ${s.user_name}`;

  const totals = [
    [t('vacations.colAllowance'), fmtDays(s.allowance)],
    [t('vacations.colCarryover'), fmtDays(s.carryover || 0)],
    [t('vacations.colTaken'), fmtDays(s.taken)],
    [t('vacations.colPlanned'), fmtDays(s.planned)],
    [t('vacations.reportRemaining'), fmtDays(s.remaining), true],
    [t('vacations.colSick'), fmtDays(s.sick)],
    [t('vacations.colOther'), fmtDays(s.other)],
    [t('vacations.overtimeYear'), fmtHours(s.overtime_hours)],
    [t('vacations.overtimeBalance'), fmtHours(s.overtime_balance), true],
  ];
  const months = table(
    ['', t('vacations.type_vacation'), t('vacations.type_sick'), t('vacations.type_other'), t('vacations.colOvertime')],
    data.months.map((m) => [
      new Date(year, m.month - 1, 1).toLocaleDateString(getLocale(), { month: 'long' }),
      fmtDays(m.vacation),
      fmtDays(m.sick),
      fmtDays(m.other),
      m.overtime ? fmtHours(m.overtime) : '',
    ]),
    [1, 2, 3, 4],
  );
  const entries = data.entries.length
    ? table(
        [t('vacations.from'), t('vacations.to'), t('vacations.type'), t('vacations.days'), t('vacations.note'), ''],
        data.entries.map((e) => [
          formatDate(e.start_date),
          formatDate(e.end_date),
          `${t(`vacations.type_${e.type}`)}${e.half_day ? ` (${t('vacations.halfDay')})` : ''}`,
          fmtDays(e.days),
          e.note,
          state(e),
        ]),
        [3],
      )
    : '<p>-</p>';
  const overtime = (data.overtime || []).length
    ? table(
        [t('vacations.date'), t('vacations.hours'), t('vacations.note')],
        data.overtime.map((o) => [formatDate(o.date), o.hours ? fmtHours(o.hours) : '', o.note]),
        [1],
      )
    : '<p>-</p>';

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 10pt; color: #000; margin: 20px; }
  h1 { font-size: 14pt; margin: 0 0 4px; }
  h2 { font-size: 11pt; margin: 16px 0 6px; }
  p { margin: 0 0 12px; font-size: 9pt; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #000; padding: 3px 5px; text-align: left; vertical-align: top; }
  th { font-weight: bold; }
  .num { text-align: right; white-space: nowrap; }
  .totals td:first-child { width: 45%; }
  .totals tr.strong td { font-weight: bold; }
  tr { page-break-inside: avoid; }
  thead { display: table-header-group; }
  @page { margin: 12mm; }
</style>
</head>
<body>
<h1>${esc(title)}</h1>
<p>${esc(formatDate(today))}</p>
<table class="totals"><tbody>${totals
    .map(([label, value, strong]) => `<tr${strong ? ' class="strong"' : ''}><td>${esc(label)}</td><td class="num">${esc(value)}</td></tr>`)
    .join('')}</tbody></table>
<h2>${esc(t('vacations.perMonth'))}</h2>${months}
<h2>${esc(t('vacations.entriesTitle'))}</h2>${entries}
<h2>${esc(t('vacations.overtimeTitle'))}</h2>${overtime}
</body>
</html>`;

  await Print.printAsync({ html });
};
