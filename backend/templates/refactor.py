import re
import os

filepath = r'c:\projects\thriveni\backend\templates\reportTemplate.html'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update CSS
content = re.sub(
    r'\.report-header\s*\{[^}]*\}',
    '''.report-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid var(--primary-navy);
            padding-bottom: 3px;
        }''',
    content
)

content = re.sub(
    r'\.report-footer\s*\{[^}]*\}',
    '''.report-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-top: 1px solid var(--border-color);
            padding-top: 5px;
            font-size: 6.5pt;
            color: var(--text-muted);
        }''',
    content
)

# 2. Extract the middle section (Pages 2-12)
start_marker = r'<!-- ───────────────────────────────────────────────────────────────── -->\s*<!-- PAGE 2: EXECUTIVE SUMMARY & TECHNICAL REGISTRY -->'
end_marker = r'<!-- ───────────────────────────────────────────────────────────────── -->\s*<!-- CERTIFICATE OF CONFORMANCE -->'

match = re.search(f'({start_marker}.*?)({end_marker})', content, re.DOTALL)
if not match:
    print("Markers not found!")
    exit(1)

middle = match.group(1)

# Remove <!-- HEADER --> block
middle = re.sub(r'<!-- HEADER -->.*?<!-- CONTENT -->', '', middle, flags=re.DOTALL)

# Remove <!-- FOOTER --> block
middle = re.sub(r'<!-- FOOTER -->.*?<div class="report-footer">.*?</div>', '', middle, flags=re.DOTALL)

# Remove <span>Page ...</span>
middle = re.sub(r'<span>Page .*?</span>', '', middle)

# Remove <div class="page-container">
middle = re.sub(r'<div class="page-container">', '', middle)

# Remove the remaining </div> that belonged to page-container
middle = re.sub(r'</div>\s*(?=<!-- ──)', '', middle)
middle = re.sub(r'</div>\s*(?={{#each photoPages}})', '', middle)
middle = re.sub(r'</div>\s*(?={{/each}})', '', middle)
middle = re.sub(r'</div>\s*$', '', middle)

magic_header = """    <!-- ───────────────────────────────────────────────────────────────── -->
    <!-- CONTINUOUS FLOW CONTENT (PAGES 2-11) -->
    <!-- ───────────────────────────────────────────────────────────────── -->
    <table style="width: 100%; border: none; border-collapse: collapse; margin: 0; padding: 0;">
        <thead style="display: table-header-group;">
            <tr>
                <td style="border: none; padding: 0 0 10mm 0; background: transparent;">
                    <div class="report-header">
                        {{#if headerLogo}}
                        <img src="{{headerLogo}}" class="header-logo">
                        {{else}}
                        <div style="font-weight: 800; font-size: 11pt; color: var(--primary-navy);">THRIVENI RC</div>
                        {{/if}}
                        <div class="header-meta">
                            <span>JOB NO: <strong>{{job.jobNo}}</strong></span>
                            <span>REPORT: <strong>{{report.reportNo}}</strong></span>
                            <span>REV: <strong>{{revisionNo}}</strong></span>
                        </div>
                    </div>
                </td>
            </tr>
        </thead>
        <tfoot style="display: table-footer-group;">
            <tr>
                <td style="border: none; padding: 10mm 0 0 0; background: transparent;">
                    <div class="report-footer">
                        <span>CONFIDENTIAL • THRIVENI EARTHMOVERS & INFRA PRIVATE LIMITED</span>
                        <span style="font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--primary-navy);">JOB: {{job.jobNo}} &nbsp;|&nbsp; REPORT: {{report.reportNo}}</span>
                    </div>
                </td>
            </tr>
        </tfoot>
        <tbody style="display: table-row-group;">
            <tr>
                <td style="border: none; padding: 0; background: transparent;">
"""

magic_footer = """                </td>
            </tr>
        </tbody>
    </table>

"""

final_content = content[:match.start(1)] + magic_header + middle + magic_footer + content[match.start(2):]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(final_content)

print("Successfully refactored template!")
