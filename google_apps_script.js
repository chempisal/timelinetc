/**
 * ============================================================================
 * Google Apps Script for School Timetable Database
 * (កូដ Google Apps Script សម្រាប់ភ្ជាប់ជាមួយ Google Sheets ធ្វើជា Database)
 * ============================================================================
 * 
 * របៀបដំឡើង (Setup Instructions):
 * 1. បង្កើត Google Sheet ថ្មីមួយនៅ https://sheets.new (ដាក់ឈ្មោះថា "កាលវិភាគបង្រៀន")
 * 2. ចុច Extensions (ផ្នែកបន្ថែម) -> Apps Script
 * 3. លុបកូដចាស់ចោល រួច Copy កូដខាងក្រោមនេះទាំងស្រុងទៅបិទភ្ជាប់ (Paste)
 * 4. ចុច Save (💾)
 * 5. ចុច Deploy (ដាក់ឱ្យប្រើ) -> New deployment (ការដាក់ឱ្យប្រើថ្មី)
 *    - Select type: Web app (កម្មវិធីគេហទំព័រ)
 *    - Description: Timetable Database
 *    - Execute as: Me (ខ្ញុំ)
 *    - Who has access: Anyone (អ្នកណាដែលមានតំណភ្ជាប់) *** សំខាន់ណាស់ ***
 * 6. ចុច Deploy -> Review permissions (អនុញ្ញាតសិទ្ធិ Google Account)
 * 7. ចម្លង "Web app URL" (មានទម្រង់ https://script.google.com/macros/s/.../exec)
 * 8. យក URL នោះមកដាក់ក្នុងប្រព័ន្ធកាលវិភាគ!
 */

const SHEET_NAME_HOMEROOM = "គ្រូបន្ទុកថ្នាក់";
const SHEET_NAME_TEACHERS = "គ្រូមុខវិជ្ជា";
const SHEET_NAME_JSON = "ទិន្នន័យរួម_JSON";

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getData";
    
    if (action === "ping") {
      return jsonResponse({
        status: "success",
        provider: "Google Sheets Database",
        message: "បានតភ្ជាប់ទៅកាន់ Google Sheet ដោយជោគជ័យ!"
      });
    }
    
    // Fetch JSON sheet data
    let jsonSheet = ss.getSheetByName(SHEET_NAME_JSON);
    let fullData = null;
    if (jsonSheet) {
      const rawJson = jsonSheet.getRange("A2").getValue();
      if (rawJson && typeof rawJson === "string" && rawJson.trim().length > 0) {
        try {
          fullData = JSON.parse(rawJson);
        } catch (err) {}
      }
    }
    
    // Read homeroom sheet for direct sheet overrides
    let hrSheet = ss.getSheetByName(SHEET_NAME_HOMEROOM);
    let homeroomMap = {};
    if (hrSheet && hrSheet.getLastRow() > 1) {
      const hrRows = hrSheet.getRange(2, 1, hrSheet.getLastRow() - 1, 2).getValues();
      hrRows.forEach(row => {
        const clsId = String(row[0]).trim();
        const teacher = String(row[1]).trim();
        if (clsId && teacher) {
          homeroomMap[clsId] = teacher;
        }
      });
    }
    
    // Read teachers sheet for direct sheet overrides
    let tSheet = ss.getSheetByName(SHEET_NAME_TEACHERS);
    let teachersMap = {};
    if (tSheet && tSheet.getLastRow() > 1) {
      const tRows = tSheet.getRange(2, 1, tSheet.getLastRow() - 1, 7).getValues();
      tRows.forEach(row => {
        const code = String(row[0]).trim().toUpperCase();
        if (code) {
          teachersMap[code] = {
            name: String(row[1] || "").trim(),
            gender: String(row[2] || "ប្រុស").trim(),
            subject_key: String(row[3] || "").trim(),
            phone: String(row[4] || "").trim(),
            homeroom_class: String(row[5] || "").trim(),
            note: String(row[6] || "").trim()
          };
        }
      });
    }
    
    // If we have full data, merge sheet rows into it
    if (fullData) {
      if (Object.keys(homeroomMap).length > 0) {
        if (!fullData.custom_homeroom) fullData.custom_homeroom = {};
        Object.assign(fullData.custom_homeroom, homeroomMap);
        if (fullData.classes) {
          fullData.classes.forEach(cls => {
            if (homeroomMap[cls.id]) cls.homeroom = homeroomMap[cls.id];
          });
        }
      }
      if (Object.keys(teachersMap).length > 0) {
        if (!fullData.custom_teachers) fullData.custom_teachers = {};
        Object.assign(fullData.custom_teachers, teachersMap);
      }
      return jsonResponse({
        status: "success",
        data: fullData,
        cloud_updated_at: new Date().toISOString()
      });
    }
    
    // Return homeroom & teachers maps if no full JSON yet
    return jsonResponse({
      status: "success",
      custom_homeroom: homeroomMap,
      custom_teachers: teachersMap,
      cloud_updated_at: new Date().toISOString()
    });
    
  } catch (err) {
    return jsonResponse({
      status: "error",
      message: err.toString()
    });
  }
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }
    
    const action = payload.action || "saveAll";
    const nowStr = Utilities.formatDate(new Date(), "Asia/Phnom_Penh", "yyyy-MM-dd HH:mm:ss");
    
    // 1. Action: saveAll (Push full database to sheets)
    if (action === "saveAll" || payload.full_data) {
      const data = payload.full_data || payload;
      
      // Update JSON Backup sheet
      let jsonSheet = getOrCreateSheet(ss, SHEET_NAME_JSON);
      jsonSheet.getRange("A1:B1").setValues([["ទិន្នន័យរួម JSON (Full Database Backup)", "កាលបរិច្ឆេទកែប្រែ"]]);
      jsonSheet.getRange("A1:B1").setBackground("#1e293b").setFontColor("#ffffff").setFontWeight("bold");
      jsonSheet.getRange("A2").setValue(JSON.stringify(data));
      jsonSheet.getRange("B2").setValue(nowStr);
      
      // Update Homeroom Sheet
      if (data.classes || data.custom_homeroom) {
        updateHomeroomSheet(ss, data.classes, data.custom_homeroom, nowStr);
      }
      
      // Update Teachers Sheet
      if (data.custom_teachers) {
        updateTeachersSheet(ss, data.custom_teachers, nowStr);
      }
      
      return jsonResponse({
        status: "success",
        message: "បានរក្សាទុកទិន្នន័យកាលវិភាគទាំងអស់ទៅក្នុង Google Sheets ដោយជោគជ័យ!",
        updated_at: nowStr
      });
    }
    
    // 2. Action: saveHomeroom (Single or map)
    if (action === "saveHomeroom") {
      let hrSheet = getOrCreateSheet(ss, SHEET_NAME_HOMEROOM);
      const hrMap = payload.homeroom_map || { [payload.class_id]: payload.homeroom };
      
      // Read current rows
      let existingRows = hrSheet.getLastRow() > 1 ? hrSheet.getRange(2, 1, hrSheet.getLastRow() - 1, 3).getValues() : [];
      let rowMap = {};
      existingRows.forEach((r, idx) => {
        rowMap[String(r[0]).trim()] = idx + 2;
      });
      
      for (const [clsId, teacher] of Object.entries(hrMap)) {
        if (rowMap[clsId]) {
          hrSheet.getRange(rowMap[clsId], 2).setValue(teacher);
          hrSheet.getRange(rowMap[clsId], 3).setValue(nowStr);
        } else {
          hrSheet.appendRow([clsId, teacher, nowStr]);
        }
      }
      
      // Also sync to JSON tab
      syncSheetToJson(ss);
      
      return jsonResponse({
        status: "success",
        message: "បានកែប្រែឈ្មោះគ្រូបន្ទុកថ្នាក់ក្នុង Google Sheet រួចរាល់!",
        updated_at: nowStr
      });
    }
    
    // 3. Action: saveTeacher
    if (action === "saveTeacher" || action === "addTeacher") {
      let tSheet = getOrCreateSheet(ss, SHEET_NAME_TEACHERS);
      const tInfo = payload.teacher || payload;
      const code = String(tInfo.code).trim().toUpperCase();
      
      let existingRows = tSheet.getLastRow() > 1 ? tSheet.getRange(2, 1, tSheet.getLastRow() - 1, 8).getValues() : [];
      let foundRow = -1;
      for (let i = 0; i < existingRows.length; i++) {
        if (String(existingRows[i][0]).trim().toUpperCase() === code) {
          foundRow = i + 2;
          break;
        }
      }
      
      const rowData = [
        code,
        tInfo.name || `គ្រូ ${code}`,
        tInfo.gender || "ប្រុស",
        tInfo.subject_key || "",
        tInfo.phone || "",
        tInfo.homeroom_class || "",
        tInfo.note || "",
        nowStr
      ];
      
      if (foundRow > 0) {
        tSheet.getRange(foundRow, 1, 1, 8).setValues([rowData]);
      } else {
        tSheet.appendRow(rowData);
      }
      
      // Also sync to JSON tab
      syncSheetToJson(ss);
      
      return jsonResponse({
        status: "success",
        message: `បានរក្សាទុកព័ត៌មានគ្រូ ${code} ក្នុង Google Sheet រួចរាល់!`,
        updated_at: nowStr
      });
    }
    
    // 4. Action: deleteTeacher
    if (action === "deleteTeacher") {
      let tSheet = getOrCreateSheet(ss, SHEET_NAME_TEACHERS);
      const code = String(payload.code).trim().toUpperCase();
      let existingRows = tSheet.getLastRow() > 1 ? tSheet.getRange(2, 1, tSheet.getLastRow() - 1, 1).getValues() : [];
      for (let i = existingRows.length - 1; i >= 0; i--) {
        if (String(existingRows[i][0]).trim().toUpperCase() === code) {
          tSheet.deleteRow(i + 2);
          break;
        }
      }
      syncSheetToJson(ss);
      return jsonResponse({
        status: "success",
        message: `បានលុបគ្រូ ${code} ពី Google Sheet រួចរាល់!`
      });
    }

    return jsonResponse({ status: "error", message: "សកម្មភាព (Action) មិនស្គាល់" });
    
  } catch (err) {
    return jsonResponse({
      status: "error",
      message: err.toString()
    });
  }
}

// Helpers
function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function updateHomeroomSheet(ss, classes, customHr, nowStr) {
  let sheet = getOrCreateSheet(ss, SHEET_NAME_HOMEROOM);
  sheet.clear();
  const headers = ["កូដថ្នាក់ (Class)", "ឈ្មោះគ្រូបន្ទុកថ្នាក់ (Homeroom Teacher)", "កាលបរិច្ឆេទកែប្រែ"];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, 3).setBackground("#0284c7").setFontColor("#ffffff").setFontWeight("bold");
  
  const hrMap = customHr || {};
  const rows = [];
  if (classes && classes.length > 0) {
    classes.forEach(c => {
      const hr = hrMap[c.id] || c.homeroom || "";
      rows.push([c.id, hr, nowStr]);
    });
  }
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  }
  sheet.autoResizeColumns(1, 3);
}

function updateTeachersSheet(ss, customTeachers, nowStr) {
  let sheet = getOrCreateSheet(ss, SHEET_NAME_TEACHERS);
  sheet.clear();
  const headers = ["កូដគ្រូ (Code)", "ឈ្មោះគ្រូ (Name)", "ភេទ (Gender)", "មុខវិជ្ជា (Subject)", "លេខទូរស័ព្ទ (Phone)", "បន្ទុកថ្នាក់ (Homeroom)", "កំណត់សម្គាល់ (Note)", "កាលបរិច្ឆេទ"];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, 8).setBackground("#059669").setFontColor("#ffffff").setFontWeight("bold");
  
  const rows = [];
  for (const [code, t] of Object.entries(customTeachers || {})) {
    rows.push([
      code,
      t.name || `គ្រូ ${code}`,
      t.gender || "ប្រុស",
      t.subject_key || "",
      t.phone || "",
      t.homeroom_class || "",
      t.note || "",
      nowStr
    ]);
  }
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 8).setValues(rows);
  }
  sheet.autoResizeColumns(1, 8);
}

function syncSheetToJson(ss) {
  try {
    let jsonSheet = ss.getSheetByName(SHEET_NAME_JSON);
    if (!jsonSheet) return;
    const raw = jsonSheet.getRange("A2").getValue();
    if (!raw) return;
    let fullData = JSON.parse(raw);
    
    // Homeroom
    let hrSheet = ss.getSheetByName(SHEET_NAME_HOMEROOM);
    if (hrSheet && hrSheet.getLastRow() > 1) {
      const rows = hrSheet.getRange(2, 1, hrSheet.getLastRow() - 1, 2).getValues();
      if (!fullData.custom_homeroom) fullData.custom_homeroom = {};
      rows.forEach(r => {
        const c = String(r[0]).trim();
        const t = String(r[1]).trim();
        if (c && t) {
          fullData.custom_homeroom[c] = t;
          if (fullData.classes) {
            fullData.classes.forEach(cls => {
              if (cls.id === c) cls.homeroom = t;
            });
          }
        }
      });
    }
    
    // Teachers
    let tSheet = ss.getSheetByName(SHEET_NAME_TEACHERS);
    if (tSheet && tSheet.getLastRow() > 1) {
      const rows = tSheet.getRange(2, 1, tSheet.getLastRow() - 1, 7).getValues();
      if (!fullData.custom_teachers) fullData.custom_teachers = {};
      rows.forEach(r => {
        const code = String(r[0]).trim().toUpperCase();
        if (code) {
          fullData.custom_teachers[code] = {
            name: String(r[1] || "").trim(),
            gender: String(r[2] || "ប្រុស").trim(),
            subject_key: String(r[3] || "").trim(),
            phone: String(r[4] || "").trim(),
            homeroom_class: String(r[5] || "").trim(),
            note: String(r[6] || "").trim()
          };
        }
      });
    }
    
    fullData.cloud_updated_at = new Date().toISOString();
    jsonSheet.getRange("A2").setValue(JSON.stringify(fullData));
    jsonSheet.getRange("B2").setValue(Utilities.formatDate(new Date(), "Asia/Phnom_Penh", "yyyy-MM-dd HH:mm:ss"));
  } catch (err) {}
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

