const fs = require('fs');
const path = require('path');
const PdfService = require('./services/pdfService');

const templatePath = path.join(__dirname, 'templates', 'reportTemplate.html');
const outputPath = path.join(__dirname, 'test.pdf');

const data = {
    job: {
        jobNo: 'TRC-JOB-TEST-001',
        description: 'CAT 793F WHEEL MOTOR',
        equipmentModel: '793F',
        partNumber: '123-4567',
        serialNumber: 'S/N 987654',
        subAssemblyMake: 'Caterpillar',
        orderNumber: 'PO-998877',
        receivedFrom: 'Mine Site A',
        dateReceived: '2026-06-25T10:00:00Z',
        siteComplaints: 'Overheating under load.',
        installedHour: 15000,
        installedDate: '2024-01-01',
        removalHour: 19500,
        removalDate: '2026-06-01',
        lifeHour: 4500,
        finalDriveNo: 'FD-1122',
        finalDriveModel: 'Model X',
        assyDate: '2026-06-28T10:00:00Z',
        sendDate: '2026-07-01T10:00:00Z'
    },
    report: {
        reportNo: 'RPT-TEST-001',
        createdAt: '2026-06-30T10:00:00Z',
        executiveSummary: 'The wheel motor was received with overheating issues. Fully overhauled and certified.',
        visualInspectionSummary: 'Heavy contamination on the exterior. Wiring harness damaged.',
        partsConditionAnalysis: 'Bearings worn beyond tolerance. Stator windings show thermal degradation.',
        failureAnalysis: {
            rootCause: 'Bearing failure led to rotor rub and overheating.',
            evidence: 'Deep scoring on rotor and inner stator bore.',
            impact: 'Complete loss of motive power.'
        },
        assemblyDescription: 'New bearings installed. Stator rewound and VPI processed.',
        testingSummary: 'Passed all final run-test parameters.',
        workPerformed: 'Complete tear down, clean, inspect. Rewind stator. Balance rotor. Reassemble and test.',
        finalConclusion: 'Motor is fit for return to service.',
        recommendations: 'Monitor bearing temperatures during first 100 hours of operation.',
        headerLogo: 'https://via.placeholder.com/500x350?text=Cover+Photo',
        categorizedPhotos: [
            { url: 'https://via.placeholder.com/300?text=Inspection', category: 'Inspection', description: 'Initial state' },
            { url: 'https://via.placeholder.com/300?text=Dismantling', category: 'Dismantling', description: 'Rotor removed' }
        ]
    },
    inspection: {
        initialIrTests: [
            { groupHeader: 'STATOR', terminal: 'U-V', irValue: '0.5', unit: 'MΩ', remarks: 'Fail' }
        ],
        initialWrTests: [
            { groupHeader: 'STATOR', terminalDisplay: 'U-V', standardValue: '0.12', value: '0.15', remarks: 'High resistance' }
        ]
    },
    testing: {
        finalIrTests: [
            { terminal: 'U-V', irValue: '1000', unit: 'MΩ', remarks: 'Pass' }
        ],
        finalWrTests: [
            { groupHeader: 'STATOR', terminalDisplay: 'U-V', standardValue: '0.12', value: '0.121', remarks: 'Within spec' }
        ]
    },
    isWheelMotor: true,
    dismantlingChecklist: ['Visual Inspection', 'Measure clearanaces'],
    assemblyChecklist: ['Install bearings', 'Measure air gap'],
    inspectionPhoto: 'https://via.placeholder.com/400x200?text=Before',
    testingPhoto: 'https://via.placeholder.com/400x200?text=After'
};

(async () => {
    try {
        console.log('Generating PDF...');
        const pdfBuffer = await PdfService.generateFromTemplate(templatePath, data);
        fs.writeFileSync(outputPath, pdfBuffer);
        console.log('Successfully generated ' + outputPath);
    } catch (err) {
        console.error('Error generating PDF:', err);
    }
})();
