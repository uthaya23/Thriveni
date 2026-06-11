import zipfile, re
from pathlib import Path
p = Path('templates/master-report-template.docx')
with zipfile.ZipFile(p, 'r') as z:
    xml = z.read('word/document.xml').decode('utf-8')
placeholders = sorted(set(re.findall(r'{{(.*?)}}', xml)))
print('PLACEHOLDERS', placeholders)
