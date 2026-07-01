const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'frontend/src/pages/AssetDetailPage.jsx',
  'frontend/src/pages/CreateJobPage.jsx',
  'frontend/src/pages/Dashboard.jsx',
  'frontend/src/pages/JobTracker.jsx',
  'frontend/src/pages/ReportsPageImpl.jsx'
];

filesToUpdate.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    // Replace job._id with job.jobNo.replace(/\//g, '-') for navigation
    // We need to match variations: ${job._id} or ${res.data._id} or ${j._id}
    
    // In AssetDetailPage.jsx: navigate(`/jobs/${job._id}`)
    content = content.replace(/navigate\(\`\/jobs\/\$\{job\._id\}\`\)/g, "navigate(`/jobs/${job.jobNo.replace(/\\\\//g, '-')}`)");
    
    // In CreateJobPage.jsx: navigate(`/jobs/${res.data._id}`);
    content = content.replace(/navigate\(\`\/jobs\/\$\{res\.data\._id\}\`\)/g, "navigate(`/jobs/${res.data.jobNo.replace(/\\\\//g, '-')}`)");
    
    // In ReportsPageImpl.jsx: navigate(`/jobs/${j._id}`)
    content = content.replace(/navigate\(\`\/jobs\/\$\{j\._id\}\`\)/g, "navigate(`/jobs/${j.jobNo.replace(/\\\\//g, '-')}`)");

    fs.writeFileSync(fullPath, content);
    console.log(`Updated ${file}`);
  }
});
