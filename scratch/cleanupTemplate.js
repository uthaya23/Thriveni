const fs = require('fs');
let html = fs.readFileSync('backend/templates/reportTemplate.html', 'utf8');

// Helper to remove block between two strings (inclusive)
function removeBlock(startStr, endStr) {
  const startIdx = html.indexOf(startStr);
  if (startIdx === -1) return;
  const endIdx = html.indexOf(endStr, startIdx);
  if (endIdx === -1) return;
  html = html.substring(0, startIdx) + html.substring(endIdx + endStr.length);
}

// 1. Remove 3.1 and 3.2
removeBlock('<div class="sub-section-header">3.1 Incoming Mechanical Inspection</div>', '{{/if}}');

// 2. Remove 4.2 Component Condition Summary
removeBlock('<div class="sub-section-header">4.2 Component Condition Summary</div>', '{{/if}}');

// 3. Remove 5.1 list
removeBlock('<div class="sub-section-header">5.1 Overhaul Work Executed</div>', '{{/if}}');

// 4. Remove 6.2 Rebuild Labor Registry
removeBlock('<div class="sub-section-header">6.2 Rebuild Labor Registry</div>', '{{/if}}');

// 5. Remove 7.2 Materials Replaced
removeBlock('<div class="sub-section-header">7.2 Materials Replaced (New OEM Components)</div>', '{{/if}}');

// 6. Remove 7.4 Surge Test
removeBlock('{{#if testing.surgeTestsList}}', '{{/if}}');

// 7. Remove 7.5 Functional Run
removeBlock('{{#if testing.functionalTestsList}}', '{{/if}}');

// 8. Remove 7.6 Sensor
removeBlock('{{#if testing.sensorTestsList}}', '{{/if}}');

// 9. Remove Cost Table
removeBlock('{{#if cost.hasCostData}}', '{{/if}}');

// 10. Remove Delivery Process Compliance
removeBlock('<div class="sub-section-header" style="margin-top: 12px;">Workshop Delivery Process Compliance', '</table>');

// Replace the workPerformed editable since we removed 5.1 which had it
html = html.replace('{{#if report.workPerformedList}}', `<div style="text-align: justify; font-size: 7.5pt; line-height: 1.45;">
    {{{editable 'report.workPerformed' report.workPerformed 'Overhaul execution and assembly work details are not recorded.'}}}
</div>
{{#if false}}`);

fs.writeFileSync('backend/templates/reportTemplate.html', html);
console.log('Template cleaned up successfully!');
