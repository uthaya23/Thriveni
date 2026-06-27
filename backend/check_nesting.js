const fs = require('fs');
const lines = fs.readFileSync('c:\\projects\\thriveni\\backend\\templates\\reportTemplate.html','utf8').split('\n');
let depth = 0;
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  const opens = (l.match(/\{\{#if /g) || []).length + (l.match(/\{\{#each /g) || []).length + (l.match(/\{\{#unless /g) || []).length;
  const closes = (l.match(/\{\{\/if\}\}/g) || []).length + (l.match(/\{\{\/each\}\}/g) || []).length + (l.match(/\{\{\/unless\}\}/g) || []).length + (l.match(/\{\{\/ifEquals\}\}/g) || []).length;
  depth += opens - closes;
  if (opens > 0 || closes > 0) {
    console.log('L' + (i+1) + ': depth=' + depth + ' +' + opens + ' -' + closes + ' | ' + l.trim().substring(0,90));
  }
}
console.log('Final depth:', depth);
