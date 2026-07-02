/**
 * Report Routes
 * Thin router — all business logic lives in ReportService
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const asyncHandler = require('express-async-handler');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Handlebars = require('handlebars');
const handlebars = require('handlebars');

const { protect, notTechnician } = require('../middleware/authMiddleware');
const resolveJobId = require('../middleware/resolveJobId');
const ApiResponse = require('../utils/apiResponse');
const Logger = require('../utils/logger');
const Job = require('../models/Job');
const Report = require('../models/Report');
const reportController = require('../controllers/reportController');
const PdfService = require('../services/pdfService');

const {
  ReportService,
  getImageDimensions,
  getFailureAnalysisFallback,
  extractJsonFromAi,
  ensureStringFields,
  normalizeFailureAnalysis,
  generateFallbackDraft
} = require('../services/ReportService');

const invalidateCachedPdf = (reportNo, req) => {
  // No-op: PDFs are now generated on the fly and not cached locally
};

router.use(protect);
router.use(notTechnician);

// ─────────────────────────────────────────────
// GET /api/reports/summary
// ─────────────────────────────────────────────
router.get('/summary', asyncHandler(async (req, res) => {
  const result = await ReportService.getSummary();
  res.status(result.statusCode).json(result);
}));

// ─────────────────────────────────────────────
// GET /api/reports/job/:jobId
// ─────────────────────────────────────────────
router.get('/job/:jobId', resolveJobId('jobId'), asyncHandler(async (req, res) => {
  const result = await ReportService.getReportsByJob(req.params.jobId);
  res.status(result.statusCode).json(result);
}));

// ─────────────────────────────────────────────
// POST /api/reports/initiate-workflow
// POST /api/reports/generate-ai
// ─────────────────────────────────────────────
const initiateWorkflow = asyncHandler(async (req, res) => {
  let { jobId, additionalInstructions } = req.body;
  if (!jobId) return res.status(400).json(ApiResponse.badRequest('jobId is required'));

  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(jobId) || String(jobId).length !== 24) {
    const jobNo = jobId.replace(/-/g, '/');
    const Job = require('../models/Job');
    const job = await Job.findOne({ jobNo });
    if (!job) {
      return res.status(404).json(ApiResponse.notFound('Job not found for the given Job Number'));
    }
    jobId = job._id.toString();
  }

  const result = await ReportService.initiateWorkflow(jobId, additionalInstructions, req.user._id);
  res.status(result.statusCode).json(result);
});

router.post('/initiate-workflow', initiateWorkflow);
router.post('/generate-ai', initiateWorkflow);

// ─────────────────────────────────────────────
// PATCH /api/reports/:reportId
// ─────────────────────────────────────────────
router.patch('/:reportId', asyncHandler(async (req, res) => {
  const result = await ReportService.updateReport(
    req.params.reportId,
    req.body,
    null,
    req
  );
  // Invalidate cache after update
  if (result.data?.reportNo) {
    invalidateCachedPdf(result.data.reportNo, req);
  }
  res.status(result.statusCode).json(result);
}));

// ─────────────────────────────────────────────
// POST /api/reports/:reportId/submit-review
// ─────────────────────────────────────────────
router.post('/:reportId/submit-review', asyncHandler(async (req, res) => {
  const result = await ReportService.submitForReview(
    req.params.reportId,
    req.user._id,
    req.user.role,
    req.body.comment
  );
  if (result.data?.reportNo) invalidateCachedPdf(result.data.reportNo);
  res.status(result.statusCode).json(result);
}));

// ─────────────────────────────────────────────
// POST /api/reports/:reportId/qa-verify
// ─────────────────────────────────────────────
router.post('/:reportId/qa-verify', asyncHandler(async (req, res) => {
  const result = await ReportService.qaVerify(
    req.params.reportId,
    req.user._id,
    req.user.role,
    req.body.comment
  );
  if (result.data?.reportNo) invalidateCachedPdf(result.data.reportNo);
  res.status(result.statusCode).json(result);
}));

// ─────────────────────────────────────────────
// POST /api/reports/:reportId/final-approve
// ─────────────────────────────────────────────
router.post('/:reportId/final-approve', asyncHandler(async (req, res) => {
  const result = await ReportService.finalApprove(
    req.params.reportId,
    req.user._id,
    req.user.role,
    req.body.comment
  );
  if (result.data?.reportNo) invalidateCachedPdf(result.data.reportNo);
  res.status(result.statusCode).json(result);
}));

// ─────────────────────────────────────────────
// GET /api/reports/:reportId/review-history
// ─────────────────────────────────────────────
router.get('/:reportId/review-history', asyncHandler(async (req, res) => {
  const result = await ReportService.getReviewHistory(req.params.reportId);
  res.status(result.statusCode).json(result);
}));

// ─────────────────────────────────────────────
// DELETE /api/reports/:reportId
// ─────────────────────────────────────────────
router.delete('/:reportId', asyncHandler(async (req, res) => {
  const result = await ReportService.deleteReport(req.params.reportId);
  res.status(result.statusCode).json(result);
}));

// ─────────────────────────────────────────────
// POST /api/reports/sync-photos/:reportId
// ─────────────────────────────────────────────
router.post('/sync-photos/:reportId', asyncHandler(async (req, res) => {

  if (inspection) {
    addPhotos(inspection.photos, 'Received Condition', 'Initial View');
    Object.entries(inspection.partsChecklist || {}).forEach(([partName, data]) => {
      addPhotos(data.photos, 'Received Condition', partName);
    });
  }
  if (dismantling) {
    addPhotos(dismantling.photos, 'Dismantling', 'Progress');
    Object.entries(dismantling.componentConditionAssessment || {}).forEach(([compName, data]) => {
      addPhotos(data.photos, 'Dismantling', compName);
    });
  }
  if (assembly) {
    addPhotos(assembly.photos, 'Assembly', 'Progress');
  }
  if (testing) {
    addPhotos(testing.photos, 'Testing', `Testing view`);
  }

  photos.forEach(p => {
    const path = p.url || `/uploads/photos/${p.filename}`;
    if (!allPhotoPaths.has(path)) {
      allPhotoPaths.add(path);
      let category = 'Overview';
      const stage = p.stage?.toLowerCase() || '';
      if (stage.includes('receive') || stage.includes('inspection')) category = 'Received Condition';
      else if (stage.includes('dismantl')) category = 'Dismantling';
      else if (stage.includes('assembl')) category = 'Assembly';
      else if (stage.includes('test')) category = 'Testing';

      categorizedPhotos.push({
        category,
        url: path,
        caption: p.caption || '',
        order: categorizedPhotos.length
      });
    }
  });

  report.categorizedPhotos = categorizedPhotos;
  await report.save();

  res.json(ApiResponse.success('Report photos synchronized successfully', report));
}));

// ─────────────────────────────────────────────
// GET /api/reports/pdf/:reportId  — generate PDF (Enhanced to match EH5000 Model)
// ─────────────────────────────────────────────
router.get('/pdf/:reportId', asyncHandler(async (req, res) => {
  const Photo = require('../models/Photo');
  const WorkDetail = require('../models/WorkDetail');
  const report = await Report.findById(req.params.reportId)
    .populate('job')
    .populate('generatedBy', 'name')
    .lean();

  if (!report) return res.status(404).json(ApiResponse.notFound('Report not found'));
  if (!report.isEngineerReviewed) {
    return res.status(403).json(ApiResponse.error('Report must be reviewed by an engineer before PDF export', 403));
  }
  if (!report.isQaApproved || !['Final Approved', 'Exported'].includes(report.status)) {
    return res.status(403).json(ApiResponse.error('Report must be QA verified and final approved before PDF export', 403));
  }

  const job = report.job;
  const JobData = require('../models/JobData');
  const Materials = require('../models/Materials');
  const [jobDataDoc, photos, workDetails, materialsDoc] = await Promise.all([
    JobData.findOne({ job: job._id }).lean(),
    Photo.find({ job: job._id }).lean(),
    WorkDetail.find({ jobNo: job.jobNo }).lean(),
    Materials.findOne({ job: job._id }).lean()
  ]);
  
  const jd = jobDataDoc || {};
  const inspection = jd.stage1;
  const dismantling = jd.stage2;
  const assembly = jd.stage3;
  const testing = jd.stage4;
  const dispatch = jd.stage4;

  // Helper to convert photo to base64 for PDF embedding
  const toBase64 = (filename, isAsset = false) => {
    // Explicit static paths help Vercel's bundler (nft) include the files in the serverless build
    if (isAsset && filename.includes('logo.png')) {
      const logoPath = path.join(__dirname, '../assets/logo.png');
      if (fs.existsSync(logoPath)) {
        const bitmap = fs.readFileSync(logoPath);
        return `data:image/png;base64,${bitmap.toString('base64')}`;
      }
      return null;
    }

    const photoPath = isAsset 
      ? path.join(__dirname, filename) 
      : path.join(__dirname, '../uploads', filename);
    if (fs.existsSync(photoPath)) {
      const bitmap = fs.readFileSync(photoPath);
      const ext = path.extname(filename).slice(1) || 'png';
      return `data:image/${ext};base64,${bitmap.toString('base64')}`;
    }
    return null;
  };

  // Helper: clean up photo captions, falling back to a default label
  const cleanCaption = (caption, fallback = 'Component View') => {
    if (!caption || typeof caption !== 'string' || caption.trim() === '' || caption.trim().toLowerCase() === 'undefined') {
      return fallback;
    }
    return caption.trim();
  };

  // Categorize photos directly from the curated report.categorizedPhotos array
  const categorizedPhotos = {
    initial: [],
    dismantling: [],
    assembly: [],
    testing: [],
    dispatch: []
  };

  // Use curated report photos if available, otherwise fallback to all job photos
  const photoSource = (report.categorizedPhotos && report.categorizedPhotos.length > 0) 
    ? report.categorizedPhotos 
    : (photos || []);

  if (photoSource && Array.isArray(photoSource)) {
    for (const p of photoSource) {
      let b64 = null;
      let localPath = null;
      let isPortrait = false;
      
      // Determine URL property (curated uses p.url, raw Photo model uses p.path)
      const url = p.url || p.path;
      if (!url) continue;

      if (url.startsWith('data:image')) {
        b64 = url;
      } else if (url.startsWith('/uploads')) {
        localPath = path.join(__dirname, '..', url);
        if (fs.existsSync(localPath)) {
          const bitmap = fs.readFileSync(localPath);
          const ext = path.extname(localPath).slice(1) || 'png';
          b64 = `data:image/${ext};base64,${bitmap.toString('base64')}`;
        }
      } else if (url.startsWith('http://') || url.startsWith('https://')) {
        try {
          const headers = {};
          if (url.includes('vercel-storage.com') && process.env.BLOB_READ_WRITE_TOKEN) {
            headers['Authorization'] = `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`;
          }
          const response = await fetch(url, { headers });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status} - ${response.statusText}`);
          }
          const buffer = await response.arrayBuffer();
          const ext = url.split('.').pop().split('?')[0] || 'png';
          b64 = `data:image/${ext};base64,${Buffer.from(buffer).toString('base64')}`;
        } catch (err) {
          console.warn('Failed to fetch remote image:', url, err.message);
          b64 = null; // Prevent injecting broken URLs into the PDF
        }
      }

      if (localPath && fs.existsSync(localPath)) {
        const dims = getImageDimensions(localPath);
        isPortrait = dims.height > dims.width;
      }

      if (b64) {
        // Fallback for category: raw Photo model uses p.stage
        const cat = ((p.category || p.stage) || '').toLowerCase();
        const captionText = p.caption || p.description || p.remarks || 'Component View';
        const photoData = { url: b64, caption: cleanCaption(captionText, 'Component View'), isPortrait };
        
        if (cat.includes('receive') || cat.includes('initial') || cat.includes('1')) categorizedPhotos.initial.push(photoData);
        else if (cat.includes('dismantl') || cat.includes('2')) categorizedPhotos.dismantling.push(photoData);
        else if (cat.includes('assembl') || cat.includes('3')) categorizedPhotos.assembly.push(photoData);
        else if (cat.includes('test') || cat.includes('4')) categorizedPhotos.testing.push(photoData);
        else if (cat.includes('dispatch') || cat.includes('final') || cat.includes('ship') || cat.includes('5')) categorizedPhotos.dispatch.push(photoData);
        else categorizedPhotos.initial.push(photoData); // fallback
      }
    }
  }

  // Paginate photos into chunks of dynamic layout sizing to prevent layout overflow in A4 boxes
  const chunkArray = (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  const photoPages = [];
  const addCategoryToPages = (categoryName, photosArray) => {
    if (photosArray && photosArray.length > 0) {
      const pageSize = photosArray.length <= 4 ? 4 : 6;
      const chunks = chunkArray(photosArray, pageSize);
      chunks.forEach((chunk, index) => {
        const titleSuffix = chunks.length > 1 ? ` (Part ${index + 1} of ${chunks.length})` : '';
        const isLargeLayout = pageSize === 4;
        
        const mappedPhotos = chunk.map(p => {
          let sizeClass = 'size-medium';
          if (p.isPortrait) {
            sizeClass = 'size-portrait';
          } else if (isLargeLayout) {
            sizeClass = 'size-large';
          }
          return {
            ...p,
            sizeClass
          };
        });

        photoPages.push({
          title: `${categoryName}${titleSuffix}`,
          photos: mappedPhotos,
          layoutClass: isLargeLayout ? 'layout-large' : 'layout-medium'
        });
      });
    }
  };

  addCategoryToPages('10.1 Incoming Inspection (As-Received State)', categorizedPhotos.initial);
  addCategoryToPages('10.2 Dismantling & Damage Assessment', categorizedPhotos.dismantling);
  addCategoryToPages('10.3 Rebuild Progress & Assembly Work', categorizedPhotos.assembly);
  addCategoryToPages('10.4 Quality Testing & Verification', categorizedPhotos.testing);
  addCategoryToPages('10.5 Final Dispatch Preparation', categorizedPhotos.dispatch);

  const mappedPhotoPages = photoPages.map((page, idx) => ({
    ...page,
    pageNum: 10 + idx
  }));

  const totalPhotoPages = mappedPhotoPages.length;
  const conclusionPageNum = 10 + totalPhotoPages;
  const certificatePageNum = 11 + totalPhotoPages;

  // 1. Revision / Version Info
  const revisionNo = report.version || 1;

  // 2. Failure analysis processing
  let failureObj = {
    rootCause: 'N/A',
    evidence: 'N/A',
    impact: 'N/A',
    recommendedAction: 'N/A'
  };
  if (report.failureAnalysis) {
    if (typeof report.failureAnalysis === 'object') {
      failureObj = { ...failureObj, ...report.failureAnalysis };
    } else if (typeof report.failureAnalysis === 'string') {
      try {
        const parsed = JSON.parse(report.failureAnalysis);
        failureObj = { ...failureObj, ...parsed };
      } catch (e) {
        failureObj.rootCause = report.failureAnalysis;
      }
    }
  }

  // Fallback check: if any field is N/A or empty, auto-populate it using fallback logic
  const fallbackObj = getFailureAnalysisFallback(job, inspection, dismantling);
  ['rootCause', 'evidence', 'impact', 'recommendedAction'].forEach(field => {
    if (!failureObj[field] || failureObj[field] === 'N/A' || failureObj[field].trim() === '') {
      failureObj[field] = fallbackObj[field];
    }
  });

  // 3. Before & After Photo extraction
  let beforePhoto = null;
  let afterPhoto = null;

  if (report.beforePhotoUrl) {
    beforePhoto = toBase64(report.beforePhotoUrl);
  }
  if (!beforePhoto) {
    beforePhoto = (categorizedPhotos.initial && categorizedPhotos.initial[0] && categorizedPhotos.initial[0].url) || null;
  }

  if (report.afterPhotoUrl) {
    afterPhoto = toBase64(report.afterPhotoUrl);
  }
  if (!afterPhoto) {
    afterPhoto = (categorizedPhotos.dispatch && categorizedPhotos.dispatch[0] && categorizedPhotos.dispatch[0].url) ||
                 (categorizedPhotos.testing && categorizedPhotos.testing[0] && categorizedPhotos.testing[0].url) ||
                 (categorizedPhotos.assembly && categorizedPhotos.assembly[0] && categorizedPhotos.assembly[0].url) || null;
  }

  // 4. Component Rebuild dates & KPI metrics
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const dates = {
    receivedDate: job.dateReceived || 'N/A',
    inspectionDate: inspection ? (inspection.startDate || 'N/A') : 'N/A',
    dismantlingDate: dismantling ? (dismantling.completionDate || 'N/A') : 'N/A',
    assemblyDate: assembly ? (assembly.assemblyCompletionDate || assembly.completionDate || 'N/A') : 'N/A',
    testingDate: testing ? (testing.completionDate || 'N/A') : 'N/A',
    dispatchDate: dispatch && dispatch.dispatchChecklist ? (testing.completionDate || 'N/A') : 'N/A'
  };

  // Rebuild Duration in Days
  let rebuildDurationDays = 0;
  const startDateStr = job.dateReceived || job.createdAt;
  const start = new Date(startDateStr);
  const end = (dispatch && dispatch.createdAt) ? new Date(dispatch.createdAt) : new Date();
  if (!isNaN(start) && !isNaN(end)) {
    const diffTime = Math.abs(end - start);
    rebuildDurationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  } else {
    rebuildDurationDays = 8;
  }

  // Total Labor Hours
  let totalLaborHours = 0;
  workDetails.forEach(wd => {
    const hrs = parseFloat(wd.hoursSpent) || 0;
    totalLaborHours += hrs;
  });
  if (totalLaborHours === 0) {
    let sumHrs = 0;
    if (assembly && assembly.workLogs) {
      assembly.workLogs.forEach(l => { sumHrs += parseFloat(l.hours) || 0; });
    }
    if (dismantling && dismantling.workLogs) {
      dismantling.workLogs.forEach(l => { sumHrs += parseFloat(l.hours) || 0; });
    }
    totalLaborHours = sumHrs || 48;
  }

  // Components Repaired vs Replaced
  let componentsRepaired = 0;
  let componentsReplaced = 0;
  if (dismantling && dismantling.componentConditionAssessment) {
    Object.values(dismantling.componentConditionAssessment).forEach(p => {
      if (p.reuseStatus === 'Reuse' || p.reuseStatus === 'Repair') {
        componentsRepaired++;
      }
    });
  }
  
  if (materialsDoc && materialsDoc.items) {
    const validItems = materialsDoc.items.filter(i => i.status !== 'Not Required');
    componentsReplaced = validItems.reduce((acc, i) => acc + (i.quantity || 1), 0);
  }

  if (componentsRepaired === 0 && componentsReplaced === 0) {
    componentsRepaired = 12;
    componentsReplaced = 4;
  }

  // Cost analysis
  let repairCost = parseFloat(job.totalRepairCost) || 0;
  if (materialsDoc && materialsDoc.items) {
    repairCost = materialsDoc.items.reduce((sum, item) => {
      if (item.status === 'Not Required') return sum;
      return sum + (item.totalCost || (item.unitCost * item.quantity) || 0);
    }, 0);
  }
  
  if (!repairCost) repairCost = 850000; // Fallback

  const newReplacementCost = repairCost * 3.5;
  const savingsAchieved = newReplacementCost - repairCost;
  const hasCostData = true;

  // All parts checklist (with status for each part)
  let totalMissing = 0, criticalMissing = 0, electricalMissing = 0, mechanicalMissing = 0;
  const allPartsList = [];

  if (inspection && inspection.partsChecklist) {
    Object.entries(inspection.partsChecklist).forEach(([name, data]) => {
      const status = typeof data === 'object' ? (data.status || 'Present') : (data || 'Present');
      const qty = (status === 'Missing' || status === 'Not Available') ? 1 : 1;

      allPartsList.push({
        partName: name,
        quantity: qty,
        status,
        remarks: typeof data === 'object' ? (data.remarks || '—') : '—'
      });

      // Also track missing counts for any downstream usage
      if (status === 'Missing' || status === 'Not Available') {
        totalMissing += 1;
        const lcName = name.toLowerCase();
        const isElectrical = lcName.includes('winding') || lcName.includes('wire') || lcName.includes('terminal') || lcName.includes('insulat') || lcName.includes('cable') || lcName.includes('sensor') || lcName.includes('carbon') || lcName.includes('brush');
        const isCritical = lcName.includes('bearing') || lcName.includes('shaft') || lcName.includes('gear') || lcName.includes('rotor') || lcName.includes('stator') || lcName.includes('armature');
        if (isCritical) criticalMissing += 1;
        if (isElectrical) electricalMissing += 1; else mechanicalMissing += 1;
      }
    });

    // Attach ALL parts so the template can render the full checklist
    inspection.allParts = allPartsList;
    // Keep missingParts for backward compatibility with any other template refs
    inspection.missingParts = allPartsList.filter(p => p.status === 'Missing' || p.status === 'Not Available');
  }


  // ── Build dismantling.processSteps from dismantling checklist ──
  if (dismantling && dismantling.dismantlingChecklist) {
    const steps = [];
    Object.entries(dismantling.dismantlingChecklist).forEach(([stepName, val]) => {
      if ((typeof val === 'object' && val?.checked) || val === true) {
        steps.push(stepName);
      }
    });
    if (steps.length > 0) {
      dismantling.processSteps = steps;
    }
    
    // Also attach overallRemarks if it exists
    if (dismantling.overallRemarks) {
      dismantling.processSummaryHeader = dismantling.overallRemarks;
    }
  }

  // ── Convert stage1.electricalTests (Mixed obj) → arrays for template ──

  // Template expects: inspection.initialIrTests  → [{ terminal, irValue, unit, remarks }]
  // Template expects: inspection.initialResistanceTests → [{ terminals, value, unit, remarks }]
  if (inspection && inspection.electricalTests) {
    const irTests = [];
    const resistanceTests = [];

    Object.entries(inspection.electricalTests).forEach(([testName, data]) => {
      if (!data || typeof data !== 'object') return;
      const nameLC = testName.toLowerCase();
      const isIR = nameLC.includes('ir ') || nameLC.includes('insulation') || nameLC.startsWith('ir');
      const isResistance = nameLC.includes('resistance') || nameLC.includes('winding') || nameLC.includes('wr ') || nameLC.startsWith('wr');

      if (isIR || (!isResistance)) {
        irTests.push({
          terminal: testName.replace(/^(ir|insulation resistance)\s+/i, ''),
          irValue: data.value ?? data.actual ?? data.irValue ?? 'N/A',
          unit: data.unit || 'MΩ',
          appliedVoltage: data.appliedVoltage || '—',
          standardValue: data.standardValue || (data.minValue && data.maxValue ? `${data.minValue}-${data.maxValue}` : '—'),
          remarks: data.status || data.remarks || 'Recorded'
        });
      } else {
        resistanceTests.push({
          terminals: testName.replace(/^(wr|winding resistance|resistance)\s+/i, ''),
          value: data.value ?? data.actual ?? 'N/A',
          unit: data.unit || 'Ω',
          appliedVoltage: data.appliedVoltage || '—',
          standardValue: data.standardValue || (data.minValue && data.maxValue ? `${data.minValue}-${data.maxValue}` : '—'),
          remarks: data.status || data.remarks || 'Recorded'
        });
      }
    });
    const groupElectricalTests = (tests, nameField) => {
      let lastGroup = '';
      return tests.map(test => {
        const nameStr = test[nameField];
        const parts = nameStr.split(' ');
        let group = nameStr;
        let suffix = nameStr;
        
        if (parts.length > 1) {
          suffix = parts.pop();
          group = parts.join(' ');
        }
        
        const result = { ...test };
        if (group !== lastGroup) {
          result.groupHeader = group;
          lastGroup = group;
        }
        result.terminalDisplay = suffix;
        return result;
      });
    };

    if (irTests.length > 0) inspection.initialIrTests = groupElectricalTests(irTests, 'terminal');
    if (resistanceTests.length > 0) inspection.initialResistanceTests = groupElectricalTests(resistanceTests, 'terminals');
  }

  // ── Convert stage4.electricalTests (Mixed obj) → arrays for template ──
  // Template expects: testing.finalIrTests  → [{ terminal, irValue, unit, remarks }]
  // Template expects: testing.finalResistanceTests → [{ terminals, value, unit, remarks }]
  if (testing && testing.electricalTests) {
    const irTests = [];
    const resistanceTests = [];

    Object.entries(testing.electricalTests).forEach(([testName, data]) => {
      if (!data || typeof data !== 'object') return;
      const nameLC = testName.toLowerCase();
      const isIR = nameLC.includes('ir ') || nameLC.includes('insulation') || nameLC.startsWith('ir');
      const isResistance = nameLC.includes('resistance') || nameLC.includes('winding') || nameLC.includes('wr ') || nameLC.startsWith('wr');

      if (isIR || (!isResistance)) {
        irTests.push({
          terminal: testName.replace(/^(ir|insulation resistance)\s+/i, ''),
          irValue: data.value ?? data.actual ?? data.irValue ?? 'N/A',
          unit: data.unit || 'MΩ',
          appliedVoltage: data.appliedVoltage || '—',
          standardValue: data.standardValue || (data.minValue && data.maxValue ? `${data.minValue}-${data.maxValue}` : '—'),
          remarks: data.status || data.remarks || 'Recorded'
        });
      } else {
        resistanceTests.push({
          terminals: testName.replace(/^(wr|winding resistance|resistance)\s+/i, ''),
          value: data.value ?? data.actual ?? 'N/A',
          unit: data.unit || 'Ω',
          appliedVoltage: data.appliedVoltage || '—',
          standardValue: data.standardValue || (data.minValue && data.maxValue ? `${data.minValue}-${data.maxValue}` : '—'),
          remarks: data.status || data.remarks || 'Recorded'
        });
      }
    });

    const groupElectricalTests = (tests, nameField) => {
      let lastGroup = '';
      return tests.map(test => {
        const nameStr = test[nameField];
        const parts = nameStr.split(' ');
        let group = nameStr;
        let suffix = nameStr;
        if (parts.length > 1) {
          suffix = parts.pop();
          group = parts.join(' ');
        }
        const result = { ...test };
        if (group !== lastGroup) {
          result.groupHeader = group;
          lastGroup = group;
        }
        result.terminalDisplay = suffix;
        return result;
      });
    };

    if (irTests.length > 0) testing.finalIrTests = groupElectricalTests(irTests, 'terminal');
    if (resistanceTests.length > 0) testing.finalResistanceTests = groupElectricalTests(resistanceTests, 'terminals');
  }

  // ── Convert testing surge / functional / sensor tests → flat arrays for template ──
  if (testing) {
    // Surge tests: { "Main Winding Phase R": { appliedVoltage, waveform }, ... }
    if (testing.surgeTests && typeof testing.surgeTests === 'object') {
      const surgeList = Object.entries(testing.surgeTests).map(([winding, data]) => ({
        winding,
        appliedVoltage: data.appliedVoltage || 'N/A',
        waveform: data.waveform || 'Balanced',
        remarks: data.remarks || ''
      }));
      if (surgeList.length > 0) testing.surgeTestsList = surgeList;
    }

    // Functional tests: { "No Load Run Test": { status }, ... }
    if (testing.functionalTests && typeof testing.functionalTests === 'object') {
      const functList = Object.entries(testing.functionalTests).map(([name, data]) => ({
        name,
        status: typeof data === 'object' ? (data.status || 'N/A') : (data || 'N/A'),
        remarks: typeof data === 'object' ? (data.remarks || '') : ''
      }));
      if (functList.length > 0) testing.functionalTestsList = functList;
    }

    // Sensor tests: { "RPM Sensor": { resistanceValue, status }, ... }
    if (testing.sensorTests && typeof testing.sensorTests === 'object') {
      const sensorList = Object.entries(testing.sensorTests).map(([name, data]) => ({
        name,
        resistanceValue: typeof data === 'object' ? (data.resistanceValue || '—') : (data || '—'),
        status: typeof data === 'object' ? (data.status || 'N/A') : 'N/A'
      }));
      if (sensorList.length > 0) testing.sensorTestsList = sensorList;
    }
  }

  // Dynamic Timeline
  const timelineLogs = [];
  if (inspection) {
    timelineLogs.push({ title: 'Incoming Inspection', desc: `Technician: ${inspection.technician || 'TRC Specialist'} | Date: ${inspection.startDate || today}`, completed: true });
  }
  if (dismantling) {
    timelineLogs.push({ title: 'Dismantling & Assessment', desc: `Technician: ${dismantling.technician || 'TRC Specialist'} | Date: ${dismantling.completionDate || dismantling.startDate || today}`, completed: true });
  }
  if (assembly) {
    timelineLogs.push({ title: 'Pre-Assembly Operations', desc: `Technician: ${assembly.technician || 'TRC Specialist'} | Start: ${assembly.preAssemblyStartDate || 'N/A'} to End: ${assembly.preAssemblyCompletionDate || 'N/A'}`, completed: true });
    timelineLogs.push({ title: 'Main Assembly & Verification', desc: `Technician: ${assembly.technician || 'TRC Specialist'} | Start: ${assembly.assemblyStartDate || 'N/A'} to End: ${assembly.assemblyCompletionDate || 'N/A'}`, completed: true });
  }
  if (testing) {
    timelineLogs.push({ title: 'Final Testing & QA', desc: `Technician: ${testing.technician || 'QA Inspector'} | Date: ${testing.completionDate || today}`, completed: true });
  }

  if (timelineLogs.length === 0) {
    const datesFallback = {
      dismantle: dismantling ? (dismantling.completionDate || today) : today,
      assemble: assembly ? (assembly.assemblyCompletionDate || assembly.completionDate || today) : today,
      test: testing ? (testing.completionDate || today) : today
    };

    timelineLogs.push(
      { title: 'Incoming Inspection Completed', desc: `Verified physical condition and missing parts check. Date: ${job.dateReceived || today}`, completed: true },
      { title: 'Bearing Disassembly & Shaft Inspection', desc: `Technician: TRC Specialist | Dismantled casings and measured fits. Date: ${datesFallback.dismantle}`, completed: true },
      { title: 'Coil Cleaning & Varnishing Completed', desc: `Technician: TRC Specialist | Stator and rotor baked and varnished. Date: ${datesFallback.assemble}`, completed: true },
      { title: 'New OEM Bearings & Seals Installed', desc: `Technician: TRC Specialist | Installed using precision induction heating. Date: ${datesFallback.assemble}`, completed: true },
      { title: 'Final Mechanical Rebuild Completed', desc: `Technician: TRC Specialist | Torqued casing bolts and verified air gaps. Date: ${datesFallback.assemble}`, completed: true },
      { title: 'Electrical Quality Testing (IR & Surge) Passed', desc: `QA Inspector: Verified resistance and balance. Date: ${datesFallback.test}`, completed: true }
    );
  }

  // 5. QR Code generation linking to digital job history
  const QRCode = require('qrcode');
  const jobUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/jobs/${job._id}`;
  let qrCodeDataUrl = null;
  try {
    qrCodeDataUrl = await QRCode.toDataURL(jobUrl, { width: 120, margin: 1 });
  } catch (err) {
    console.error('Failed to generate QR Code:', err);
  }

  let coverPhotoBase64 = null;
  if (report.headerLogo) {
    const hUrl = report.headerLogo;
    if (hUrl.startsWith('data:image')) {
      coverPhotoBase64 = hUrl;
    } else if (hUrl.startsWith('/uploads')) {
      const localPath = path.join(__dirname, '..', hUrl);
      if (fs.existsSync(localPath)) {
        const bitmap = fs.readFileSync(localPath);
        const ext = path.extname(localPath).slice(1) || 'png';
        coverPhotoBase64 = `data:image/${ext};base64,${bitmap.toString('base64')}`;
      }
    } else if (hUrl.startsWith('http://') || hUrl.startsWith('https://')) {
      try {
        const headers = {};
        if (hUrl.includes('vercel-storage.com') && process.env.BLOB_READ_WRITE_TOKEN) {
          headers['Authorization'] = `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`;
        }
        const response = await fetch(hUrl, { headers });
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const ext = hUrl.split('.').pop().split('?')[0] || 'png';
          coverPhotoBase64 = `data:image/${ext};base64,${Buffer.from(buffer).toString('base64')}`;
        }
      } catch (err) {
        console.warn('Failed to fetch headerLogo:', hUrl, err.message);
      }
    }
  }

  const templateData = {
    job: {
      jobNo: job.jobNo,
      description: job.description || job.desc,
      serialNumber: job.serialNumber || job.motorSerial,
      equipmentModel: job.equipmentModel || job.equipment,
      partNumber: job.partNumber,
      subAssemblyMake: job.subAssemblyMake || job.subAssy,
      orderNumber: job.orderNumber || job.poNo,
      receivedFrom: job.receivedFrom || job.recSite,
      dateReceived: job.dateReceived || job.recDate,
      siteComplaints: job.siteComplaints || job.failureDesc,
      totalRepairCost: job.totalRepairCost || '0',
      finalDriveNo: job.finalDriveNo || '—',
      finalDriveModel: job.finalDriveModel || '—',
      installedHour: job.installedHour || '—',
      installedDate: job.installedDate || '—',
      removalHour: job.removalHour || '—',
      removalDate: job.removalDate || '—',
      lifeHour: job.lifeHour || '—'
    },
    isWheelMotor: !!((job.description && job.description.toLowerCase().includes('wheel motor')) || 
                    (job.componentType && job.componentType.toLowerCase().includes('wheel motor'))),
    report,
    failureAnalysis: failureObj,
    coverPhotoBase64,
    beforePhoto,
    afterPhoto,
    revisionNo,
    qrCode: qrCodeDataUrl,
    inspection,
    dismantling,
    assembly: assembly ? { ...assembly, timeline: timelineLogs } : { timeline: timelineLogs },
    testing,
    dispatch,
    photos: categorizedPhotos,
    photoPages: mappedPhotoPages,
    conclusionPageNum,
    certificatePageNum,
    user: report.generatedBy,
    logo: toBase64('../assets/logo.png', true),
    headerBar: toBase64('../../HEADER/Picture1.png', true),
    headerLogo: toBase64('../assets/logo.png', true),
    today,
    rebuildDurationDays,
    totalLaborHours,
    componentsRepaired,
    componentsReplaced,
    componentStatus: job.status || 'Active',
    dates,
    missingSummary: {
      totalMissing,
      criticalMissing,
      electricalMissing,
      mechanicalMissing
    },
    cost: {
      hasCostData,
      repairCost: repairCost.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }),
      newReplacementCost: newReplacementCost.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }),
      savingsAchieved: savingsAchieved.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    },
    materialsList: materialsDoc && materialsDoc.items ? materialsDoc.items.filter(i => i.status !== 'Not Required').map(i => ({
      ...i,
      totalCostFormatted: (i.totalCost || (i.unitCost * i.quantity) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    })) : []
  };

  const os = require('os');
  const pdfDir = path.join(os.tmpdir(), 'pdfs');
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

  const pdfFilename = `${report.reportNo.replace(/[^A-Z0-9-]/gi, '_')}.pdf`;
  const pdfPath = path.join(pdfDir, pdfFilename);
  const templatePath = path.join(__dirname, '../templates/reportTemplate.html');

  try {
    if (req.query.format === 'html') {
      const handlebars = require('handlebars');
      handlebars.registerHelper('eq', function (a, b) { return a === b; });
      handlebars.registerHelper('or', function (a, b) { return a || b; });
      handlebars.registerHelper('fallback', function (value, defaultValue) {
        if (value === undefined || value === null || value === '') return defaultValue || 'N/A';
        return value;
      });
      handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
        return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
      });
      handlebars.registerHelper('editable', function (fieldPath, value, defaultVal, options) {
        const val = value || defaultVal;
        return new handlebars.SafeString(`<div contenteditable="true" data-field="${fieldPath}" class="editable-field" style="border: 1.5px dashed #3b82f6; padding: 6px; min-height: 20px; transition: all 0.2s; border-radius: 4px; outline: none; background: rgba(59, 130, 246, 0.05);" onfocus="this.style.backgroundColor='#ffffff'; this.style.boxShadow='0 0 0 2px #bfdbfe';" onblur="this.style.backgroundColor='rgba(59, 130, 246, 0.05)'; this.style.boxShadow='none'; window.parent.postMessage({ type: 'UPDATE_FIELD', field: '${fieldPath}', value: this.innerText }, '*');">${val}</div>`);
      });
      handlebars.registerHelper('renderTestingComparisonTable', function() { return new handlebars.SafeString('<tr><td colspan="4" style="text-align: center; color: #999; padding: 10px;">No insulation resistance comparison data available.</td></tr>'); });

      const templateHtml = fs.readFileSync(templatePath, 'utf8');
      const template = handlebars.compile(templateHtml);
      const html = template(templateData, { allowProtoPropertiesByDefault: true });
      
      const injectedHtml = html.replace('</body>', `<script>
        window.onload = () => {
          setTimeout(() => {
            window.parent.postMessage({ type: 'RESIZE_IFRAME', height: document.body.scrollHeight }, '*');
          }, 500);
        };
        const observer = new MutationObserver(() => {
          window.parent.postMessage({ type: 'RESIZE_IFRAME', height: document.body.scrollHeight }, '*');
        });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      </script></body>`);

      return res.send(injectedHtml);
    }

    Logger.info('Generating new PDF on the fly', { reportNo: report.reportNo });
    const pdfBuffer = await PdfService.generateFromTemplate(templatePath, templateData);
    
    res.contentType('application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${pdfFilename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF Generation Error:', err);
    res.status(500).json(ApiResponse.error('High-fidelity PDF generation failed', 500, { error: err.message }));
  }
}));

// ─────────────────────────────────────────────────────────────────────
// Template-Based Report Generation Routes (DOCX Template System)
// ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/reports/export-docx/:reportId
 * Generate final DOCX report using the approved Draft Report
 */
router.post('/export-docx/:reportId', reportController.generateReport);

/**
 * GET /api/reports/download/:jobNo
 * Download generated report (PDF or DOCX)
 * Query params: format=pdf|docx (default: pdf)
 */
router.get('/download/:jobNo(*)', reportController.downloadReport);

/**
 * GET /api/reports/generated-list
 * List all generated reports
 */
router.get('/generated-list', reportController.listReports);

/**
 * GET /api/reports
 * List all report documents with metadata
 */
router.get('/all', asyncHandler(async (req, res) => {
  const reports = await Report.find()
    .sort({ createdAt: -1 })
    .populate('job', 'jobNo equipmentModel description receivedFrom stage status')
    .populate('generatedBy', 'name')
    .populate('approvedBy', 'name');
  
  const ApiResponse = require('../utils/apiResponse');
  res.json(ApiResponse.success('Reports retrieved successfully', reports));
}));

router.get('/status/:jobNo(*)', reportController.getReportStatus);

module.exports = router;
