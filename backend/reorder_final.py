import re

with open('c:\\projects\\thriveni\\backend\\templates\\reportTemplate.html.bak', 'r', encoding='utf8') as f:
    content = f.read()

blocks = content.split("<!-- ───────────────────────────────────────────────────────────────── -->")

# Split Block 12 at 5.0 Dismantling
split_idx = blocks[12].find('<div class="sub-section-header">5.0 Dismantling')
if split_idx != -1:
    block_12_part1 = blocks[12][:split_idx]
    block_12_part2 = blocks[12][split_idx:]
else:
    block_12_part1 = blocks[12]
    block_12_part2 = ""

# Extract table close tags from Block 24
table_close_tags = "                </td>\n            </tr>\n        </tbody>\n    </table>\n"
blocks[24] = blocks[24].replace(table_close_tags, "")

# 1.0
blocks[6] = blocks[6].replace("1.0 EXECUTIVE SUMMARY & TECHNICAL REGISTRY", "1.0 JOB OVERVIEW & EXECUTIVE SUMMARY")

# STAGE 1
stage1_header = '\n                    <div class="section-header">\n                        2.0 STAGE 1: INCOMING INSPECTION\n                    </div>\n'
b10 = re.sub(r'<div class="section-header">\s*3\.0 PHYSICAL & VISUAL INSPECTION FINDINGS\s*</div>', '', blocks[10])
b12p1 = re.sub(r'<div class="section-header">\s*4\.0 INITIAL ELECTRICAL TESTS & DISMANTLING ANALYSIS\s*</div>', '', block_12_part1)
block_stage1 = stage1_header + b10 + b12p1

# STAGE 2
stage2_header = '\n                    {{#if dismantling}}\n                    <div class="section-header">\n                        3.0 STAGE 2: DISMANTLING & ANALYSIS\n                    </div>\n'
b14 = re.sub(r'<div class="section-header">\s*6\.0 ENGINEERING ASSESSMENT & FAILURE ANALYSIS\s*</div>', '', blocks[14])
b12p2 = block_12_part2.replace('5.0 Dismantling & Parts Integrity Assessment', 'Dismantling & Parts Integrity Assessment')
b14 = b14.replace('6.1 Overhaul Work Executed Summary', 'Overhaul Work Executed Summary')
block_stage2 = stage2_header + b12p2 + b14 + "\n                    {{/if}}\n"

# STAGE 3
stage3_header = '\n                    {{#if assembly}}\n                    <div class="section-header">\n                        4.0 STAGE 3: REBUILD & ASSEMBLY\n                    </div>\n'
block_stage3 = re.sub(r'<div class="section-header">\s*7\.0 REBUILD & MECHANICAL ASSEMBLY PROCESS\s*</div>', stage3_header, blocks[16]) + "\n                    {{/if}}\n"

# STAGE 4
stage4_header = '\n                    {{#if testing}}\n                    <div class="section-header">\n                        5.0 STAGE 4: QUALITY CONTROL & TESTING\n                    </div>\n'
block_stage4 = re.sub(r'<div class="section-header">\s*8\.0 QUALITY CONTROL & TESTING VERIFICATION\s*</div>', stage4_header, blocks[18]) + "\n                    {{/if}}\n"

# STAGE 5
stage5_header = '\n                    {{#if dispatch}}\n                    <div class="section-header">\n                        6.0 STAGE 5: DISPATCH & FINAL REVIEW\n                    </div>\n'
b20 = re.sub(r'<div class="section-header">\s*9\.0 BEFORE VS\. AFTER OVERHAUL COMPARISON DASHBOARD\s*</div>', '', blocks[20])
b8 = re.sub(r'<div class="section-header">\s*2\.0 COMPONENT REBUILD SUMMARY & WORKSHOP KPI DASHBOARD\s*</div>', '', blocks[8])
b24 = re.sub(r'<div class="section-header">\s*11\.0 TECHNICAL CONCLUSION & PREVENTIVE RECOMMENDATIONS\s*</div>', '', blocks[24])

b8 = b8.replace('2.1 Lifecycle Stage Completion Dates', 'Lifecycle Stage Completion Dates')
b8 = b8.replace('2.2 Workshop Efficiency & Labor KPIs', 'Workshop Efficiency & Labor KPIs')
b8 = b8.replace('2.3 Repair Value & Business Impact', 'Repair Value & Business Impact')
b8 = b8.replace('2.4 Workshop Delivery Process Compliance', 'Workshop Delivery Process Compliance')
b8 = b8.replace('2.5 Component Status Summary', 'Component Status Summary')

block_stage5 = stage5_header + b20 + b8 + b24 + "\n                    {{/if}}\n"

new_blocks = [
    blocks[0],
    blocks[1], blocks[2],
    blocks[3], blocks[4],
    "\n                    <!-- PAGE 2: JOB OVERVIEW & EXECUTIVE SUMMARY -->\n                    ",
    blocks[6],
    "\n                    <!-- STAGE 1: INCOMING INSPECTION -->\n                    ",
    block_stage1,
    "\n                    <!-- STAGE 2: DISMANTLING & ANALYSIS -->\n                    ",
    block_stage2,
    "\n                    <!-- STAGE 3: REBUILD & ASSEMBLY -->\n                    ",
    block_stage3,
    "\n                    <!-- STAGE 4: QUALITY CONTROL & TESTING -->\n                    ",
    block_stage4,
    "\n                    <!-- STAGE 5: DISPATCH & FINAL REVIEW -->\n                    ",
    block_stage5,
    blocks[21], blocks[22] + table_close_tags, # Photos + Table close
    blocks[25], blocks[26]  # Certificate
]

new_content = "<!-- ───────────────────────────────────────────────────────────────── -->".join(new_blocks)

with open('c:\\projects\\thriveni\\backend\\templates\\reportTemplate.html', 'w', encoding='utf8') as f:
    f.write(new_content)
print("Done!")
