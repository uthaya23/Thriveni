const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGO_URI;

// List of collections you want to back up
const collectionsToBackup = [
  'users',
  'jobs',
  'machinemodels',
  'componenttypes',
  'inspectiontemplates',
  'dismantlingtemplates',
  'componenttemplates',
  'jobdatas'
];

async function runBackup() {
  if (!MONGO_URI) {
    console.error('❌ MONGO_URI is missing in .env file');
    process.exit(1);
  }

  try {
    console.log('⏳ Connecting to database...');
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    console.log('✅ Connected successfully.\n');

    // Create backups directory if it doesn't exist
    const backupsDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir);
    }

    // Create a folder for today's backup with timestamp
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const todayBackupDir = path.join(backupsDir, `backup_${dateStr}`);
    fs.mkdirSync(todayBackupDir);

    console.log(`📁 Saving backups to: ./backups/backup_${dateStr}/`);

    // Fetch and save each collection
    for (const collectionName of collectionsToBackup) {
      console.log(`   Downloading collection: ${collectionName}...`);
      const data = await db.collection(collectionName).find({}).toArray();
      
      const filePath = path.join(todayBackupDir, `${collectionName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      
      console.log(`   ✔️ Saved ${data.length} records to ${collectionName}.json`);
    }

    console.log('\n🎉 Backup completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Backup failed:', error.message);
    process.exit(1);
  }
}

runBackup();
