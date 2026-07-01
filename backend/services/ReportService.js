/**
 * ReportService
 * 
 * Centralises all report business logic extracted from reportRoutes.js.
 * reportRoutes.js should only contain route definitions after this extraction.
 * 
 * Responsibilities:
 * - AI draft generation
 * - Report CRUD operations
 * - Photo synchronisation
 * - Review workflow (submit, QA verify, final approve)
 * - Helper utilities (JSON extraction, field normalisation)
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const Report = require('../models/Report');
const Job = require('../models/Job');
const JobData = require('../models/JobData');
const Photo = require('../models/Photo');
const ApiResponse = require('../utils/apiResponse');
const Logger = require('../utils/logger');
const AuditService = require('./AuditService');

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const REPORT_STRING_FIELDS = [
  'executiveSummary',
  'visualInspectionSummary',
  'electricalInspectionSummary',
  'partsConditionAnalysis',
  'workPerformed',
  'assemblyDescription',
  'testingSummary',
  'finalConclusion',
  'recommendations'
];

const FAILURE_ANALYSIS_FIELDS = [
  'rootCause',
  'evidence',
  'impact',
  'recommendedAction'
];

const AI_JSON_REGEX = /(?:```json)?\s*({[\s\S]*})\s*(?:```)?/i;

// ─────────────────────────────────────────────
// Helper: Image Dimensions
// ─────────────────────────────────────────────

const fs = require('fs');

function getImageDimensions(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    if (buffer.toString('ascii', 1, 4) === 'PNG') {
      return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
        type: 'png'
      };
    }
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
      let offset = 2;
      while (offset < buffer.length) {
        const marker = buffer.readUInt16BE(offset);
        offset += 2;
        if (
          marker === 0xFFE0 ||
          (marker >= 0xFFE1 && marker <= 0xFFEF) ||
          marker === 0xFFDB ||
          marker === 0xFFC4 ||
          marker === 0xFFDD
        ) {
          const length = buffer.readUInt16BE(offset);
          offset += length;
        } else if (
          marker === 0xFFC0 ||
          marker === 0xFFC1 ||
          marker === 0xFFC2 ||
          marker === 0xFFC3
        ) {
          return {
            width: buffer.readUInt16BE(offset + 5),
            height: buffer.readUInt16BE(offset + 3),
            type: 'jpg'
          };
        } else if (buffer[offset - 2] === 0xFF) {
          offset--;
        } else {
          break;
        }
      }
    }
  } catch (e) {
    Logger.error('Error reading image dimensions', e, { filePath });
  }
  return { width: 800, height: 600, type: 'unknown' };
}

// ─────────────────────────────────────────────
// Helper: Failure Analysis Fallback
// ─────────────────────────────────────────────

function getFailureAnalysisFallback(job) {
  const rootCause = (job && job.siteComplaints)
    ? `Failure analysis to be completed by engineer. Site complaint recorded: "${job.siteComplaints}". Root cause determination pending detailed inspection findings review.`
    : `Root cause analysis pending. Engineer must review stage findings and complete this section before report finalisation.`;

  return {
    rootCause,
    evidence: '[AI unavailable — engineer must document observed evidence from inspection and dismantling findings.]',
    impact: '[AI unavailable — engineer must assess operational and safety impact based on findings.]',
    recommendedAction: '[AI unavailable — engineer must specify corrective and preventive actions.]'
  };
}

// ─────────────────────────────────────────────
// Helper: Extract JSON from AI Response
// ─────────────────────────────────────────────

function extractJsonFromAi(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  const trimmed = rawText.trim();

  try {
    return JSON.parse(trimmed);
  } catch (err) {
    const match = trimmed.match(AI_JSON_REGEX);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (innerErr) {
        // fall through
      }
    }

    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
      } catch (innerErr) {
        return null;
      }
    }

    return null;
  }
}

// ─────────────────────────────────────────────
// Helper: Ensure All Report Fields Are Strings
// ─────────────────────────────────────────────

function ensureStringFields(parsed = {}) {
  const normalized = {};
  REPORT_STRING_FIELDS.forEach((field) => {
    let value = parsed[field];
    if (value === undefined || value === null) {
      normalized[field] = '';
      return;
    }
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        normalized[field] = value.map((item, idx) => {
          if (item && typeof item === 'object') {
            const comp = item.component || item.part || item.name || item.item || '';
            const cond = item.condition || item.observation || item.findings || '';
            const rec = item.recommendation || item.decision || item.action || item.remarks || '';
            const parts = [];
            if (comp) parts.push(comp);
            if (cond) parts.push(cond);
            if (rec) parts.push(`Recommendation: ${rec}`);
            return parts.length > 0
              ? `• ${parts.join(' — ')}`
              : `• Item ${idx + 1}: ${JSON.stringify(item)}`;
          }
          return `• ${String(item)}`;
        }).join('\n\n');
      } else {
        normalized[field] = Object.entries(value)
          .map(([k, v]) => {
            const displayKey = isNaN(k) ? k : '';
            if (v && typeof v === 'object') {
              const cond = v.condition || v.observation || v.findings || '';
              const rec = v.recommendation || v.decision || v.action || v.remarks || '';
              const parts = [];
              if (displayKey) parts.push(displayKey);
              if (cond) parts.push(cond);
              if (rec) parts.push(`Recommendation: ${rec}`);
              return parts.length > 0
                ? `• ${parts.join(' — ')}`
                : `• ${displayKey ? displayKey + ': ' : ''}${JSON.stringify(v)}`;
            }
            return `• ${displayKey ? displayKey + ': ' : ''}${String(v)}`;
          })
          .join('\n\n');
      }
    } else {
      normalized[field] = String(value);
    }
  });
  return normalized;
}

// ─────────────────────────────────────────────
// Helper: Normalize Failure Analysis
// ─────────────────────────────────────────────

function normalizeFailureAnalysis(rawValue, fallback) {
  if (!rawValue || fallback == null) {
    return fallback || {
      rootCause: 'Not available',
      evidence: 'Not available',
      impact: 'Not available',
      recommendedAction: 'Not available'
    };
  }

  let parsed = rawValue;
  if (typeof rawValue === 'string') {
    try {
      parsed = JSON.parse(rawValue);
    } catch (err) {
      parsed = { rootCause: rawValue };
    }
  }

  if (typeof parsed !== 'object') {
    parsed = { rootCause: String(parsed) };
  }

  const result = {};
  FAILURE_ANALYSIS_FIELDS.forEach((field) => {
    const value = parsed[field];
    result[field] = (value === undefined || value === null || String(value).trim() === '')
      ? fallback[field]
      : String(value);
  });
  return result;
}

// ─────────────────────────────────────────────
// Helper: Generate Fallback Draft from Real Job Data
// ─────────────────────────────────────────────

function generateFallbackDraft(job, stage1, stage2, stage3, stage4) {
  const failureFallback = getFailureAnalysisFallback(job);

  return {
    executiveSummary:
      `Draft report for Job ${job.jobNo} — ${job.equipmentModel || 'Equipment'} ` +
      `(Serial: ${job.serialNumber || 'Not recorded'}). ` +
      `Received from: ${job.receivedFrom || 'Not recorded'}. ` +
      `Scope: ${job.scopeOfWork || 'Not recorded'}. ` +
      `[AI unavailable — engineer review required.]`,

    visualInspectionSummary:
      stage1?.overallRemarks
        ? `Inspection remarks: ${stage1.overallRemarks}. Decision: ${stage1.inspectionDecision || 'Pending'}.`
        : `Visual inspection completed. Technician: ${stage1?.technician || 'Not recorded'}. ` +
          `Decision: ${stage1?.inspectionDecision || 'Pending'}. ` +
          `[AI unavailable — engineer review required.]`,

    electricalInspectionSummary:
      `Electrical tests recorded: ${Object.keys(stage1?.electricalTests || {}).length} test(s). ` +
      `Tests include: ${Object.keys(stage1?.electricalTests || {}).slice(0, 4).join(', ') || 'None recorded'}. ` +
      `[AI unavailable — engineer review required.]`,

    partsConditionAnalysis:
      `Components assessed: ${Object.keys(stage2?.componentConditionAssessment || {}).length}. ` +
      `Items: ${Object.keys(stage2?.componentConditionAssessment || {}).slice(0, 4).join(', ') || 'None recorded'}. ` +
      `Materials used: ${(stage3?.materialsUsed || []).length} item(s). ` +
      `[AI unavailable — engineer review required.]`,

    failureAnalysis: failureFallback,

    workPerformed:
      `Stage 2 (Dismantling) by ${stage2?.technician || 'Not recorded'}, ` +
      `Stage 3 (Assembly) by ${stage3?.technician || 'Not recorded'}, ` +
      `Stage 4 (Testing) by ${stage4?.technician || 'Not recorded'}. ` +
      `[AI unavailable — engineer review required.]`,

    assemblyDescription:
      `Assembly checklist items: ${Object.keys(stage3?.assemblyChecklist || {}).length}. ` +
      `[AI unavailable — engineer review required.]`,

    testingSummary:
      `Final electrical tests: ${Object.keys(stage4?.electricalTests || {}).length}. ` +
      `Functional tests: ${Object.keys(stage4?.functionalTests || {}).length}. ` +
      `QA: ${stage4?.qaApprovedBy ? 'Approved by ' + stage4.qaApprovedBy : 'Pending'}. ` +
      `[AI unavailable — engineer review required.]`,

    finalConclusion:
      `Rebuild of ${job.equipmentModel || 'equipment'} (Job: ${job.jobNo}) processed through all workshop stages. ` +
      `[AI unavailable — engineer must complete this section before finalisation.]`,

    recommendations:
      `[AI unavailable — engineer must specify maintenance recommendations and follow-up actions before report finalisation.]`
  };
}

// ─────────────────────────────────────────────
// Service Methods
// ─────────────────────────────────────────────

class ReportService {

  /**
   * GET /api/reports/summary
   * Dashboard statistics
   */
  static async getSummary() {
    const [total, draft, underReview, approved, exported] = await Promise.all([
      Report.countDocuments({}),
      Report.countDocuments({ status: 'Draft' }),
      Report.countDocuments({ status: 'Under Review' }),
      Report.countDocuments({ status: 'Final Approved' }),
      Report.countDocuments({ status: 'Exported' })
    ]);

    return ApiResponse.success('Report summary retrieved', {
      total,
      draft,
      underReview,
      approved,
      exported
    });
  }

  /**
   * GET /api/reports/job/:jobId
   * List all reports for a job
   */
  static async getReportsByJob(jobId) {
    const reports = await Report.find({ job: jobId })
      .sort({ createdAt: -1 })
      .populate('generatedBy', 'name');

    return ApiResponse.success('Reports retrieved', reports);
  }

  /**
   * POST /api/reports/initiate-workflow
   * Generate AI draft report
   */
  static async initiateWorkflow(jobId, additionalInstructions, userId) {
    const [job, jobDataDoc, photos] = await Promise.all([
      Job.findById(jobId).populate('createdBy', 'name'),
      JobData.findOne({ job: jobId }),
      Photo.find({ job: jobId })
    ]);

    if (!job) return ApiResponse.notFound('Job not found');

    const jd = jobDataDoc || {};
    const stage1 = jd.stage1 || {};
    const stage2 = jd.stage2 || {};
    const stage3 = jd.stage3 || {};
    const stage4 = jd.stage4 || {};

    // Build structured prompt data from real JobData
    const jobDetails = {
      jobNo: job.jobNo,
      equipmentModel: job.equipmentModel,
      description: job.description,
      partNumber: job.partNumber,
      serialNumber: job.serialNumber,
      subAssemblyMake: job.subAssemblyMake,
      receivedFrom: job.receivedFrom,
      siteComplaints: job.siteComplaints,
      scopeOfWork: job.scopeOfWork,
      previousRunningHours: job.previousRunningHours
    };

    const inspectionData = Object.keys(stage1).length ? {
      incomingChecklist: Object.entries(stage1.incomingChecklist || {})
        .filter(([, v]) => v?.checked).map(([k]) => k),
      electricalTests: Object.entries(stage1.electricalTests || {})
        .map(([k, v]) => `${k}: ${v?.actual || ''} ${v?.status || ''}`),
      partsChecklist: Object.entries(stage1.partsChecklist || {})
        .filter(([, v]) => v?.checked).map(([k]) => k),
      overallRemarks: stage1.overallRemarks,
      inspectionDecision: stage1.inspectionDecision
    } : 'No inspection data recorded.';

    const dismantlingData = Object.keys(stage2).length ? {
      dismantlingChecklist: Object.entries(stage2.dismantlingChecklist || {})
        .filter(([, v]) => v?.checked).map(([k]) => k),
      componentConditionAssessment: Object.entries(stage2.componentConditionAssessment || {})
        .map(([k, v]) => `${k}: ${v?.condition || 'N/A'} (Decision: ${v?.decision || 'N/A'}) - ${v?.findings || ''}`),
      overallRemarks: stage2.overallRemarks
    } : 'No dismantling data recorded.';

    const assemblyData = Object.keys(stage3).length ? {
      preAssemblyChecklist: Object.entries(stage3.preAssemblyChecklist || {})
        .filter(([, v]) => v?.checked).map(([k]) => k),
      assemblyChecklist: Object.entries(stage3.assemblyChecklist || {})
        .filter(([, v]) => v?.checked).map(([k]) => k),

      materialsUsed: (stage3.materialsUsed || []).map(m => `${m.name} x${m.quantity} ${m.unit || ''}`),
      completionDate: stage3.completionDate
    } : 'No assembly data recorded.';

    const testingData = Object.keys(stage4).length ? {
      electricalTests: Object.entries(stage4.electricalTests || {})
        .map(([k, v]) => `${k}: ${v?.actual || ''} ${v?.status || ''}`),
      functionalTests: Object.entries(stage4.functionalTests || {})
        .filter(([, v]) => v?.status === 'Pass').map(([k]) => k),
      surgeTests: Object.entries(stage4.surgeTests || {})
        .map(([k, v]) => `${k}: ${v?.status || ''}`),
      overallRemarks: stage4.overallRemarks,
      qaApprovedBy: stage4.qaApprovedBy
    } : 'No testing data recorded.';

    // Build AI prompt
    const prompt = `You are an OEM-level technical service engineer generating an industrial rebuild report.

Use concise, precise, and formal OEM-style language. Output ONLY valid JSON. No markdown. No explanation.

Job Context: ${JSON.stringify(jobDetails, null, 2)}
Stage Data:
- Inspection: ${JSON.stringify(inspectionData, null, 2)}
- Dismantling: ${JSON.stringify(dismantlingData, null, 2)}
- Assembly: ${JSON.stringify(assemblyData, null, 2)}
- Testing: ${JSON.stringify(testingData, null, 2)}

${additionalInstructions ? `Special Focus: ${additionalInstructions}` : ''}

Return EXACTLY this JSON structure:
{
  "executiveSummary": "",
  "visualInspectionSummary": "",
  "electricalInspectionSummary": "",
  "partsConditionAnalysis": "",
  "failureAnalysis": {
    "rootCause": "",
    "evidence": "",
    "impact": "",
    "recommendedAction": ""
  },
  "workPerformed": "",
  "assemblyDescription": "",
  "testingSummary": "",
  "finalConclusion": "",
  "recommendations": ""
}`;

    // Call Gemini with fallback models
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    let rawAiResponse = null;
    let aiParsed = null;
    let aiError = null;

    const models = ['gemini-2.5-flash', 'gemini-flash-latest'];
    for (const modelName of models) {
      if (rawAiResponse) break;
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        rawAiResponse = typeof result?.response?.text === 'function'
          ? await result.response.text()
          : String(result?.response || '');
      } catch (err) {
        aiError = err;
        Logger.warn(`Gemini model ${modelName} failed for report draft`, { error: err.message });
      }
    }

    if (rawAiResponse) {
      aiParsed = extractJsonFromAi(rawAiResponse);
    }

    if (!aiParsed) {
      Logger.warn('AI report draft parsing failed — using fallback', {
        error: aiError?.message || 'No AI response'
      });
    }

    // Build final report payload
    // Always start with real job data fallback, then overlay AI content
    const reportFallback = generateFallbackDraft(job, stage1, stage2, stage3, stage4);
    const reportPayload = {
      ...reportFallback,
      ...(aiParsed && typeof aiParsed === 'object' ? ensureStringFields(aiParsed) : {}),
      failureAnalysis: normalizeFailureAnalysis(
        aiParsed?.failureAnalysis,
        reportFallback.failureAnalysis
      )
    };

    // Save report
    const report = await Report.create({
      job: jobId,
      ...reportPayload,
      promptUsed: prompt.slice(0, 2000),
      generatedBy: userId,
      status: 'Draft',
      categorizedPhotos: []
    });

    // Auto-sync photos from JobData stages to the report immediately
    await ReportService.syncPhotos(report._id);

    await AuditService.log({
      entityType: 'Report',
      entityId: report._id,
      entityRef: job.jobNo,
      action: 'report_generated',
      summary: `AI report draft generated for job ${job.jobNo}`,
      performedBy: userId,
      req: null
    });

    return ApiResponse.created(report, 'AI report draft created successfully');
  }

  /**
   * PATCH /api/reports/:reportId
   * Update report fields
   */
  static async updateReport(reportId, updateFields, reportNo, req) {
    const allowed = [
      'status', 'isQaApproved', 'isEngineerReviewed', 'categorizedPhotos',
      'executiveSummary', 'visualInspectionSummary', 'electricalInspectionSummary',
      'partsConditionAnalysis', 'failureAnalysis', 'workPerformed',
      'assemblyDescription', 'testingSummary', 'finalConclusion', 'recommendations'
    ];

    const updateData = {};
    allowed.forEach(field => {
      if (updateFields[field] !== undefined) {
        updateData[field] = updateFields[field];
      }
    });

    const report = await Report.findByIdAndUpdate(
      reportId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!report) return ApiResponse.notFound('Report not found');

    return ApiResponse.success('Report updated successfully', report);
  }

  /**
   * POST /api/reports/:reportId/submit-review
   */
  static async submitForReview(reportId, userId, role, comment) {
    const report = await Report.findById(reportId);
    if (!report) return ApiResponse.notFound('Report not found');

    if (['Final Approved', 'Exported'].includes(report.status)) {
      return ApiResponse.badRequest('Cannot submit a report that is already final approved or exported');
    }

    report.status = 'Under Review';
    report.isEngineerReviewed = true;
    if (comment) report.reviewNotes = comment;
    report.reviewHistory = report.reviewHistory || [];
    report.reviewHistory.push({
      action: 'SubmittedForReview',
      user: userId,
      role: role || 'Engineer',
      comment: comment || 'Submitted for engineering review',
      date: new Date()
    });

    await report.save();

    await AuditService.log({
      entityType: 'Report',
      entityId: report._id,
      entityRef: report.reportNo,
      action: 'report_submitted',
      summary: `Report submitted for review`,
      performedBy: userId,
      req: null
    });

    return ApiResponse.success('Report submitted for review', report);
  }

  /**
   * POST /api/reports/:reportId/qa-verify
   */
  static async qaVerify(reportId, userId, role, comment) {
    const report = await Report.findById(reportId);
    if (!report) return ApiResponse.notFound('Report not found');

    if (report.status !== 'Under Review' && report.status !== 'Draft') {
      return ApiResponse.badRequest('QA verification must follow review submission');
    }

    report.status = 'QA Verified';
    report.isQaApproved = true;
    if (comment) report.approvalNotes = comment;
    report.reviewHistory = report.reviewHistory || [];
    report.reviewHistory.push({
      action: 'QAVerified',
      user: userId,
      role: role || 'QA',
      comment: comment || 'QA verified for final approval',
      date: new Date()
    });

    await report.save();

    await AuditService.log({
      entityType: 'Report',
      entityId: report._id,
      entityRef: report.reportNo,
      action: 'report_qa_verified',
      summary: `Report QA verified`,
      performedBy: userId,
      req: null
    });

    return ApiResponse.success('Report QA verified', report);
  }

  /**
   * POST /api/reports/:reportId/final-approve
   */
  static async finalApprove(reportId, userId, role, comment) {
    const report = await Report.findById(reportId);
    if (!report) return ApiResponse.notFound('Report not found');

    if (report.status !== 'QA Verified') {
      return ApiResponse.badRequest('Final approval requires QA verification first');
    }

    report.status = 'Final Approved';
    report.isQaApproved = true;
    if (comment) report.approvalNotes = comment;
    report.reviewHistory = report.reviewHistory || [];
    report.reviewHistory.push({
      action: 'FinalApproved',
      user: userId,
      role: role || 'Approver',
      comment: comment || 'Final approval granted',
      date: new Date()
    });

    await report.save();

    await AuditService.log({
      entityType: 'Report',
      entityId: report._id,
      entityRef: report.reportNo,
      action: 'report_final_approved',
      summary: `Report final approved`,
      performedBy: userId,
      req: null
    });

    return ApiResponse.success('Report final approved', report);
  }

  /**
   * GET /api/reports/:reportId/review-history
   */
  static async getReviewHistory(reportId) {
    const report = await Report.findById(reportId)
      .populate('job', 'jobNo equipmentModel receivedFrom')
      .populate('reviewHistory.user', 'name username role')
      .populate('generatedBy', 'name')
      .populate('approvedBy', 'name');

    if (!report) return ApiResponse.notFound('Report not found');

    const nextAction = {
      'Draft': 'Submit for review',
      'Under Review': 'QA verify',
      'QA Verified': 'Final approve',
      'Final Approved': 'Export report'
    }[report.status] || 'Completed';

    return ApiResponse.success('Review history retrieved', {
      reportId: report._id,
      reportNo: report.reportNo,
      status: report.status,
      isEngineerReviewed: report.isEngineerReviewed,
      isQaApproved: report.isQaApproved,
      reviewNotes: report.reviewNotes || '',
      approvalNotes: report.approvalNotes || '',
      nextAction,
      reviewHistory: report.reviewHistory || [],
      metadata: {
        jobNo: report.job?.jobNo || null,
        equipmentModel: report.job?.equipmentModel || null,
        generatedBy: report.generatedBy?.name || null,
        approvedBy: report.approvedBy?.name || null,
        updatedAt: report.updatedAt,
        createdAt: report.createdAt
      }
    });
  }

  /**
   * DELETE /api/reports/:reportId
   */
  static async deleteReport(reportId) {
    const report = await Report.findById(reportId);
    if (!report) return ApiResponse.notFound('Report not found');

    await report.deleteOne();
    return ApiResponse.success('Report deleted successfully', null);
  }

  /**
   * POST /api/reports/sync-photos/:reportId
   */
  static async syncPhotos(reportId) {
    const report = await Report.findById(reportId);
    if (!report) return ApiResponse.notFound('Report not found');

    const jobId = report.job;
    const [jobDataDoc, photos] = await Promise.all([
      JobData.findOne({ job: jobId }),
      Photo.find({ job: jobId })
    ]);

    const jd = jobDataDoc || {};
    const stage1 = jd.stage1;
    const stage2 = jd.stage2;
    const stage3 = jd.stage3;
    const stage4 = jd.stage4;

    const allPhotoPaths = new Set();
    const categorizedPhotos = [];

    const addPhotos = (items, category, captionPrefix = '') => {
      if (!items) return;
      const array = Array.isArray(items) ? items : [items];
      array.forEach((p, idx) => {
        if (!p) return;
        const photoPath = typeof p === 'string' ? p : (p.url || p.filename);
        if (photoPath && !allPhotoPaths.has(photoPath)) {
          allPhotoPaths.add(photoPath);
          let finalUrl = photoPath;
          if (
            !photoPath.startsWith('http') &&
            !photoPath.startsWith('/uploads') &&
            !photoPath.startsWith('data:image')
          ) {
            finalUrl = `/uploads/photos/${photoPath}`;
          }
          categorizedPhotos.push({
            category,
            url: finalUrl,
            caption: typeof p === 'object' && p.caption
              ? p.caption
              : `${captionPrefix} ${idx + 1}`.trim(),
            order: categorizedPhotos.length
          });
        }
      });
    };

    if (stage1) {
      addPhotos(stage1.photos, 'Received Condition', 'Initial View');
      Object.entries(stage1.partsChecklist || {}).forEach(([partName, data]) => {
        addPhotos(data?.photos, 'Received Condition', partName);
      });
    }
    if (stage2) {
      addPhotos(stage2.photos, 'Dismantling', 'Progress');
      Object.entries(stage2.componentConditionAssessment || {}).forEach(([compName, data]) => {
        addPhotos(data?.photos, 'Dismantling', compName);
      });
    }
    if (stage3) {
      addPhotos(stage3.photos, 'Assembly', 'Progress');
    }
    if (stage4) {
      addPhotos(stage4.photos, 'Testing', 'Testing view');
    }

    // Add any photos from the Photo collection not already included
    photos.forEach(p => {
      const photoPath = p.url || `/uploads/photos/${p.filename}`;
      if (!allPhotoPaths.has(photoPath)) {
        allPhotoPaths.add(photoPath);
        const stage = (p.stage || '').toLowerCase();
        let category = 'Overview';
        if (stage.includes('receive') || stage.includes('inspection')) category = 'Received Condition';
        else if (stage.includes('dismantl')) category = 'Dismantling';
        else if (stage.includes('assembl')) category = 'Assembly';
        else if (stage.includes('test')) category = 'Testing';

        categorizedPhotos.push({
          category,
          url: photoPath,
          caption: p.caption || '',
          order: categorizedPhotos.length
        });
      }
    });

    report.categorizedPhotos = categorizedPhotos;
    await report.save();

    return ApiResponse.success('Report photos synchronized successfully', report);
  }
}

// Export helpers for use in reportRoutes.js PDF generation
// until that section is also extracted
module.exports = {
  ReportService,
  getImageDimensions,
  getFailureAnalysisFallback,
  extractJsonFromAi,
  ensureStringFields,
  normalizeFailureAnalysis,
  generateFallbackDraft
};
