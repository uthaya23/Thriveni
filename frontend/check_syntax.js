const parser = require('@babel/parser');
const fs = require('fs');

try {
  const code = fs.readFileSync('src/pages/tabs/ReportTab.jsx', 'utf8');
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx']
  });
  console.log('No syntax errors found!');
} catch (error) {
  console.error('Syntax Error at line', error.loc?.line, 'column', error.loc?.column);
  console.error(error.message);
}
