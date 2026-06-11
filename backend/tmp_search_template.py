import zipfile, re
from pathlib import Path
p = Path('templates/master-report-template.docx')
with zipfile.ZipFile(p, 'r') as z:
    files = [n for n in z.namelist() if n.endswith('.xml')]
    found = {}
    for n in files:
        txt = z.read(n).decode('utf-8', errors='ignore')
        if '{{' in txt or '}}' in txt or 'jobNo' in txt or 'inspectionFindings' in txt:
            hits = re.findall(r'{{.*?}}', txt)
            if hits or 'jobNo' in txt or 'inspectionFindings' in txt:
                found[n] = hits[:10] if hits else ['<none>']
    print('FOUND', len(found))
    for k,v in found.items():
        print(k, v)
