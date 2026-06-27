const asyncHandler = require('express-async-handler');
const path = require('path');
const reportGenerationService = require('../services/reportGenerationService');
const Job = require('../models/Job');
const JobData = require('../models/JobData');
const Photo = require('../models/Photo');
const ApiResponse = require('../utils/apiResponse');

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
      return res.status(404).json(ApiResponse.notFound('Report not found'));
    }

    if (!reportDoc.isEngineerReviewed) {
      return res.status(403).json(ApiResponse.error('Report must be reviewed by an engineer before export', 403));
    }
    if (!reportDoc.isQaApproved || !['Final Approved', 'Exported'].includes(reportDoc.status)) {
      return res.status(403).json(ApiResponse.error('Report must be QA verified and final approved before export', 403));
    }

    const jobId = reportDoc.job;

    // Fetch job and unified stage data from JobData
    // Legacy models (Inspection, Assembly, Dismantling, Testing) retired
    const [job, stageData] = await Promise.all([
      Job.findById(jobId).lean(),
      JobData.findOne({ job: jobId }).lean(),
    ]);

    if (!job) {
      return res.status(404).json(ApiResponse.notFound('Job not found'));
    }

    const categorizedPhotos = reportDoc.categorizedPhotos || [];
    const photoStageMap = {};
    const photoArrays = {
      receivedPhotos: [],
      inspectionPhotos: [],
      dismantlingPhotos: [],
      damagedPartsPhotos: [],
      assemblyPhotos: [],
      testingPhotos: [],
      finalPhotos: []
    };

    if (Array.isArray(categorizedPhotos)) {
      const sortedPhotos = [...categorizedPhotos].sort((a, b) => (a.order || 0) - (b.order || 0));
      sortedPhotos.forEach((p) => {
        const urlValue = typeof p.url === 'string' ? p.url : (p.filename || '');
        const filename = String(urlValue).split('/').pop();
        let localPath = urlValue;
        if (!localPath.startsWith('/uploads') && !localPath.startsWith('data:image') && !localPath.startsWith('http')) {
          localPath = path.join(__dirname, '../uploads', filename);
        }

        const cat = (p.category || '').toLowerCase();
        let placeholder = null;
        let arrayKey = null;

        if (cat.includes('receive') || cat.includes('inspection')) {
          placeholder = 'receivedCondition';
          arrayKey = 'receivedPhotos';
        } else if (cat.includes('dismantl')) {
          placeholder = 'dismantling';
          arrayKey = 'dismantlingPhotos';
        } else if (cat.includes('assembl')) {
          placeholder = 'assembly';
          arrayKey = 'assemblyPhotos';
        } else if (cat.includes('test')) {
          placeholder = 'testing';
          arrayKey = 'testingPhotos';
        } else if (cat.includes('rotor') || cat.includes('bearing') || cat.includes('damage')) {
          placeholder = 'damagedParts';
          arrayKey = 'damagedPartsPhotos';
        } else if (cat.includes('final') || cat.includes('dispatch')) {
          placeholder = 'finalCondition';
          arrayKey = 'finalPhotos';
        }

        if (placeholder && !photoStageMap[placeholder]) {
          photoStageMap[placeholder] = typeof localPath === 'string' ? localPath : '';
        }

        if (arrayKey && urlValue) {
          photoArrays[arrayKey].push({
            image: localPath,
            caption: p.caption || `${p.category || 'Photo'} ${photoArrays[arrayKey].length + 1}`
          });
        }
      });
    }

    const jobData = {
      ...photoArrays,
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
        date: stageData?.stage1?.completionDate || stageData?.stage1?.startDate || new Date().toISOString(),
        observations: stageData?.stage1?.overallRemarks || '',
        physicalCondition: stageData?.stage1?.inspectionDecision || '',
        electricalCondition: JSON.stringify(stageData?.stage1?.electricalTests || {}),
        mechanicalCondition: stageData?.stage1?.inspectionDecisionReason || '',
      },
      dismantling: {
        date: stageData?.stage2?.startDate || '',
        partsRemoved: Object.keys(stageData?.stage2?.dismantlingChecklist || {}),
        damagedParts: Object.entries(stageData?.stage2?.componentConditionAssessment || {})
          .filter(([, v]) => v?.decision === 'Replace')
          .map(([k]) => k)
          .join('; ') || '',
        conditionFound: Object.entries(stageData?.stage2?.componentConditionAssessment || {})
          .map(([k, v]) => `${k}: ${v?.decision || 'Assessed'}`)
          .join('; ') || '',
      },
      assembly: {
        date: stageData?.stage3?.completionDate || stageData?.stage3?.assemblyCompletionDate || '',
        newPartsInstalled: (stageData?.stage3?.materialsUsed || []).map(m => m.name).filter(Boolean),
        repairedParts: Object.keys(stageData?.stage3?.assemblyChecklist || {}).join('; ') || '',
        changedParts: (stageData?.stage3?.materialsUsed || []).map(m => `${m.name} x${m.quantity}`).join(', ') || '',
      },
      testing: {
        date: stageData?.stage4?.completionDate || stageData?.stage4?.startDate || '',
        irReadings: stageData?.stage4?.electricalTests || {},
        results: stageData?.stage4?.overallRemarks || '',
        status: stageData?.stage4?.status || '',
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
        electricalInspectionSummary: reportDoc.electricalInspectionSummary,
        partsConditionAnalysis: reportDoc.partsConditionAnalysis,
        failureAnalysis: reportDoc.failureAnalysis || {},
        workPerformed: reportDoc.workPerformed,
        assemblyDescription: reportDoc.assemblyDescription,
        testingSummary: reportDoc.testingSummary,
        finalConclusion: reportDoc.finalConclusion,
        recommendations: reportDoc.recommendations,
        conclusions: reportDoc.finalConclusion,
      }
    };

    const reportResult = await reportGenerationService.generateReport(jobData);

    if (reportDoc.status !== 'Exported') {
      reportDoc.status = 'Exported';
      reportDoc.reviewHistory = reportDoc.reviewHistory || [];
      reportDoc.reviewHistory.push({
        action: 'Exported',
        user: req.user._id,
        role: req.user.role || 'Approver',
        comment: 'Report exported as final DOCX',
        date: new Date()
      });
      await reportDoc.save();
    }

    res.status(200).json(ApiResponse.success('Report generated successfully', reportResult));
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json(ApiResponse.error(`Failed to generate report: ${error.message}`, 500));
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
      return res.status(400).json(ApiResponse.badRequest('Invalid format. Supported: pdf, docx'));
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
    res.status(404).json(ApiResponse.error(`Report not found: ${error.message}`, 404));
  }
});

/**
 * Get list of generated reports
 * GET /api/reports/list
 */
exports.listReports = asyncHandler(async (req, res) => {
  try {
    const reports = reportGenerationService.listGeneratedReports();

    res.status(200).json(ApiResponse.success('Reports retrieved successfully', {
      count: reports.length,
      reports: reports,
    }));
  } catch (error) {
    console.error('Error listing reports:', error);
    res.status(500).json(ApiResponse.error(`Failed to list reports: ${error.message}`, 500));
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
      return res.status(404).json(ApiResponse.notFound('Job not found'));
    }

    res.status(200).json(ApiResponse.success('Report status retrieved successfully', {
      jobNo: job.jobNo,
      status: job.status,
      reportGenerated: job.reportGenerated || false,
      generatedAt: job.reportGeneratedAt || null,
    }));
  } catch (error) {
    console.error('Error getting report status:', error);
    res.status(500).json(ApiResponse.error(`Failed to get report status: ${error.message}`, 500));
  }
});
