const asyncHandler = require('express-async-handler');
const path = require('path');
const reportGenerationService = require('../services/reportGenerationService');
const Job = require('../models/Job');
const Inspection = require('../models/Inspection');
const Dismantling = require('../models/Dismantling');
const Assembly = require('../models/Assembly');
const Testing = require('../models/Testing');
const Photo = require('../models/Photo');

/**
 * Report Controller
 * Handles report generation API endpoints
 */

/**
 * Generate final report from approved Draft
 * POST /api/reports/export-docx/:reportId
 */
exports.generateReport = asyncHandler(async (req, res) => {
  try {
    const { reportId } = req.params;
    
    // Fetch the report document
    const Report = require('../models/Report');
    const reportDoc = await Report.findById(reportId);
    
    if (!reportDoc) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const jobId = reportDoc.job;

    // Fetch job and related stage documents from database
    const [job, inspection, dismantling, assembly, testing] = await Promise.all([
      Job.findById(jobId).lean(),
      Inspection.findOne({ job: jobId }).lean(),
      Dismantling.findOne({ job: jobId }).lean(),
      Assembly.findOne({ job: jobId }).lean(),
      Testing.findOne({ job: jobId }).lean(),
    ]);

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const photoStageMap = {};
    if (reportDoc.categorizedPhotos && Array.isArray(reportDoc.categorizedPhotos)) {
      // Sort by order
      const sortedPhotos = [...reportDoc.categorizedPhotos].sort((a, b) => (a.order || 0) - (b.order || 0));
      sortedPhotos.forEach(p => {
        // Map category to template placeholder
        let placeholder = null;
        const cat = p.category.toLowerCase();
        if (cat.includes('receive')) placeholder = 'receivedCondition';
        else if (cat.includes('inspect')) placeholder = 'inspection';
        else if (cat.includes('dismantl')) placeholder = 'dismantling';
        else if (cat.includes('assembl')) placeholder = 'assembly';
        else if (cat.includes('test')) placeholder = 'testing';
        else if (cat.includes('rotor')) placeholder = 'damagedParts';
        else if (cat.includes('bearing')) placeholder = 'damagedParts'; // fallback

        // We only map the first photo per placeholder if the template only supports one
        // Note: For a robust system, docxtemplater image replacer should handle arrays, but we will use the first match for now
        if (placeholder && !photoStageMap[placeholder]) {
          const filename = p.url.split('/').pop();
          photoStageMap[placeholder] = path.join(__dirname, '../uploads', filename);
        }
      });
    }

    const jobData = {
      jobNo: job.jobNo,
      job: {
        jobNo: job.jobNo,
        jobDate: job.createdAt,
        customerName: job.receivedFrom || '',
        customerContact: job.customerContact || '',
        siteLocation: job.recSite || '',
        scopeOfWork: job.scopeOfWork || '',
        customerComplaints: job.siteComplaints || '',
        workPerformed: job.workPerformed || '',
        recommendations: job.recommendations || '',
        technicianName: job.technicianName || '',
        supervisorName: job.supervisorName || '',
      },
      equipment: {
        model: job.equipmentModel || '',
        serialNumber: job.serialNumber || '',
        type: job.componentType || '',
        manufacturer: job.equipmentMake || '',
        yearOfManufacture: job.yearOfManufacture || '',
        runningHours: job.previousRunningHours || '',
      },
      inspection: {
        date: inspection?.inspectionDate || new Date().toISOString(),
        observations: inspection?.observations || '',
        physicalCondition: inspection?.physicalCondition || '',
        electricalCondition: inspection?.electricalCondition || '',
        mechanicalCondition: inspection?.mechanicalCondition || '',
      },
      dismantling: {
        date: dismantling?.startDate || '',
        partsRemoved: dismantling?.partConditions?.map(p => p.partName) || [],
        damagedParts: dismantling?.findings?.join('; ') || '',
        conditionFound: dismantling?.partConditions?.map(p => `${p.partName}: ${p.condition}`).join('; ') || '',
      },
      assembly: {
        date: assembly?.completionDate || '',
        newPartsInstalled: assembly?.materialsUsed?.map(m => m.itemName) || [],
        repairedParts: assembly?.workLogs?.filter(l => l.workDone.toLowerCase().includes('repair')).map(l => l.workDone).join('; ') || '',
        changedParts: '', // Add if needed
      },
      testing: {
        date: testing?.updatedAt || '',
        irReadings: testing?.finalIrTests?.reduce((acc, t) => ({ ...acc, [t.terminal]: t.irValue }), {}) || {},
        results: testing?.result || '',
        status: testing?.result || '',
      },
      photos: {
        receivedCondition: photoStageMap.receivedCondition || null,
        inspection: photoStageMap.inspection || null,
        dismantling: photoStageMap.dismantling || null,
        damagedParts: photoStageMap.damagedParts || null,
        assembly: photoStageMap.assembly || null,
        testing: photoStageMap.testing || null,
        finalCondition: photoStageMap.finalCondition || null,
      },
      summaries: {
        executiveSummary: reportDoc.executiveSummary,
        inspectionFindings: reportDoc.visualInspectionSummary,
        dismantlingSummary: reportDoc.partsConditionAnalysis,
        assemblySummary: reportDoc.assemblyDescription,
        testingSummary: reportDoc.testingSummary,
        conclusions: reportDoc.finalConclusion,
      }
    };

    const reportResult = await reportGenerationService.generateReport(jobData);

    res.status(200).json({
      success: true,
      message: 'Report generated successfully',
      data: reportResult,
    });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message,
    });
  }
});

/**
 * Download generated report
 * GET /api/reports/download/:jobNo
 */
exports.downloadReport = asyncHandler(async (req, res) => {
  try {
    const { jobNo } = req.params;
    const { format = 'docx' } = req.query;

    // Validate format
    if (!['pdf', 'docx'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Supported: pdf, docx',
      });
    }

    // Get report file
    const fileBuffer = await reportGenerationService.getReportFile(jobNo, format);

    // Set response headers
    const contentType = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const safeJobNo = String(jobNo).replace(/[^a-zA-Z0-9-]/g, '_');
    const filename = `Report_${safeJobNo}.${format}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', fileBuffer.length);

    res.send(fileBuffer);
  } catch (error) {
    console.error('Report download error:', error);
    res.status(404).json({
      success: false,
      message: 'Report not found',
      error: error.message,
    });
  }
});

/**
 * Get list of generated reports
 * GET /api/reports/list
 */
exports.listReports = asyncHandler(async (req, res) => {
  try {
    const reports = reportGenerationService.listGeneratedReports();

    res.status(200).json({
      success: true,
      message: 'Reports retrieved successfully',
      data: {
        count: reports.length,
        reports: reports,
      },
    });
  } catch (error) {
    console.error('Error listing reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list reports',
      error: error.message,
    });
  }
});

/**
 * Get report status
 * GET /api/reports/status/:jobNo
 */
exports.getReportStatus = asyncHandler(async (req, res) => {
  try {
    const { jobNo } = req.params;

    const job = await Job.findOne({ jobNo }).lean();

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        jobNo: job.jobNo,
        status: job.status,
        reportGenerated: job.reportGenerated || false,
        generatedAt: job.reportGeneratedAt || null,
      },
    });
  } catch (error) {
    console.error('Error getting report status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get report status',
      error: error.message,
    });
  }
});
