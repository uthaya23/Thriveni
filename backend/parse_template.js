const fs = require('fs');

const content = fs.readFileSync('c:\\projects\\thriveni\\backend\\templates\\reportTemplate.html', 'utf8');

const regex = /<!-- ───────────────────────────────────────────────────────────────── -->([\s\S]*?)<!-- ───────────────────────────────────────────────────────────────── -->/g;

let match;
let count = 0;
while ((match = regex.exec(content)) !== null) {
    const headerLines = match[1].split('\n').filter(l => l.trim().length > 0).slice(0, 3).join(' | ').trim();
    console.log(`Block ${count}: ${headerLines}`);
    count++;
    // regex.lastIndex advances automatically
}

const pageRegex = /<!-- PAGE.*?-->/g;
const pages = content.match(pageRegex);
console.log("\nPages:", pages);
