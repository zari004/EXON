/* =========================================================================
   EXON — Google Sheets integratsiyasi (v2)

   Maqsad:
   - "Leads" varag'i admin paneldagi Arizalar jadvali bilan bir xil bo'ladi:
     Ism | Biznes turi | Telefon | Sana
   - Telefonlar matn sifatida saqlanadi (+998... formula bo'lib qolmaydi)
   - Sana O'zbekiston vaqti bilan ko'rsatiladi
   - Yangi arizalar tepaga qo'shiladi
   - Audit yuborilmalari alohida "Audit" varag'iga yoziladi

   YANGILASH:
   1. Apps Script'dagi eski Code.gs kodini to'liq shu kodga almashtiring.
   2. Saqlang.
   3. Funksiyalar ro'yxatidan setupSheets ni tanlab bir marta Run bosing.
      Bu eski test qatorlarini va texnik ustunlarni olib tashlab, haqiqiy
      arizalarni yangi tartibga o'tkazadi.
   4. Deploy > Manage deployments > Edit > New version > Deploy.
   ========================================================================= */

var SPREADSHEET_ID = '1KKCPck3ZFaS3UqYMLANVMcA9_hLg5FCmRBFTd9GihTc';
var LEADS_SHEET_NAME = 'Leads';
var AUDIT_SHEET_NAME = 'Audit';
var TIME_ZONE = 'Asia/Tashkent';
var WEBHOOK_VERSION = '2.0';

function jsonOutput_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function openSpreadsheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  ss.setSpreadsheetTimeZone(TIME_ZONE);
  return ss;
}

function doGet() {
  try {
    var ss = openSpreadsheet_();
    var sheet = ensureLeadsSheet_(ss);
    return jsonOutput_({
      success: true,
      version: WEBHOOK_VERSION,
      message: 'EXON Sheets webhook ishlayapti',
      leadsSheetUrl: ss.getUrl() + '#gid=' + sheet.getSheetId()
    });
  } catch (err) {
    return jsonOutput_({ success: false, error: err.message });
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents || '{}');
    var ss = openSpreadsheet_();

    if (data.action === 'sync-leads') {
      var added = syncLeads_(ss, Array.isArray(data.leads) ? data.leads : []);
      return jsonOutput_({ success: true, synced: added });
    }

    if (data.source === 'audit-form') {
      var auditRow = appendAudit_(ss, data);
      return jsonOutput_({ success: true, sheet: AUDIT_SHEET_NAME, row: auditRow });
    }

    var leadRow = appendLead_(ss, data);
    return jsonOutput_({ success: true, sheet: LEADS_SHEET_NAME, row: leadRow });
  } catch (err) {
    return jsonOutput_({ success: false, error: err.message });
  }
}

function setupSheets() {
  var ss = openSpreadsheet_();
  var leads = migrateLegacyLeads_(ss);
  ensureAuditSheet_(ss);
  Logger.log(JSON.stringify({ success: true, leads: leads.getName(), version: WEBHOOK_VERSION }));
}

function formatHeader_(sheet, columns) {
  var header = sheet.getRange(1, 1, 1, columns);
  header.setFontWeight('bold');
  header.setBackground('#0BD16C');
  header.setFontColor('#FFFFFF');
  header.setHorizontalAlignment('left');
  sheet.setFrozenRows(1);
}

function formatLeadsSheet_(sheet) {
  formatHeader_(sheet, 4);
  sheet.getRange('A:A').setNumberFormat('@');
  sheet.getRange('B:B').setNumberFormat('@');
  sheet.getRange('C:C').setNumberFormat('@');
  sheet.getRange('D:D').setNumberFormat('dd/MM/yyyy, HH:mm:ss');
  sheet.setColumnWidth(1, 210);
  sheet.setColumnWidth(2, 220);
  sheet.setColumnWidth(3, 170);
  sheet.setColumnWidth(4, 180);
}

function formatAuditSheet_(sheet) {
  formatHeader_(sheet, 4);
  sheet.getRange('A:A').setNumberFormat('@');
  sheet.getRange('B:B').setNumberFormat('0');
  sheet.getRange('C:C').setNumberFormat('@');
  sheet.getRange('D:D').setNumberFormat('dd/MM/yyyy, HH:mm:ss');
  sheet.setColumnWidth(1, 250);
  sheet.setColumnWidth(2, 90);
  sheet.setColumnWidth(3, 110);
  sheet.setColumnWidth(4, 180);
}

function ensureLeadsSheet_(ss) {
  var sheet = ss.getSheetByName(LEADS_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(LEADS_SHEET_NAME);

  var first = String(sheet.getRange(1, 1).getDisplayValue() || '').trim();
  if (first === 'Sana') return migrateLegacyLeads_(ss);
  if (first !== 'Ism') sheet.getRange(1, 1, 1, 4).setValues([['Ism', 'Biznes turi', 'Telefon', 'Sana']]);
  formatLeadsSheet_(sheet);
  return sheet;
}

function ensureAuditSheet_(ss) {
  var sheet = ss.getSheetByName(AUDIT_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(AUDIT_SHEET_NAME);
  sheet.getRange(1, 1, 1, 4).setValues([['Email', 'Ball', 'Segment', 'Sana']]);
  formatAuditSheet_(sheet);
  return sheet;
}

function toDate_(value) {
  var date = value instanceof Date ? value : new Date(value || Date.now());
  return isNaN(date.getTime()) ? new Date() : date;
}

function leadKey_(name, phone, date) {
  return [String(name || '').trim(), String(phone || '').trim(), toDate_(date).toISOString()].join('|');
}

function appendLead_(ss, data) {
  var sheet = ensureLeadsSheet_(ss);
  sheet.insertRowBefore(2);
  sheet.getRange(2, 1, 1, 3).setNumberFormat('@');
  sheet.getRange(2, 1, 1, 4).setValues([[
    String(data.name || '').trim(),
    String(data.businessType || '').trim(),
    String(data.phone || '').trim(),
    toDate_(data.createdAt)
  ]]);
  sheet.getRange(2, 4).setNumberFormat('dd/MM/yyyy, HH:mm:ss');
  return 2;
}

function appendAudit_(ss, data) {
  var sheet = ensureAuditSheet_(ss);
  sheet.insertRowBefore(2);
  sheet.getRange(2, 1, 1, 4).setValues([[
    String(data.email || '').trim(),
    Number(data.score || 0),
    String(data.segment || '').trim(),
    toDate_(data.createdAt)
  ]]);
  sheet.getRange(2, 4).setNumberFormat('dd/MM/yyyy, HH:mm:ss');
  return 2;
}

function syncLeads_(ss, leads) {
  var sheet = ensureLeadsSheet_(ss);
  var values = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues()
    : [];
  var known = {};
  values.forEach(function (row) {
    known[leadKey_(row[0], row[2], row[3])] = true;
  });

  var missing = [];
  leads.forEach(function (lead) {
    var createdAt = lead.created_at || lead.createdAt;
    var key = leadKey_(lead.name, lead.phone, createdAt);
    if (!known[key]) {
      missing.push([
        String(lead.name || '').trim(),
        String(lead.business_type || lead.businessType || '').trim(),
        String(lead.phone || '').trim(),
        toDate_(createdAt)
      ]);
      known[key] = true;
    }
  });

  if (missing.length) {
    var start = sheet.getLastRow() + 1;
    sheet.getRange(start, 1, missing.length, 3).setNumberFormat('@');
    sheet.getRange(start, 1, missing.length, 4).setValues(missing);
  }
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).sort({ column: 4, ascending: false });
  }
  formatLeadsSheet_(sheet);
  return missing.length;
}

function migrateLegacyLeads_(ss) {
  var sheet = ss.getSheetByName(LEADS_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(LEADS_SHEET_NAME);
  var values = sheet.getDataRange().getValues();
  var firstHeader = values.length ? String(values[0][0] || '').trim() : '';
  var cleanRows = [];

  if (firstHeader === 'Sana') {
    values.slice(1).forEach(function (row) {
      var source = String(row[4] || '').trim();
      var name = String(row[1] || '').trim();
      if (!name || source === 'test' || source === 'codex-integration-test') return;
      if (source && source !== 'homepage-lead-form') return;
      cleanRows.push([name, String(row[2] || '').trim(), String(row[3] || '').trim(), toDate_(row[0])]);
    });
  } else if (firstHeader === 'Ism') {
    values.slice(1).forEach(function (row) {
      if (String(row[0] || '').trim()) cleanRows.push([row[0], row[1], String(row[2] || ''), toDate_(row[3])]);
    });
  }

  cleanRows.sort(function (a, b) { return b[3].getTime() - a[3].getTime(); });
  sheet.clear();
  sheet.getRange(1, 1, 1, 4).setValues([['Ism', 'Biznes turi', 'Telefon', 'Sana']]);
  if (cleanRows.length) {
    sheet.getRange(2, 1, cleanRows.length, 3).setNumberFormat('@');
    sheet.getRange(2, 1, cleanRows.length, 4).setValues(cleanRows);
  }
  formatLeadsSheet_(sheet);
  return sheet;
}
