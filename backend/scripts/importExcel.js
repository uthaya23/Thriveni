const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const Job = require('../models/Job');
const User = require('../models/User');

const filePath = 'C:\\projects\\thriveni\\master sheet.xlsx';

async function importData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB...");

    const admin = await User.findOne({ username: 'admin' });
    if (!admin) {
      console.error("Admin user not found. Please run seed script first.");
      process.exit(1);
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`Found ${data.length} rows. Starting import...`);

    let imported = 0;
    let skipped = 0;

    for (const row of data) {
      const jobNo = row['Job No'];
      if (!jobNo) {
        skipped++;
        continue;
      }

      // Check if already exists
      const exists = await Job.findOne({ jobNo });
      if (exists) {
        skipped++;
        continue;
      }

      // Helper to convert Excel date serials
      const excelDate = (serial) => {
        if (!serial || isNaN(serial)) return serial;
        const date = new Date((serial - 25569) * 86400 * 1000);
        return date.toLocaleDateString('en-IN');
      };

      // Map equipment model to enum
      let eqModel = 'OTHER';
      const modelStr = String(row['Sub Assy model'] || '').toUpperCase();
      if (modelStr.includes('EH5000')) eqModel = 'EH5000';
      else if (modelStr.includes('EH4500')) eqModel = 'EH4500';
      else if (modelStr.includes('830E AC')) eqModel = '830E AC';
      else if (modelStr.includes('830E DC')) eqModel = '830E DC';
      else if (modelStr.includes('BELAZ')) eqModel = 'BELAZ';

      // Map Stage based on status/action
      let stage = 'Received';
      const status = String(row['Status'] || '').toUpperCase();
      if (status === 'RFU' || status.includes('SEND')) stage = 'Completed';
      else if (status === 'WIP') stage = 'Assembly';

      await Job.create({
        jobNo: jobNo,
        description: row['Description'] || 'Unknown',
        serialNumber: row['Electric Motor Serial No'],
        equipmentModel: eqModel,

        // Legacy/Detailed fields
        desc: row['Description'],
        subAssy: row['Sub Assy model'],
        motorSerial: row['Electric Motor Serial No'],
        recDate: excelDate(row['Receiving Date']),
        recSite: row['Receiving Site'],
        failureDesc: row['Failure Description'],
        repeatDetails: row['Repet Details'],
        installedHrs: row['Installed Hrs'],
        disassyDate: excelDate(row['Disassy Start date']),
        assyDate: excelDate(row['Assy Com Date']),
        actionTaken: row['Action Taken'],
        remark: row['Remark'],
        curLocation: row['Current Location'],
        status: 'Done', // Set internal status to Done for legacy records
        stage: stage,
        createdBy: admin._id,
        updatedBy: admin._id
      });

      imported++;
      if (imported % 10 === 0) console.log(`Imported ${imported}...`);
    }

    console.log(`\nImport Complete!`);
    console.log(`Success: ${imported}`);
    console.log(`Skipped (already exists or invalid): ${skipped}`);

    process.exit(0);
  } catch (err) {
    console.error("Critical Error:", err);
    process.exit(1);
  }
}

importData();
