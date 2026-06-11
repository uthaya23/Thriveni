const XLSX = require('xlsx');
const path = require('path');

const filePath = 'C:\\projects\\thriveni\\master sheet.xlsx';
try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  // Print first 10 rows to analyze structure
  console.log(JSON.stringify(data.slice(0, 50), null, 2));
} catch (err) {
  console.error("Error reading excel:", err.message);
}
