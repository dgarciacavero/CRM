// Google Apps Script — pegar en script.google.com, vincular al Google Sheet del CRM.
// Desplegar: "Aplicación web" | Ejecutar como: Yo | Acceso: Cualquiera.

const SHEET_NAME = 'CRM';

function doGet(e) {
  const action = (e.parameter && e.parameter.action) || 'getData';
  try {
    if (action === 'getData') return getData();
    if (action === 'update')  return updateRow(e);
    if (action === 'append')  return appendRows(e);
    if (action === 'delete')  return deleteByLink(e);
    return json({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return json({ ok: false, error: err.message });
  }
}

function getData() {
  const ws = getSheet();
  const values = ws.getDataRange().getValues();
  const headers = values[0];
  const rows = values.slice(1)
    .map((row, i) => {
      if (row.every(c => c === '' || c === null || c === undefined)) return null;
      const obj = { _row: i + 2 };
      headers.forEach((h, j) => { obj[h] = (row[j] !== null && row[j] !== undefined) ? String(row[j]) : ''; });
      return obj;
    })
    .filter(Boolean);
  return json({ ok: true, rows, headers });
}

function updateRow(e) {
  const rowIndex = parseInt(e.parameter.row, 10);
  const data     = JSON.parse(decodeURIComponent(e.parameter.data));

  const ws      = getSheet();
  const headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];

  Object.entries(data).forEach(([field, value]) => {
    const colIndex = headers.indexOf(field);
    if (colIndex >= 0) {
      ws.getRange(rowIndex, colIndex + 1).setValue(value);
    }
  });

  SpreadsheetApp.flush();
  return json({ ok: true });
}

function appendRows(e) {
  const rowsToAdd = JSON.parse(decodeURIComponent(e.parameter.rows));
  const ws        = getSheet();
  const headers   = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
  const linkCol   = headers.indexOf('Link');

  const existing = new Set();
  if (linkCol >= 0 && ws.getLastRow() > 1) {
    ws.getRange(2, linkCol + 1, ws.getLastRow() - 1, 1).getValues()
      .forEach(r => { if (r[0]) existing.add(String(r[0])); });
  }

  let added = 0, skipped = 0;
  const newMatrix = [];
  rowsToAdd.forEach(obj => {
    const link = obj['Link'] || '';
    if (link && existing.has(link)) { skipped++; return; }
    if (link) existing.add(link);
    const rowArr = headers.map(h => {
      if (h === 'Estado') return obj['Estado'] || 'Sin contactar';
      return obj[h] !== undefined && obj[h] !== null ? obj[h] : '';
    });
    newMatrix.push(rowArr);
    added++;
  });

  if (newMatrix.length > 0) {
    ws.getRange(ws.getLastRow() + 1, 1, newMatrix.length, headers.length).setValues(newMatrix);
  }
  SpreadsheetApp.flush();
  return json({ ok: true, added, skipped, total_rows: ws.getLastRow() - 1 });
}

function deleteByLink(e) {
  const link    = e.parameter.link;
  const ws      = getSheet();
  const headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];
  const linkCol = headers.indexOf('Link');
  if (linkCol < 0) return json({ ok: false, error: 'Link column not found' });

  const lastRow = ws.getLastRow();
  if (lastRow < 2) return json({ ok: true, deleted: 0 });

  const values = ws.getRange(2, linkCol + 1, lastRow - 1, 1).getValues();
  const toDelete = [];
  values.forEach((r, i) => { if (String(r[0]) === link) toDelete.push(i + 2); });

  for (let i = toDelete.length - 1; i >= 0; i--) ws.deleteRow(toDelete[i]);
  SpreadsheetApp.flush();
  return json({ ok: true, deleted: toDelete.length });
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
