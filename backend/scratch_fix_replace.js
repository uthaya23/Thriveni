const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'frontend/src/pages/AssetDetailPage.jsx',
  'frontend/src/pages/Dashboard.jsx',
  'frontend/src/pages/CreateJobPage.jsx',
  'frontend/src/pages/JobDetailPage.jsx',
  'frontend/src/pages/JobTracker.jsx',
  'frontend/src/pages/ReportsPageImpl.jsx'
];

filesToUpdate.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    // Replace job.jobNo.replace(/\\//g, '-') with job.jobNo.replaceAll('/', '-')
    content = content.replace(/replace\(\/\\\\\\\/\\\/g,\s*'-'\)/g, "replaceAll('/', '-')");
    // Wait, regex to match `/\\\\//g` is tricky. Let's just string replace it.
    content = content.split("replace(/\\\\//g, '-')").join("replaceAll('/', '-')");

    fs.writeFileSync(fullPath, content);
    console.log(`Updated ${file}`);
  }
});
