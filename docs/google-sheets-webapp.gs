/* =========================================================================
   EXON — Google Sheets Lead Webhook
   =========================================================================

   FOYDALANISH:
   1. Google Sheets'da yangi jadval yarating
   2. Extensions > Apps Script > yangi loyiha oching
   3. Bu kodni to'liq nusxalab, default Code.gs o'rniga qo'ying
   4. spreadsheetId ni o'zgartiring (1-nqadamdagi jadval ID'si)
   5. Deploy > New deployment > Web app
      - Execute as: Me
      - Who has access: Anyone
   6. Web app URL'ni oling va assets/js/api-base.js ga qo'shing

   Jadval ustunlari avtomatik yaratiladi:
   A: Sana (timestamp)
   B: Ism (name)
   C: Biznes turi (businessType)
   D: Telefon (phone)
   E: Manba (source)
   F: Meta Event ID
   ========================================================================= */

// ★ O'ZGARTIRING — Google Sheets ID'si (URL'dan oladi)
// Masalan: https://docs.google.com/spreadsheets/d/BU_YERDA_ID_BOR/edit
// BU_YERDA_ID_BOR qismini pastdagi SPREADSHEET_ID ga qo'ying
var SPREADSHEET_ID = 'BU_YERDA_SHEETS_ID_NI_QOYING';
var SHEET_NAME = 'Leads';

function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({ success: true, message: 'EXON Sheets webhook ishlayapti' })
  ).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);

    // Agar sheet yo'q bo'lsa — yaratamiz
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        'Sana',
        'Ism',
        'Biznes turi',
        'Telefon',
        'Manba',
        'Meta Event ID'
      ]);
      // Sarlavha qatorini formatlash
      var headerRange = sheet.getRange(1, 1, 1, 6);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#0BD16C');
      headerRange.setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
    }

    // Ma'lumotlarni yozamiz
    var timestamp = new Date();
    var row = [
      timestamp,                                        // A: Sana
      data.name || '',                                  // B: Ism
      data.businessType || '',                          // C: Biznes turi
      data.phone || '',                                 // D: Telefon
      data.source || 'homepage-lead-form',              // E: Manba
      data.metaEventId || ''                            // F: Meta Event ID
    ];

    sheet.appendRow(row);

    // Oxirgi qatorni biroz formatlash (yangi qator uchun chegara)
    var lastRow = sheet.getLastRow();
    var dataRange = sheet.getRange(lastRow, 1, 1, 6);
    dataRange.setBorder(true, true, true, true, true, true);

    return ContentService.createTextOutput(
      JSON.stringify({ success: true, row: lastRow })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// Test — Apps Script editoridan ishga tushiring
function testPost() {
  var testData = {
    postData: {
      contents: JSON.stringify({
        name: 'Test Foydalanuvchi',
        businessType: 'Elektronika',
        phone: '+998 90 123 45 67',
        source: 'test',
        metaEventId: 'test-' + Date.now()
      })
    }
  };
  var result = doPost(testData);
  Logger.log(result.getContent());
}
