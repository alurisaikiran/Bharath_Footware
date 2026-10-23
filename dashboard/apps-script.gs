// ================================================================
//  BHARATH FOOTWEAR — Google Sheets Business Manager
//
//  HOW TO USE:
//  1. Open Google Sheets → Extensions → Apps Script
//  2. Delete all existing code, paste this entire file
//  3. Click Save (Ctrl+S)
//  4. Click "Run" → select "setupSpreadsheet" → Authorize
//  5. Click Deploy → New Deployment → Web App
//       Execute as: Me
//       Who has access: Anyone
//  6. Click Deploy → Copy the Web App URL
//  7. Paste that URL in the dashboard "Sync to Google Sheets" field
//  8. Click "Sync Now" in the dashboard — done!
// ================================================================

// ---- SHEET NAMES ----
var SHEET = {
  DASHBOARD : '📊 Dashboard',
  SALES     : '💰 Daily Sales',
  EMP       : '👤 Employee Pay',
  BILLS     : '🧾 Bills & Maintenance',
  MONTHLY   : '📅 Monthly Fixed',
  OTHER     : '📌 Other Expenses',
  INV       : '📦 Inventory',
  INSIGHTS  : '🤖 Weekly Insights'
};

// ---- COLORS ----
var C = {
  darkBrown : '#1A1008',
  gold      : '#D4952A',
  goldLight : '#FFF3D0',
  green     : '#27AE60',
  greenLight: '#D5F5E3',
  red       : '#E74C3C',
  redLight  : '#FADBD8',
  yellow    : '#F39C12',
  yellowLt  : '#FEF9E7',
  blue      : '#2980B9',
  blueLight : '#D6EAF8',
  purple    : '#6C3483',
  purpleLight:'#E8DAEF',
  white     : '#FFFFFF',
  bgWarm    : '#FDF8F2',
  border    : '#E5DDD0',
  headerBg  : '#2C1E0A',
  subHeader : '#F5EFE0'
};


// ================================================================
//  WEB APP ENTRY POINT
//  Called when the HTML dashboard clicks "Sync to Google Sheets"
// ================================================================
function doPost(e) {
  try {
    var raw  = e.postData ? e.postData.contents : '{}';
    var data = JSON.parse(raw);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    setupSpreadsheet();   // ensure all sheets exist

    if (data.sales)    writeSales(ss,    data.sales);
    if (data.emp)      writeEmployees(ss, data.emp);
    if (data.bills)    writeBills(ss,    data.bills);
    if (data.monthly)  writeMonthly(ss,  data.monthly);
    if (data.other)    writeOther(ss,    data.other);
    if (data.inv)      writeInventory(ss, data.inv);
    if (data.insights) writeInsights(ss, data.insights);

    writeDashboardSummary(ss);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', message: 'Synced successfully!' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Allow GET requests (for testing the URL is live)
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Bharath Footwear App Script is running!' }))
    .setMimeType(ContentService.MimeType.JSON);
}


// ================================================================
//  SETUP — Creates all sheets with headers & formatting
//  Run this once manually after pasting the script
// ================================================================
function setupSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone('Asia/Kolkata');

  ensureSheet(ss, SHEET.DASHBOARD);
  ensureSheet(ss, SHEET.SALES);
  ensureSheet(ss, SHEET.EMP);
  ensureSheet(ss, SHEET.BILLS);
  ensureSheet(ss, SHEET.MONTHLY);
  ensureSheet(ss, SHEET.OTHER);
  ensureSheet(ss, SHEET.INV);
  ensureSheet(ss, SHEET.INSIGHTS);

  setupHeaders(ss);

  // Move Dashboard to first tab
  var dashSheet = ss.getSheetByName(SHEET.DASHBOARD);
  ss.setActiveSheet(dashSheet);
  ss.moveActiveSheet(1);

  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert('✅ Bharath Footwear spreadsheet is ready!\n\nNow deploy this script as a Web App and paste the URL in your dashboard.');
}

function ensureSheet(ss, name) {
  if (!ss.getSheetByName(name)) {
    ss.insertSheet(name);
  }
}


// ================================================================
//  HEADERS SETUP
// ================================================================
function setupHeaders(ss) {
  setSheetHeaders(ss, SHEET.SALES, [
    ['DATE', 'DAY', 'SALES AMOUNT (₹)', 'NOTES'],
    C.darkBrown
  ]);

  setSheetHeaders(ss, SHEET.EMP, [
    ['EMPLOYEE NAME', 'DESIGNATION', 'MONTH', 'SALARY (₹)', 'STATUS'],
    C.darkBrown
  ]);

  setSheetHeaders(ss, SHEET.BILLS, [
    ['BILL TYPE', 'DESCRIPTION', 'DATE', 'AMOUNT (₹)', 'STATUS'],
    C.darkBrown
  ]);

  setSheetHeaders(ss, SHEET.MONTHLY, [
    ['MONTH', 'CATEGORY', 'DESCRIPTION', 'AMOUNT (₹)', 'STATUS'],
    C.darkBrown
  ]);

  setSheetHeaders(ss, SHEET.OTHER, [
    ['DESCRIPTION', 'DATE', 'AMOUNT (₹)'],
    C.darkBrown
  ]);

  setSheetHeaders(ss, SHEET.INV, [
    ['PRODUCT NAME', 'CATEGORY', 'SIZE/TYPE', 'QUANTITY', 'BUY PRICE (₹)', 'SELL PRICE (₹)', 'MARGIN %', 'REORDER LEVEL', 'STOCK STATUS'],
    C.darkBrown
  ]);

  setSheetHeaders(ss, SHEET.INSIGHTS, [
    ['DATE', 'WEEK SALES (₹)', 'LAST WEEK (₹)', 'TREND', 'MONTH PROJECTION (₹)', 'EXPENSE RATIO %', 'RECOMMENDATIONS'],
    C.headerBg
  ]);
}

function setSheetHeaders(ss, sheetName, config) {
  var sheet   = ss.getSheetByName(sheetName);
  var headers = config[0];
  var color   = config[1];

  var headerRow = sheet.getRange(1, 1, 1, headers.length);
  headerRow.setValues([headers]);
  headerRow.setBackground(color);
  headerRow.setFontColor(C.white);
  headerRow.setFontWeight('bold');
  headerRow.setFontSize(10);
  headerRow.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);

  // Auto-resize columns
  for (var i = 1; i <= headers.length; i++) {
    sheet.setColumnWidth(i, 150);
  }
  // Make description/notes columns wider
  if (sheetName === SHEET.SALES)    { sheet.setColumnWidth(4, 280); }
  if (sheetName === SHEET.BILLS)    { sheet.setColumnWidth(2, 240); }
  if (sheetName === SHEET.MONTHLY)  { sheet.setColumnWidth(3, 220); }
  if (sheetName === SHEET.OTHER)    { sheet.setColumnWidth(1, 280); }
  if (sheetName === SHEET.INV)      { sheet.setColumnWidth(1, 220); sheet.setColumnWidth(9, 130); }
  if (sheetName === SHEET.INSIGHTS) { sheet.setColumnWidth(7, 400); }
}


// ================================================================
//  WRITE DAILY SALES
// ================================================================
function writeSales(ss, records) {
  var sheet = ss.getSheetByName(SHEET.SALES);
  clearDataRows(sheet);
  if (!records || !records.length) return;

  var DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var rows = records
    .slice()
    .sort(function(a,b) { return b.date > a.date ? 1 : -1; })
    .map(function(r) {
      var dayIdx = r.date ? new Date(r.date + 'T00:00:00').getDay() : '';
      return [
        r.date   || '',
        DAYS[dayIdx] || '',
        Number(r.amount) || 0,
        r.notes  || ''
      ];
    });

  var range = sheet.getRange(2, 1, rows.length, 4);
  range.setValues(rows);

  // Format amount column as currency
  sheet.getRange(2, 3, rows.length, 1).setNumberFormat('₹#,##0.00');

  // Alternate row shading
  applyAlternateShading(sheet, rows.length, 4, C.bgWarm);

  // Totals row
  var totalRow = rows.length + 2;
  var totalCell = sheet.getRange(totalRow, 1, 1, 4);
  totalCell.merge();
  totalCell.setValue('');
  sheet.getRange(totalRow, 2).setValue('TOTAL SALES');
  sheet.getRange(totalRow, 2).setFontWeight('bold').setBackground(C.goldLight).setFontColor(C.darkBrown);
  var sumCell = sheet.getRange(totalRow, 3);
  sumCell.setFormula('=SUM(C2:C' + (rows.length + 1) + ')');
  sumCell.setNumberFormat('₹#,##0.00');
  sumCell.setFontWeight('bold').setBackground(C.goldLight).setFontColor(C.green);
}


// ================================================================
//  WRITE EMPLOYEES
// ================================================================
function writeEmployees(ss, records) {
  var sheet = ss.getSheetByName(SHEET.EMP);
  clearDataRows(sheet);
  if (!records || !records.length) return;

  var rows = records
    .slice()
    .sort(function(a,b) { return b.month > a.month ? 1 : -1; })
    .map(function(r) {
      return [
        r.name   || '',
        r.role   || '',
        r.month  || '',
        Number(r.salary) || 0,
        (r.status || 'paid').toUpperCase()
      ];
    });

  sheet.getRange(2, 1, rows.length, 5).setValues(rows);
  sheet.getRange(2, 4, rows.length, 1).setNumberFormat('₹#,##0.00');
  applyAlternateShading(sheet, rows.length, 5, C.bgWarm);
  applyStatusColoring(sheet, rows.length, 5);

  // Total
  var tot = rows.length + 2;
  sheet.getRange(tot, 3).setValue('TOTAL SALARY').setFontWeight('bold').setBackground(C.redLight);
  var s = sheet.getRange(tot, 4);
  s.setFormula('=SUM(D2:D' + (rows.length+1) + ')');
  s.setNumberFormat('₹#,##0.00').setFontWeight('bold').setBackground(C.redLight).setFontColor(C.red);
}


// ================================================================
//  WRITE BILLS
// ================================================================
function writeBills(ss, records) {
  var sheet = ss.getSheetByName(SHEET.BILLS);
  clearDataRows(sheet);
  if (!records || !records.length) return;

  var rows = records
    .slice()
    .sort(function(a,b) { return b.date > a.date ? 1 : -1; })
    .map(function(r) {
      return [
        r.type   || '',
        r.desc   || '',
        r.date   || '',
        Number(r.amount) || 0,
        (r.status || 'paid').toUpperCase()
      ];
    });

  sheet.getRange(2, 1, rows.length, 5).setValues(rows);
  sheet.getRange(2, 4, rows.length, 1).setNumberFormat('₹#,##0.00');
  applyAlternateShading(sheet, rows.length, 5, C.bgWarm);
  applyStatusColoring(sheet, rows.length, 5);

  var tot = rows.length + 2;
  sheet.getRange(tot, 3).setValue('TOTAL BILLS').setFontWeight('bold').setBackground(C.redLight);
  var s = sheet.getRange(tot, 4);
  s.setFormula('=SUM(D2:D' + (rows.length+1) + ')');
  s.setNumberFormat('₹#,##0.00').setFontWeight('bold').setBackground(C.redLight).setFontColor(C.red);
}


// ================================================================
//  WRITE MONTHLY FIXED EXPENSES
// ================================================================
function writeMonthly(ss, records) {
  var sheet = ss.getSheetByName(SHEET.MONTHLY);
  clearDataRows(sheet);
  if (!records || !records.length) return;

  var rows = records
    .slice()
    .sort(function(a,b) { return b.month > a.month ? 1 : -1; })
    .map(function(r) {
      return [
        r.month    || '',
        r.category || '',
        r.desc     || '',
        Number(r.amount) || 0,
        (r.status  || 'paid').toUpperCase()
      ];
    });

  sheet.getRange(2, 1, rows.length, 5).setValues(rows);
  sheet.getRange(2, 4, rows.length, 1).setNumberFormat('₹#,##0.00');
  applyAlternateShading(sheet, rows.length, 5, C.bgWarm);
  applyStatusColoring(sheet, rows.length, 5);

  var tot = rows.length + 2;
  sheet.getRange(tot, 3).setValue('TOTAL MONTHLY FIXED').setFontWeight('bold').setBackground(C.redLight);
  var s = sheet.getRange(tot, 4);
  s.setFormula('=SUM(D2:D' + (rows.length+1) + ')');
  s.setNumberFormat('₹#,##0.00').setFontWeight('bold').setBackground(C.redLight).setFontColor(C.red);
}


// ================================================================
//  WRITE OTHER EXPENSES
// ================================================================
function writeOther(ss, records) {
  var sheet = ss.getSheetByName(SHEET.OTHER);
  clearDataRows(sheet);
  if (!records || !records.length) return;

  var rows = records
    .slice()
    .sort(function(a,b) { return b.date > a.date ? 1 : -1; })
    .map(function(r) {
      return [
        r.desc   || '',
        r.date   || '',
        Number(r.amount) || 0
      ];
    });

  sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  sheet.getRange(2, 3, rows.length, 1).setNumberFormat('₹#,##0.00');
  applyAlternateShading(sheet, rows.length, 3, C.bgWarm);

  var tot = rows.length + 2;
  sheet.getRange(tot, 2).setValue('TOTAL OTHER').setFontWeight('bold').setBackground(C.redLight);
  var s = sheet.getRange(tot, 3);
  s.setFormula('=SUM(C2:C' + (rows.length+1) + ')');
  s.setNumberFormat('₹#,##0.00').setFontWeight('bold').setBackground(C.redLight).setFontColor(C.red);
}


// ================================================================
//  WRITE INVENTORY
// ================================================================
function writeInventory(ss, records) {
  var sheet = ss.getSheetByName(SHEET.INV);
  clearDataRows(sheet);
  if (!records || !records.length) return;

  var rows = records
    .slice()
    .sort(function(a,b) { return a.name > b.name ? 1 : -1; })
    .map(function(r) {
      var qty  = Number(r.qty)       || 0;
      var buy  = Number(r.buyPrice)  || 0;
      var sell = Number(r.sellPrice) || 0;
      var margin = (buy > 0 && sell > 0) ? Math.round(((sell - buy) / buy) * 100) : 0;
      var status = qty === 0 ? 'OUT OF STOCK' : qty <= Number(r.reorder) ? 'LOW STOCK' : 'IN STOCK';
      return [
        r.name     || '',
        r.category || '',
        r.size     || '',
        qty,
        buy  > 0 ? buy  : '',
        sell > 0 ? sell : '',
        buy > 0 && sell > 0 ? margin : '',
        Number(r.reorder) || 10,
        status
      ];
    });

  sheet.getRange(2, 1, rows.length, 9).setValues(rows);
  sheet.getRange(2, 5, rows.length, 2).setNumberFormat('₹#,##0.00');
  sheet.getRange(2, 7, rows.length, 1).setNumberFormat('0"%"');

  // Color stock status cells
  for (var i = 0; i < rows.length; i++) {
    var statusCell = sheet.getRange(i + 2, 9);
    var status     = rows[i][8];
    if (status === 'OUT OF STOCK') {
      statusCell.setBackground(C.redLight).setFontColor(C.red).setFontWeight('bold');
    } else if (status === 'LOW STOCK') {
      statusCell.setBackground(C.yellowLt).setFontColor('#7D5A00').setFontWeight('bold');
    } else {
      statusCell.setBackground(C.greenLight).setFontColor('#145A32').setFontWeight('bold');
    }
  }

  applyAlternateShading(sheet, rows.length, 8, C.bgWarm); // skip col 9 (colored)

  // Summary row
  var tot = rows.length + 2;
  sheet.getRange(tot, 1).setValue('TOTAL STOCK VALUE (SELL PRICE)')
    .setFontWeight('bold').setBackground(C.goldLight);
  var stockVal = sheet.getRange(tot, 6);
  stockVal.setFormula('=SUMPRODUCT(D2:D'+(rows.length+1)+',F2:F'+(rows.length+1)+')');
  stockVal.setNumberFormat('₹#,##0.00').setFontWeight('bold').setBackground(C.goldLight).setFontColor(C.green);
}


// ================================================================
//  WRITE WEEKLY INSIGHTS
// ================================================================
function writeInsights(ss, notes) {
  var sheet = ss.getSheetByName(SHEET.INSIGHTS);
  clearDataRows(sheet);
  if (!notes || !notes.length) return;

  var rows = notes.map(function(n) {
    var d = n.insight || {};
    return [
      n.date                          || '',
      Number(d.thisWeekSales)         || 0,
      Number(d.lastWeekSales)         || 0,
      d.salesTrendText                || '',
      Number(d.projectedSales)        || 0,
      Number(d.expRatio)              || 0,
      (d.recommendations || []).join(' | ')
    ];
  });

  sheet.getRange(2, 1, rows.length, 7).setValues(rows);
  sheet.getRange(2, 2, rows.length, 1).setNumberFormat('₹#,##0.00');
  sheet.getRange(2, 3, rows.length, 1).setNumberFormat('₹#,##0.00');
  sheet.getRange(2, 5, rows.length, 1).setNumberFormat('₹#,##0.00');
  sheet.getRange(2, 6, rows.length, 1).setNumberFormat('0"%"');
  applyAlternateShading(sheet, rows.length, 7, '#F0F4FF');

  // Color trend cells
  for (var i = 0; i < rows.length; i++) {
    var trendCell = sheet.getRange(i + 2, 4);
    var trend     = rows[i][3] || '';
    if (trend.indexOf('▲') !== -1) {
      trendCell.setFontColor(C.green).setFontWeight('bold');
    } else if (trend.indexOf('▼') !== -1) {
      trendCell.setFontColor(C.red).setFontWeight('bold');
    }
  }
}


// ================================================================
//  WRITE DASHBOARD SUMMARY SHEET
// ================================================================
function writeDashboardSummary(ss) {
  var sheet = ss.getSheetByName(SHEET.DASHBOARD);
  sheet.clear();

  var now     = new Date();
  var monthYM = Utilities.formatDate(now, 'Asia/Kolkata', 'yyyy-MM');
  var yearY   = Utilities.formatDate(now, 'Asia/Kolkata', 'yyyy');
  var today   = Utilities.formatDate(now, 'Asia/Kolkata', 'yyyy-MM-dd');

  // ---- Title ----
  sheet.getRange('A1:F1').merge()
    .setValue('BHARATH FOOTWEAR — BUSINESS DASHBOARD')
    .setBackground(C.darkBrown)
    .setFontColor(C.gold)
    .setFontWeight('bold')
    .setFontSize(16)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 50);

  sheet.getRange('A2:F2').merge()
    .setValue('Last synced: ' + Utilities.formatDate(now, 'Asia/Kolkata', 'dd MMM yyyy, hh:mm a'))
    .setBackground(C.goldLight)
    .setFontColor(C.darkBrown)
    .setFontSize(10)
    .setHorizontalAlignment('center');

  // ---- Section: This Month Summary ----
  writeDashSection(sheet, 4, 'A', 'THIS MONTH — ' + monthYM, C.headerBg);

  var salesSheet   = "'" + SHEET.SALES   + "'";
  var empSheet     = "'" + SHEET.EMP     + "'";
  var billsSheet   = "'" + SHEET.BILLS   + "'";
  var monthlySheet = "'" + SHEET.MONTHLY + "'";
  var otherSheet   = "'" + SHEET.OTHER   + "'";

  var dashRows = [
    ['Total Sales This Month',
      '=SUMIF('+salesSheet+'!A:A,"'+ monthYM +'*",'+salesSheet+'!C:C)',   C.greenLight, C.green],
    ['Employee Pay This Month',
      '=SUMIF('+empSheet+'!C:C,"'+ monthYM +'*",'+empSheet+'!D:D)',       C.redLight,   C.red],
    ['Bills & Maintenance',
      '=SUMIF('+billsSheet+'!C:C,"'+ monthYM +'*",'+billsSheet+'!D:D)',   C.redLight,   C.red],
    ['Monthly Fixed Expenses',
      '=SUMIF('+monthlySheet+'!A:A,"'+ monthYM +'*",'+monthlySheet+'!D:D)',C.redLight,  C.red],
    ['Other Expenses',
      '=SUMIF('+otherSheet+'!B:B,"'+ monthYM +'*",'+otherSheet+'!C:C)',   C.redLight,   C.red],
    ['NET PROFIT THIS MONTH', null, C.goldLight, C.darkBrown]
  ];

  var startRow = 5;
  for (var i = 0; i < dashRows.length; i++) {
    var r   = startRow + i;
    var row = dashRows[i];
    var labelCell = sheet.getRange(r, 1, 1, 2);
    labelCell.merge().setValue(row[0])
      .setBackground(row[2]).setFontColor(C.darkBrown)
      .setFontWeight(i === dashRows.length - 1 ? 'bold' : 'normal')
      .setFontSize(11).setVerticalAlignment('middle');
    sheet.setRowHeight(r, 36);

    var valCell = sheet.getRange(r, 3);
    if (row[1]) {
      valCell.setFormula(row[1]);
    } else {
      // Net profit = Sales - all expenses
      valCell.setFormula('=B5-B6-B7-B8-B9');
    }
    valCell.setNumberFormat('₹#,##0.00')
      .setBackground(row[2]).setFontColor(row[3])
      .setFontWeight('bold').setFontSize(12)
      .setHorizontalAlignment('center');
  }

  // Fix formula references (column B was placeholder, use C)
  sheet.getRange('B5').setFormula('=SUMIF(' + salesSheet + '!A:A,"' + monthYM + '*",' + salesSheet + '!C:C)');
  sheet.getRange('B6').setFormula('=SUMIF(' + empSheet + '!C:C,"' + monthYM + '*",' + empSheet + '!D:D)');
  sheet.getRange('B7').setFormula('=SUMIF(' + billsSheet + '!C:C,"' + monthYM + '*",' + billsSheet + '!D:D)');
  sheet.getRange('B8').setFormula('=SUMIF(' + monthlySheet + '!A:A,"' + monthYM + '*",' + monthlySheet + '!D:D)');
  sheet.getRange('B9').setFormula('=SUMIF(' + otherSheet + '!B:B,"' + monthYM + '*",' + otherSheet + '!C:C)');
  sheet.getRange('B10').setFormula('=B5-B6-B7-B8-B9');

  // Format B column
  sheet.getRange('B5:B10').setNumberFormat('₹#,##0.00').setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center');
  // Colour net profit
  sheet.getRange('A10:C10').setBackground(C.goldLight).setFontColor(C.darkBrown).setFontWeight('bold');
  sheet.getRange('B10').setFontSize(14);

  // ---- Section: This Year ----
  writeDashSection(sheet, 12, 'A', 'THIS YEAR — ' + yearY, C.headerBg);

  sheet.getRange('A13:B13').merge().setValue('Total Sales This Year')
    .setBackground(C.greenLight).setFontSize(11);
  sheet.getRange('C13')
    .setFormula('=SUMIF(' + salesSheet + '!A:A,"' + yearY + '*",' + salesSheet + '!C:C)')
    .setNumberFormat('₹#,##0.00').setFontWeight('bold').setFontSize(12)
    .setBackground(C.greenLight).setFontColor(C.green).setHorizontalAlignment('center');
  sheet.setRowHeight(13, 36);

  sheet.getRange('A14:B14').merge().setValue('Total Expenses This Year')
    .setBackground(C.redLight).setFontSize(11);
  sheet.getRange('C14')
    .setFormula('=SUMIF(' + empSheet + '!C:C,"' + yearY + '*",' + empSheet + '!D:D)'
              + '+SUMIF(' + billsSheet + '!C:C,"' + yearY + '*",' + billsSheet + '!D:D)'
              + '+SUMIF(' + monthlySheet + '!A:A,"' + yearY + '*",' + monthlySheet + '!D:D)'
              + '+SUMIF(' + otherSheet + '!B:B,"' + yearY + '*",' + otherSheet + '!C:C)')
    .setNumberFormat('₹#,##0.00').setFontWeight('bold').setFontSize(12)
    .setBackground(C.redLight).setFontColor(C.red).setHorizontalAlignment('center');
  sheet.setRowHeight(14, 36);

  sheet.getRange('A15:B15').merge().setValue('NET PROFIT THIS YEAR')
    .setBackground(C.goldLight).setFontWeight('bold').setFontSize(11);
  sheet.getRange('C15')
    .setFormula('=C13-C14')
    .setNumberFormat('₹#,##0.00').setFontWeight('bold').setFontSize(14)
    .setBackground(C.goldLight).setFontColor(C.darkBrown).setHorizontalAlignment('center');
  sheet.setRowHeight(15, 40);

  // ---- Inventory Quick View ----
  writeDashSection(sheet, 17, 'A', 'INVENTORY QUICK VIEW', C.headerBg);

  var invSheet = "'" + SHEET.INV + "'";
  sheet.getRange('A18:B18').merge().setValue('Total Products').setBackground(C.bgWarm).setFontSize(11);
  sheet.getRange('C18').setFormula('=COUNTA(' + invSheet + '!A:A)-1')
    .setFontWeight('bold').setFontSize(12).setBackground(C.bgWarm).setHorizontalAlignment('center');
  sheet.setRowHeight(18, 32);

  sheet.getRange('A19:B19').merge().setValue('Total Pairs in Stock').setBackground(C.bgWarm).setFontSize(11);
  sheet.getRange('C19').setFormula('=SUM(' + invSheet + '!D:D)')
    .setFontWeight('bold').setFontSize(12).setBackground(C.bgWarm).setHorizontalAlignment('center');
  sheet.setRowHeight(19, 32);

  sheet.getRange('A20:B20').merge().setValue('Total Stock Value (Sell Price)').setBackground(C.greenLight).setFontSize(11);
  sheet.getRange('C20').setFormula('=SUMPRODUCT(' + invSheet + '!D2:D1000,' + invSheet + '!F2:F1000)')
    .setNumberFormat('₹#,##0.00').setFontWeight('bold').setFontSize(12)
    .setBackground(C.greenLight).setFontColor(C.green).setHorizontalAlignment('center');
  sheet.setRowHeight(20, 32);

  sheet.getRange('A21:B21').merge().setValue('Out of Stock Items').setBackground(C.redLight).setFontSize(11);
  sheet.getRange('C21').setFormula('=COUNTIF(' + invSheet + '!I:I,"OUT OF STOCK")')
    .setFontWeight('bold').setFontSize(12).setBackground(C.redLight).setFontColor(C.red).setHorizontalAlignment('center');
  sheet.setRowHeight(21, 32);

  // Column widths
  sheet.setColumnWidth(1, 240);
  sheet.setColumnWidth(2, 80);
  sheet.setColumnWidth(3, 180);

  SpreadsheetApp.flush();
}

function writeDashSection(sheet, row, col, title, bgColor) {
  sheet.getRange(row, 1, 1, 3).merge()
    .setValue(title)
    .setBackground(bgColor)
    .setFontColor(C.gold)
    .setFontWeight('bold')
    .setFontSize(12)
    .setHorizontalAlignment('left')
    .setPaddingLeft && sheet.getRange(row, 1, 1, 3).setHorizontalAlignment('left');
  sheet.setRowHeight(row, 30);
}


// ================================================================
//  HELPERS
// ================================================================
function clearDataRows(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent().clearFormat();
  }
}

function applyAlternateShading(sheet, numRows, numCols, color) {
  for (var i = 0; i < numRows; i++) {
    if (i % 2 === 1) {
      sheet.getRange(i + 2, 1, 1, numCols).setBackground(color);
    }
  }
}

function applyStatusColoring(sheet, numRows, statusCol) {
  for (var i = 0; i < numRows; i++) {
    var cell = sheet.getRange(i + 2, statusCol);
    var val  = cell.getValue();
    if (val === 'PAID') {
      cell.setBackground(C.greenLight).setFontColor('#145A32').setFontWeight('bold');
    } else if (val === 'PENDING') {
      cell.setBackground(C.yellowLt).setFontColor('#7D5A00').setFontWeight('bold');
    }
  }
}


// ================================================================
//  MANUAL TRIGGER — Run from Apps Script editor
//  Useful if you want to set up sheets without syncing from app
// ================================================================
function manualSetup() {
  setupSpreadsheet();
}
