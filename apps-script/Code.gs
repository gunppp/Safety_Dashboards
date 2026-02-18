/**
 * Safety Dashboard Google Sheets DB (Apps Script Web App)
 *
 * How to use:
 * 1) Create a Google Sheet.
 * 2) Extensions -> Apps Script -> paste this file.
 * 3) Set your token below.
 * 4) Deploy -> New deployment -> Web app.
 *    - Execute as: Me
 *    - Who has access: Anyone (for read)   [write still requires token]
 *
 * Endpoints:
 *  GET  ?action=get
 *  POST { action: 'set', token: '...', data: {...} }
 */

const WRITE_TOKEN = 'CHANGE_ME_TOKEN';

// Sheet tab name
const TAB = 'DB';

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'get';
  if (action !== 'get') {
    return json_({ ok: false, error: 'Unsupported GET action' }, 400);
  }
  const data = readDb_();
  return json_({ ok: true, ...data }, 200);
}

function doPost(e) {
  let body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: 'Invalid JSON' }, 400);
  }

  const action = body.action || '';
  if (action !== 'set') {
    return json_({ ok: false, error: 'Unsupported POST action' }, 400);
  }

  const token = String(body.token || '');
  if (!token || token !== WRITE_TOKEN) {
    return json_({ ok: false, error: 'Unauthorized' }, 401);
  }

  const data = body.data || {};
  writeDb_(data);
  return json_({ ok: true }, 200);
}

function readDb_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ensureTab_(ss);

  const values = sh.getRange(1, 1, sh.getLastRow(), 2).getValues();
  const map = {};
  for (let i = 0; i < values.length; i++) {
    const key = values[i][0];
    const val = values[i][1];
    if (!key) continue;
    map[String(key).trim()] = val;
  }

  // Stored as JSON strings
  const announcements = safeParse_(map.announcements, []);
  const incidents = safeParse_(map.incidents, []);

  return {
    manHoursYear: Number(map.manHoursYear || 200000),
    policyImage: map.policyImage ? String(map.policyImage) : null,
    announcements,
    incidents,
    updatedAt: map.updatedAt ? String(map.updatedAt) : new Date().toISOString(),
  };
}

function writeDb_(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ensureTab_(ss);

  const kv = {
    manHoursYear: Number(data.manHoursYear || 200000),
    policyImage: data.policyImage || '',
    announcements: JSON.stringify(data.announcements || []),
    incidents: JSON.stringify(data.incidents || []),
    updatedAt: data.updatedAt || new Date().toISOString(),
  };

  const keys = Object.keys(kv);
  sh.clearContents();
  sh.getRange(1, 1, keys.length, 2).setValues(
    keys.map((k) => [k, kv[k]])
  );
  sh.autoResizeColumns(1, 2);
}

function ensureTab_(ss) {
  let sh = ss.getSheetByName(TAB);
  if (!sh) sh = ss.insertSheet(TAB);
  return sh;
}

function safeParse_(v, fallback) {
  try {
    if (!v) return fallback;
    return JSON.parse(String(v));
  } catch (e) {
    return fallback;
  }
}

function json_(obj, code) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
