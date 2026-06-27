import re

with open('c:\\projects\\thriveni\\backend\\templates\\reportTemplate.html', 'r', encoding='utf8') as f:
    content = f.read()

blocks = content.split("<!-- ───────────────────────────────────────────────────────────────── -->")

for i, b in enumerate(blocks):
    first_line = b.strip().split('\n')[0]
    print(f"Block {i}: {first_line.encode('ascii', 'ignore').decode('ascii')}")

