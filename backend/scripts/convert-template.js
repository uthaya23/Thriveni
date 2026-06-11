const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const templatePath = path.join(__dirname, '../templates/master-report-template.docx');
const outputPath = path.join(__dirname, '../templates/master-report-template.docx'); // overwrite

function makeRegex(str) {
  // Convert & to &amp;
  str = str.replace(/&/g, '&amp;');
  // Allow spaces to match any combination of spaces and XML tags
  const parts = str.split(/\s+/).map(word => {
    return word.split('').map(c => c.replace(/[-[\]{}()*+?.,\\^$|#]/g, '\\$&')).join('(?:<[^>]*>)*');
  });
  return new RegExp(parts.join('(?:<[^>]*>|\\s|&nbsp;)*'), 'g');
}

function replaceTextSafe(xml, searchStr, replacement) {
  const regex = makeRegex(searchStr);
  let replaced = false;
  const newXml = xml.replace(regex, (match) => {
    replaced = true;
    // To preserve XML, we should technically keep the tags and just replace the text.
    // However, since we are replacing the entire match with `{{tag}}`, we might swallow tags.
    // A safer way: find all XML tags inside the match, and just append them at the end, 
    // or just prepend the replacement and keep all tags.
    const tags = match.match(/<[^>]*>/g) || [];
    // We wrap the replacement in a <w:t> just in case we swallowed one
    return replacement + tags.join('');
  });
  if (replaced) {
    console.log(`✅ Replaced: "${searchStr}" -> "${replacement}"`);
  } else {
    console.log(`❌ Not found: "${searchStr}"`);
  }
  return newXml;
}

function removeTableRowByContent(xml, contentStr) {
  const regex = makeRegex(contentStr);
  const match = regex.exec(xml);
  if (!match) {
    console.log(`❌ Row content not found for deletion: "${contentStr}"`);
    return xml;
  }
  
  // Find the start of the <w:tr> before this match
  const startTr = xml.lastIndexOf('<w:tr ', match.index);
  const startTr2 = xml.lastIndexOf('<w:tr>', match.index);
  const actualStart = Math.max(startTr, startTr2);
  
  // Find the end of the </w:tr> after this match
  const endTr = xml.indexOf('</w:tr>', match.index);
  
  if (actualStart !== -1 && endTr !== -1) {
    const before = xml.substring(0, actualStart);
    const after = xml.substring(endTr + 7);
    console.log(`✅ Deleted table row containing: "${contentStr}"`);
    return before + after;
  }
  return xml;
}

async function convert() {
  console.log('Reading template...');
  const buf = fs.readFileSync(templatePath);
  const zip = new PizZip(buf);
  let xml = zip.file('word/document.xml').asText();

  // 1. Simple text replacements
  xml = replaceTextSafe(xml, 'J/TRC/EH5000WM016', '{{jobNo}}');
  xml = replaceTextSafe(xml, '1179102-010-004', '{{serialNumber}}');
  xml = replaceTextSafe(xml, 'Needs to be inspected & overhauled', '{{siteComplaints}}');
  xml = replaceTextSafe(xml, 'Overhauling', '{{scopeOfWork}}');
  
  // 2. Test values
  xml = replaceTextSafe(xml, '313 MΩ', '{{ir_r}} MΩ');
  xml = replaceTextSafe(xml, '411 MΩ', '{{ir_y}} MΩ');
  xml = replaceTextSafe(xml, '445 MΩ', '{{ir_b}} MΩ');

  // 3. Changed Parts Table
  // We'll replace the bearing name and code.
  xml = replaceTextSafe(xml, 'NU232ECMC4HVA3091', '{{itemName}}');
  xml = replaceTextSafe(xml, '220025518', '{{itemCode}}');
  
  // To make it a loop, we need {#materials} in the first column and {/materials} in the last column.
  xml = xml.replace('{{itemName}}', '{#materials}{{itemName}}');
  xml = xml.replace('{{itemCode}}', '{{itemCode}}{/materials}');
  console.log('✅ Injected {#materials} loop tags.');

  // Delete the second row
  xml = removeTableRowByContent(xml, '6236M/C5HS0VG2211');

  // 4. AI Content
  xml = replaceTextSafe(xml, 'The wheel motor was received in externally contaminated condition with heavy dust, and corrosion traces observed on the motor frame and flange areas. Significant rusting was observed around the drive-end flange, coupling mounting surface, and end shield outer surfaces. Brake assem', '{{inspectionFindings}}');
  
  // 5. Photos
  // For images, docxtemplater requires {%photoName}. MS Word images are complex. 
  // We should just place text placeholders where photos should go.
  // We will assume the user has removed the actual pictures or we'll just insert tags.

  zip.file('word/document.xml', xml);
  const outBuf = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(outputPath, outBuf);
  console.log('✅ Successfully converted master-report-template.docx!');
}

convert().catch(console.error);
