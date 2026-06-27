const fs = require('fs');
const path = require('path');
const templateEngineService = require('./templateEngineService');
const aiSummaryService = require('./aiSummaryService');

/**
 * Report Generation Service
 * Orchestrates template filling, AI content generation, and PDF export
 * CRITICAL: Only modifies content - layout, spacing, fonts remain unchanged
 */
class ReportGenerationService {
  constructor() {
    this.reportsDir = path.join(__dirname, '../generated-reports');
    this.uploadsDir = path.join(__dirname, '../uploads');
    this._ensureDirectories();
  }

  /**
   * Ensure necessary directories exist
   */
  _ensureDirectories() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  _mapPhotoArray(photoArray) {
    if (!Array.isArray(photoArray)) return [];
    return photoArray
      .filter((photo) => photo && (photo.image || photo.url || photo.path))
      .map((photo) => ({
        image: photo.image || photo.url || photo.path,
        caption: photo.caption || ''
      }));
  }

  _buildPartsTable(parts = []) {
    if (!Array.isArray(parts)) return [];
    return parts.map((part, index) => ({
      sNo: index + 1,
      description: part.itemName || part.partName || part || 'Not specified',
      quantity: part.quantity || 1,
      remarks: part.remark || part.remarks || 'Replaced or inspected'
    }));
  }

  _formatTimeline(events = []) {
    if (!Array.isArray(events)) return [];
    return events.map((entry, index) => ({
      sNo: index + 1,
      event: entry.title || entry.phase || `Step ${index + 1}`,
      description: entry.desc || entry.details || '',
      completed: entry.completed ? 'Yes' : 'No'
    }));
  }

  /**
   * Generate complete report from job data
   * @param {Object} jobData - Complete job data including job document and photos
   * @returns {Promise<Object>} Generated report info
   */
  async generateReport(jobData) {
    try {
      // Load template
      const templateBuffer = templateEngineService.loadTemplate();

      // Use provided summaries (from Draft Report) or generate new ones (legacy)
      const summaries = jobData.summaries || await aiSummaryService.generateAllSummaries(jobData);

      // Prepare data for placeholder replacement
      const reportData = this._prepareReportData(jobData, summaries);

      // Replace placeholders in template
      let docxBuffer = templateEngineService.generateDocxFromTemplate(templateBuffer, reportData);

      // Insert photos if available
      if (jobData.photos && Object.keys(jobData.photos).length > 0) {
        docxBuffer = this._insertPhotosIntoTemplate(docxBuffer, jobData.photos);
      }

      // Save DOCX
      const docxPath = await this._saveDocx(docxBuffer, jobData.jobNo);
      const reportUrl = `/api/reports/download/${jobData.jobNo}?format=docx`;

      return {
        success: true,
        jobNo: jobData.jobNo,
        docxPath,
        reportUrl,
        generatedAt: new Date().toISOString(),
        format: 'docx',
      };
    } catch (error) {
      console.error('Report Generation Error Details:', {
        message: error.message,
        stack: error.stack,
        jobNo: jobData.jobNo
      });
      throw new Error(`Report generation failed: ${error.message}`);
    }
  }

  /**
   * Prepare data for placeholder replacement
   * Maps job data and AI summaries to template placeholders
   * @param {Object} jobData - Job data
   * @param {Object} summaries - AI-generated summaries
   * @returns {Object} Data for template replacement
   */
  _prepareReportData(jobData, summaries) {
    const job = jobData.job || {};
    const equipment = jobData.equipment || {};
    const inspection = jobData.inspection || {};
    const dismantling = jobData.dismantling || {};
    const assembly = jobData.assembly || {};
    const testing = jobData.testing || {};

    return {
      // Job Information
      jobNo: job.jobNo || '',
      jobDate: job.jobDate || new Date().toISOString().split('T')[0],
      customerName: job.customerName || '',
      customerContact: job.customerContact || '',
      siteLocation: job.siteLocation || '',
      scopeOfWork: job.scopeOfWork || '',
      siteComplaints: job.customerComplaints || '',

      // Equipment Information
      equipmentModel: equipment.model || '',
      serialNumber: equipment.serialNumber || '',
      equipmentType: equipment.type || '',
      equipmentManufacturer: equipment.manufacturer || '',
      equipmentYearOfManufacture: equipment.yearOfManufacture || '',
      equipmentRunningHours: equipment.runningHours || '',

      // Inspection Details
      inspectionDate: inspection.date || new Date().toISOString().split('T')[0],
      inspectionFindings: summaries.inspectionFindings || 'Inspection completed.',
      inspectionObservations: inspection.observations || '',
      inspectionCondition: inspection.physicalCondition || '',
      inspectionElectrical: inspection.electricalCondition || '',
      inspectionMechanical: inspection.mechanicalCondition || '',
      inspectionPhotoGallery: this._mapPhotoArray(jobData.inspectionPhotos),
      receivedPhotoGallery: this._mapPhotoArray(jobData.receivedPhotos),

      // Dismantling Details
      dismantlingDate: dismantling.date || '',
      dismantlingSummary: summaries.partsConditionAnalysis || 'Dismantling work completed.',
      dismantlingPhotoGallery: this._mapPhotoArray(jobData.dismantlingPhotos),
      damagedPartsPhotoGallery: this._mapPhotoArray(jobData.damagedPartsPhotos),
      componentConditionTable: this._buildPartsTable(dismantling.componentConditionAssessment || []),

      // Assembly Details
      assemblyDate: assembly.date || '',
      assemblySummary: summaries.assemblyDescription || 'Assembly work completed.',
      repairedParts: assembly.repairedParts || '',
      workPerformed: summaries.workPerformed || job.workPerformed || '',
      changedParts: assembly.changedParts || '',
      assemblyPhotoGallery: this._mapPhotoArray(jobData.assemblyPhotos),
      installedPartsTable: this._buildPartsTable(assembly.newPartsInstalled || assembly.materialsUsed || []),

      // Testing Details
      testingDate: testing.date || '',
      testingSummary: summaries.testingSummary || 'Testing completed.',
      testResults: testing.results || '',
      irReadingsFormatted: this._formatIrValues(testing.irReadings),
      testingPhotoGallery: this._mapPhotoArray(jobData.testingPhotos),

      // Final / Dispatch Photos
      finalPhotoGallery: this._mapPhotoArray(jobData.finalPhotos),

      // Failure Analysis
      failureRootCause: summaries.failureAnalysis?.rootCause || '',
      failureEvidence: summaries.failureAnalysis?.evidence || '',
      failureImpact: summaries.failureAnalysis?.impact || '',
      failureRecommendedAction: summaries.failureAnalysis?.recommendedAction || '',

      // Conclusions and Recommendations
      conclusions: summaries.finalConclusion || 'Work completed successfully.',
      recommendations: summaries.recommendations || job.recommendations || '',

      // Technician Information
      technicianName: job.technicianName || '',
      technicianSignature: job.technicianSignature || '',
      supervisorName: job.supervisorName || '',
      supervisorSignature: job.supervisorSignature || '',

      // Report Metadata
      reportDate: new Date().toISOString().split('T')[0],
      reportGeneratedBy: 'Thriveni Report System',
      reportVersion: summaries.version || '1.0',
      reportStatus: summaries.status || 'Final Approved',
      reviewNotes: summaries.reviewNotes || '',
      approvalNotes: summaries.approvalNotes || ''
    };
  }

  /**
   * Format IR values for template
   * @param {Object} irReadings - IR test readings
   * @returns {string} Formatted IR values
   */
  _formatIrValues(irReadings) {
    if (!irReadings || Object.keys(irReadings).length === 0) {
      return 'Not measured';
    }

    return Object.entries(irReadings)
      .map(([phase, value]) => `${phase}: ${value}`)
      .join(' | ');
  }

  /**
   * Format resistance values for template
   * @param {Object} resistance - Resistance measurements
   * @returns {string} Formatted resistance values
   */
  _formatResistanceValues(resistance) {
    if (!resistance || Object.keys(resistance).length === 0) {
      return 'Not measured';
    }

    return Object.entries(resistance)
      .map(([phase, value]) => `${phase}: ${value}`)
      .join(' | ');
  }

  /**
   * Format removed parts for template
   * @param {Array} parts - Parts removed
   * @returns {string} Formatted parts list
   */
  _formatPartsRemoved(parts) {
    if (!Array.isArray(parts) || parts.length === 0) {
      return 'No parts removed';
    }

    return parts.map((part) => `• ${part}`).join('\n');
  }

  /**
   * Format installed parts for template
   * @param {Array} parts - Parts installed
   * @returns {string} Formatted parts list
   */
  _formatPartsInstalled(parts) {
    if (!Array.isArray(parts) || parts.length === 0) {
      return 'Standard assembly performed';
    }

    return parts.map((part) => `• ${part}`).join('\n');
  }

  /**
   * Insert photos into template (placeholder for image insertion)
   * @param {Buffer} docxBuffer - DOCX buffer
   * @param {Object} photos - Photo references
   * @returns {Buffer} Modified DOCX buffer
   */
  _insertPhotosIntoTemplate(docxBuffer, photos) {
    try {
      // Map photo categories to template image placeholders
      const imageMap = {};

      if (photos.receivedCondition && fs.existsSync(photos.receivedCondition)) {
        imageMap.photoReceivedCondition = photos.receivedCondition;
      }
      if (photos.inspection && fs.existsSync(photos.inspection)) {
        imageMap.photoInspection = photos.inspection;
      }
      if (photos.dismantling && fs.existsSync(photos.dismantling)) {
        imageMap.photoDismantling = photos.dismantling;
      }
      if (photos.damagedParts && fs.existsSync(photos.damagedParts)) {
        imageMap.photoDamagedParts = photos.damagedParts;
      }
      if (photos.assembly && fs.existsSync(photos.assembly)) {
        imageMap.photoAssembly = photos.assembly;
      }
      if (photos.testing && fs.existsSync(photos.testing)) {
        imageMap.photoTesting = photos.testing;
      }
      if (photos.finalCondition && fs.existsSync(photos.finalCondition)) {
        imageMap.photoFinalCondition = photos.finalCondition;
      }

      // Add user-specific aliases requested in the prompt
      if (photos.receivedCondition && fs.existsSync(photos.receivedCondition)) {
        imageMap.receivedPhoto1 = photos.receivedCondition;
      }
      if (photos.dismantling && fs.existsSync(photos.dismantling)) {
        imageMap.bearingPhoto = photos.dismantling;
        imageMap.rotorPhoto = photos.dismantling;
      }

      // Only insert images if map has entries
      if (Object.keys(imageMap).length > 0) {
        return templateEngineService.insertImages(docxBuffer, imageMap);
      }

      return docxBuffer;
    } catch (error) {
      console.error('Error inserting photos:', error);
      // Return original buffer if image insertion fails
      return docxBuffer;
    }
  }

  /**
   * Save DOCX file to disk
   * @param {Buffer} docxBuffer - DOCX file buffer
   * @param {string} jobNo - Job number for file naming
   * @returns {Promise<string>} Path to saved DOCX file
   */
  async _saveDocx(docxBuffer, jobNo) {
    const safeJobNo = String(jobNo).replace(/[^a-zA-Z0-9-]/g, '_');
    const filename = `Report_${safeJobNo}_${Date.now()}.docx`;
    const filepath = path.join(this.reportsDir, filename);

    try {
      fs.writeFileSync(filepath, docxBuffer);
      return filepath;
    } catch (error) {
      throw new Error(`Failed to save DOCX: ${error.message}`);
    }
  }


  /**
   * Get generated report file
   * @param {string} jobNo - Job number
   * @returns {Promise<Buffer>} File buffer
   */
  async getReportFile(jobNo, format = 'pdf') {
    try {
      const safeJobNo = String(jobNo).replace(/[^a-zA-Z0-9-]/g, '_');
      const files = fs.readdirSync(this.reportsDir);
      
      // Filter matching files and sort by timestamp descending (newest first)
      const matchingFiles = files
        .filter((file) => file.includes(`Report_${safeJobNo}`) && file.endsWith(`.${format}`))
        .sort((a, b) => {
          // Extract timestamps from filename Report_JobNo_Timestamp.docx
          const timeA = parseInt(a.split('_').pop().split('.')[0]) || 0;
          const timeB = parseInt(b.split('_').pop().split('.')[0]) || 0;
          return timeB - timeA;
        });

      const reportFile = matchingFiles[0];

      if (!reportFile) {
        throw new Error(`Report not found for job ${safeJobNo}`);
      }

      const filepath = path.join(this.reportsDir, reportFile);
      return fs.readFileSync(filepath);
    } catch (error) {
      throw new Error(`Failed to retrieve report: ${error.message}`);
    }
  }

  /**
   * List generated reports
   * @returns {Array} List of report files
   */
  listGeneratedReports() {
    try {
      if (!fs.existsSync(this.reportsDir)) {
        return [];
      }

      return fs.readdirSync(this.reportsDir).sort((a, b) => {
        const statA = fs.statSync(path.join(this.reportsDir, a));
        const statB = fs.statSync(path.join(this.reportsDir, b));
        return statB.mtime - statA.mtime;
      });
    } catch (error) {
      console.error('Failed to list reports:', error);
      return [];
    }
  }
}

module.exports = new ReportGenerationService();
