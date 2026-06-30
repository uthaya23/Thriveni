const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');

/**
 * AI Summary Service
 * Generates professional engineering content from job data
 * Creates natural language summaries for inspection findings, recommendations, etc.
 */
class AISummaryService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (this.apiKey) {
      this.client = new GoogleGenerativeAI(this.apiKey);
      this.checkModels();
    } else {
      this.client = null;
      console.warn('GEMINI_API_KEY is not configured. Report generation will use fallback summary text.');
    }
  }

  /**
   * Generate inspection findings summary
   * @param {Object} inspectionData - Inspection details
   * @returns {Promise<string>} Generated findings text
   */
  async generateInspectionFindings(inspectionData) {
    const prompt = `
Based on the following inspection data, write a professional engineering inspection findings summary.
Keep it concise, technical, and specific to the equipment condition.

Equipment Model: ${inspectionData.equipmentModel || 'Not specified'}
Serial Number: ${inspectionData.serialNumber || 'Not specified'}
Inspection Date: ${inspectionData.inspectionDate || 'Not specified'}
Customer Complaint: ${inspectionData.customerComplaint || 'Not specified'}
Physical Condition: ${inspectionData.physicalCondition || 'Not specified'}
Electrical Condition: ${inspectionData.electricalCondition || 'Not specified'}
Mechanical Condition: ${inspectionData.mechanicalCondition || 'Not specified'}

Write a professional inspection findings paragraph (2-3 sentences) that summarizes the current condition.
Focus on actionable observations.
    `;

    try {
      return await this._callGemini(prompt);
    } catch (error) {
      console.error('Error generating inspection findings:', error);
      return `Inspection of ${inspectionData.equipmentModel || 'equipment'} (Serial: ${inspectionData.serialNumber || 'not recorded'}) completed on ${inspectionData.inspectionDate || 'not recorded'}. Customer complaint: ${inspectionData.customerComplaint || 'not recorded'}. [AI unavailable — engineer review required.]`;
    }
  }

  /**
   * Generate dismantling summary
   * @param {Object} dismantlingData - Dismantling work details
   * @returns {Promise<string>} Generated dismantling summary
   */
  async generateDismantlingSummary(dismantlingData) {
    const prompt = `
Based on the following dismantling work, write a professional engineering dismantling summary.

Equipment Dismantled: ${dismantlingData.equipmentType || 'Not specified'}
Date of Dismantling: ${dismantlingData.date || 'Not specified'}
Parts Removed: ${dismantlingData.partsRemoved || 'Not specified'}
Condition Found: ${dismantlingData.conditionFound || 'Not specified'}
Issues Discovered: ${dismantlingData.issues || 'Not specified'}

Write a professional summary (2-3 sentences) of the dismantling work performed.
Include what was found and condition of removed parts.
    `;

    try {
      return await this._callGemini(prompt);
    } catch (error) {
      console.error('Error generating dismantling summary:', error);
      return `Dismantling of ${dismantlingData.equipmentType || 'equipment'} completed on ${dismantlingData.date || 'not recorded'}. Condition findings recorded in stage data. [AI unavailable — engineer review required.]`;
    }
  }

  /**
   * Generate assembly summary
   * @param {Object} assemblyData - Assembly work details
   * @returns {Promise<string>} Generated assembly summary
   */
  async generateAssemblySummary(assemblyData) {
    const prompt = `
Based on the following assembly work, write a professional engineering assembly summary.

Equipment Type: ${assemblyData.equipmentType || 'Not specified'}
Date of Assembly: ${assemblyData.date || 'Not specified'}
New Parts Installed: ${assemblyData.newPartsInstalled || 'Not specified'}
Repaired Parts: ${assemblyData.repairedParts || 'Not specified'}
Alignment/Calibration: ${assemblyData.alignmentDetails || 'Not specified'}

Write a professional summary (2-3 sentences) of the assembly and installation work performed.
Include all major components assembled and any calibration performed.
    `;

    try {
      return await this._callGemini(prompt);
    } catch (error) {
      console.error('Error generating assembly summary:', error);
      return `Assembly of ${assemblyData.equipmentType || 'equipment'} completed on ${assemblyData.date || 'not recorded'}. Components installed as per job requirements. [AI unavailable — engineer review required.]`;
    }
  }

  /**
   * Generate testing summary with results
   * @param {Object} testingData - Testing results
   * @returns {Promise<string>} Generated testing summary
   */
  async generateTestingSummary(testingData) {
    const prompt = `
Based on the following testing results, write a professional engineering testing summary.

Equipment: ${testingData.equipmentModel || 'Not specified'}
Test Date: ${testingData.date || 'Not specified'}
Tests Performed: ${testingData.testsPerformed || 'Not specified'}
IR Readings (if applicable): ${testingData.irReadings || 'Not specified'}
Resistance Measurements: ${testingData.resistance || 'Not specified'}
Pass/Fail Status: ${testingData.status || 'Not specified'}
Comments: ${testingData.comments || 'Not specified'}

Write a professional testing summary (2-3 sentences) including test methodology and key results.
    `;

    try {
      return await this._callGemini(prompt);
    } catch (error) {
      console.error('Error generating testing summary:', error);
      return `Final testing of ${testingData.equipmentModel || 'equipment'} completed on ${testingData.date || 'not recorded'}. Test status: ${testingData.status || 'not recorded'}. [AI unavailable — engineer review required.]`;
    }
  }

  /**
   * Generate final conclusions and recommendations
   * @param {Object} jobSummary - Complete job summary data
   * @returns {Promise<string>} Generated conclusions and recommendations
   */
  async generateConclusions(jobSummary) {
    const prompt = `
Based on the complete job summary, write professional engineering conclusions and recommendations.

Job Number: ${jobSummary.jobNo || 'Not specified'}
Equipment: ${jobSummary.equipmentModel || 'Not specified'}
Work Performed: ${jobSummary.workPerformed || 'Not specified'}
Issues Found: ${jobSummary.issuesFound || 'Not specified'}
Repairs Completed: ${jobSummary.repairsCompleted || 'Not specified'}
Current Status: ${jobSummary.currentStatus || 'Not specified'}

Write:
1. A professional conclusion (2-3 sentences) summarizing the work and current condition
2. Recommendations (2-3 bullet points) for maintenance and operation

Format as:
CONCLUSION: [text]

RECOMMENDATIONS:
- [recommendation 1]
- [recommendation 2]
- [recommendation 3]
    `;

    try {
      return await this._callGemini(prompt);
    } catch (error) {
      console.error('Error generating conclusions:', error);
      return `CONCLUSION: Rebuild work for job ${jobSummary.jobNo || 'not recorded'} on ${jobSummary.equipmentModel || 'equipment'} has been completed through all workshop stages. Current status: ${jobSummary.currentStatus || 'not recorded'}. [AI unavailable — engineer must complete this section.]\n\nRECOMMENDATIONS:\n- Engineer to review all stage findings before report finalisation\n- Verify test results against OEM specifications\n- Confirm QA sign-off before customer dispatch`;
    }
  }

  /**
   * Diagnostic to list available models
   */
  async checkModels() {
    if (!this.client) return;
    try {
      Logger.debug('AI service initialised', {
        apiKeyPresent: !!this.apiKey
      });

      if (typeof this.client.listModels === 'function') {
        const result = await this.client.listModels();
        Logger.debug('Gemini models available', {
          count: result.models.length
        });
      }
    } catch (err) {
      Logger.warn('AI model diagnostic failed', { error: err.message });
    }
  }

  /**
   * Analyze inspection images using Gemini Vision
   * @param {Array<string>} imagePaths - Paths to the images to analyze
   * @returns {Promise<Object>} Analyzed findings (externalCondition, damageNotes, initialFindings)
   */
  async analyzeInspectionImages(imagePaths, motorType = 'Component', customDetails = '') {
    if (!this.client) throw new Error('Gemini API key is not configured.');
    if (!imagePaths || imagePaths.length === 0) throw new Error('No images provided for analysis.');

    const modelNames = ['gemini-2.5-flash', 'gemini-flash-latest'];
    const apiVersions = ['v1beta', 'v1'];
    let lastError;

    for (const apiVersion of apiVersions) {
      for (const modelName of modelNames) {
        try {
          const model = this.client.getGenerativeModel(
            { model: modelName },
            { apiVersion }
          );

          // Convert images to generative parts
          const imageParts = imagePaths.map(p => {
            let data;
            let mimeType;

            if (p.startsWith('data:image')) {
              const matches = p.match(/^data:([^;]+);base64,(.+)$/);
              if (!matches) throw new Error('Invalid base64 image format');
              mimeType = matches[1];
              data = matches[2];
            } else {
              const fullPath = path.join(__dirname, '..', p);
              const fileBuffer = fs.readFileSync(fullPath);
              mimeType = p.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
              data = fileBuffer.toString('base64');
            }

            return {
              inlineData: {
                data,
                mimeType
              }
            };
          });

          const prompt = `
You are a senior industrial electrical rotating equipment inspection engineer.

Analyze the uploaded workshop inspection images of the ${motorType}.

${customDetails ? `Technician Notes: ${customDetails}` : ''}

Generate a PROFESSIONAL INDUSTRIAL PRELIMINARY INSPECTION ANALYSIS.

STRICT RULES:
- Use short engineering statements.
- Do NOT exaggerate.
- Do NOT use dramatic language.
- Do NOT use words like "critical", "severe", "substantial risk", "catastrophic".
- Keep findings realistic and workshop-professional.
- Focus only on visible conditions.
- Do NOT assume internal damage unless visually evident.
- Use proper industrial terminology.
- Keep every field concise and readable.
- Output must be valid JSON only.

Return EXACTLY this JSON structure:

{
  "externalCondition": "",
  "damageObservations": "",
  "detailedFindings": ""
}

FIELD REQUIREMENTS:

externalCondition:
- Maximum 25 words.
- Overall visible condition only.

Example:
"Motor exterior shows dust accumulation, corrosion marks, and missing terminal box cover."

damageObservations:
- Bullet-style short observations separated by newline.
- Maximum 5 points.

Example:
"- Terminal box cover missing
- Surface corrosion observed
- Oil contamination near DE side"

detailedFindings:
- Professional engineering observations.
- Maximum 4 concise points.
- Format EXACTLY like this:

OBSERVATION: Visible dirt accumulation on cooling fins.
INFERENCE: Indicates prolonged operation in contaminated environment.

OBSERVATION: Terminal studs exposed.
INFERENCE: Electrical protection components missing.

Only describe visible workshop inspection findings.
`;
          const result = await model.generateContent([prompt, ...imageParts]);
          const response = await result.response;
          const text = response.text().replace(/```json|```/g, '').trim();
          return JSON.parse(text);
        } catch (error) {
          lastError = error;
          console.warn(`Model ${modelName} (${apiVersion}) failed for vision analysis:`, error.message);
          continue;
        }
      }
    }

  throw new Error(`AI Image Analysis failed after trying all models: ${lastError?.message}`);
  }

  /**
   * Analyze a specific component's condition using vision + remarks
   * @param {string} componentName - Name of the component (e.g. Rotor, Bearings)
   * @param {Array<string>} photos - Photos of the component
   * @param {string} remarks - Technician notes/observations
   * @returns {Promise<string>} Concise professional summary
   */
  async analyzeComponentCondition(componentName, photos, remarks = '') {
    if (!this.client) throw new Error('Gemini API key is not configured.');
    
    // Normalize photos input to a flat array of strings
    let photosList = [];
    if (Array.isArray(photos)) {
      photosList = photos.flat(Infinity);
    } else if (typeof photos === 'string') {
      photosList = [photos];
    }
    
    // Filter out non-string/empty paths
    photosList = photosList.filter(p => typeof p === 'string' && p.trim() !== '');

    if (photosList.length === 0) return remarks || 'No visual data available.';

    // Convert images to generative parts
    const imageParts = photosList.map(p => {
      try {
        let data;
        let mimeType;

        if (p.startsWith('data:image')) {
          const matches = p.match(/^data:([^;]+);base64,(.+)$/);
          if (!matches) return null;
          mimeType = matches[1];
          data = matches[2];
        } else {
          // Normalize path by stripping host if absolute URL
          let cleanPath = p;
          if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
            try {
              const urlObj = new URL(cleanPath);
              cleanPath = urlObj.pathname;
            } catch (urlErr) {}
          }
          if (cleanPath.startsWith('/')) {
            cleanPath = cleanPath.substring(1);
          }
          
          const fullPath = path.resolve(__dirname, '..', cleanPath);
          if (!fs.existsSync(fullPath)) {
            console.warn(`[AI Component Analysis] File not found: ${fullPath}`);
            return null;
          }

          const fileBuffer = fs.readFileSync(fullPath);
          mimeType = cleanPath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
          data = fileBuffer.toString('base64');
        }

        return {
          inlineData: {
            data,
            mimeType
          }
        };
      } catch (err) {
        console.error('[AI Component Analysis] Error processing image:', err);
        return null;
      }
    }).filter(p => p !== null);

    const prompt = `
You are an expert rotating equipment engineer.
Analyze the provided photo(s) of the following component: ${componentName}.
Technician Remarks: ${remarks}

Generate a PROFESSIONAL, CONCISE engineering summary of the component's condition.
Combine the visual evidence from the photo with the technician's remarks.

STRICT RULES:
- Maximum 30 words.
- Use technical, non-dramatic language.
- Focus on technical state (e.g. "Surface shows moderate pitting", "Insulation appears thermally degraded").
- Output only the summary text.
`;

    const modelNames = ['gemini-2.5-flash', 'gemini-flash-latest'];
    const apiVersions = ['v1beta', 'v1'];
    let lastError;

    for (const apiVersion of apiVersions) {
      for (const modelName of modelNames) {
        try {
          const model = this.client.getGenerativeModel(
            { model: modelName },
            { apiVersion }
          );
          // If no images resolved successfully, we can still generate analysis using text prompt
          const contentPayload = imageParts.length > 0 ? [prompt, ...imageParts] : [prompt];
          const result = await model.generateContent(contentPayload);
          const response = await result.response;
          return response.text().trim();
        } catch (error) {
          lastError = error;
          console.warn(`Model ${modelName} (${apiVersion}) failed for component analysis:`, error.message);
          continue;
        }
      }
    }

    console.error(`AI Component Analysis failed for ${componentName}:`, lastError?.message);
    return remarks || 'Analysis unavailable.';
  }

  /**
   * Call Gemini API
   * @param {string} prompt - The prompt to send
   * @returns {Promise<string>} The generated response
   */
  async _callGemini(prompt) {
    if (!this.client) {
      throw new Error('Gemini API key is not configured.');
    }

    try {
      const modelNames = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-flash-lite-latest'];
      let lastError;

      for (const modelName of modelNames) {
        try {
          const model = this.client.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          const response = await result.response;
          return response.text();
        } catch (error) {
          lastError = error;
          console.warn(`Gemini model ${modelName} failed, trying next fallback...`, error.message);
        }
      }

      throw new Error(`Gemini API error: ${lastError?.message || 'no supported models available'}`);
    } catch (error) {
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }

  /**
   * Generate fallback summaries using real job data
   * Called when Gemini API is unavailable
   * Never invents findings - only uses actual recorded data
   */
  _generateFallbackSummaries(jobData) {
    const job = jobData.job || jobData;
    const stage1 = jobData.stage1 || {};
    const stage2 = jobData.stage2 || {};
    const stage3 = jobData.stage3 || {};
    const stage4 = jobData.stage4 || {};

    // Build inspection findings from real stage1 data
    const inspectionTechnician = stage1.technician || 'Assigned technician';
    const inspectionDecision = stage1.inspectionDecision || 'Pending';
    const inspectionDecisionReason = stage1.inspectionDecisionReason || '';
    const inspectionRemarks = stage1.overallRemarks || '';

    const electricalTestKeys = Object.keys(stage1.electricalTests || {});
    const electricalSummary = electricalTestKeys.length > 0
      ? `${electricalTestKeys.length} electrical test(s) recorded including ${electricalTestKeys.slice(0, 3).join(', ')}.`
      : 'Electrical tests recorded.';

    const inspectionFindings =
      `Visual and electrical inspection performed by ${inspectionTechnician}. ` +
      `${electricalSummary} ` +
      `Inspection decision: ${inspectionDecision}. ` +
      `${inspectionDecisionReason ? 'Reason: ' + inspectionDecisionReason + '.' : ''} ` +
      `${inspectionRemarks ? 'Remarks: ' + inspectionRemarks : ''} ` +
      `[AI unavailable — engineer review required for this section.]`.trim();

    // Build dismantling summary from real stage2 data
    const dismantlingTechnician = stage2.technician || 'Assigned technician';
    const dismantlingRemarks = stage2.overallRemarks || '';

    const componentKeys = Object.keys(stage2.componentConditionAssessment || {});
    const componentSummary = componentKeys.length > 0
      ? `Component condition assessed for: ${componentKeys.slice(0, 4).join(', ')}.`
      : 'Component conditions assessed.';

    const dismantlingSummary =
      `Dismantling performed by ${dismantlingTechnician}. ` +
      `${componentSummary} ` +
      `${dismantlingRemarks ? 'Remarks: ' + dismantlingRemarks : ''} ` +
      `[AI unavailable — engineer review required for this section.]`.trim();

    // Build assembly summary from real stage3 data
    const assemblyTechnician = stage3.technician || 'Assigned technician';
    const assemblyRemarks = stage3.overallRemarks || '';

    const materialsUsed = stage3.materialsUsed || [];
    const materialSummary = materialsUsed.length > 0
      ? `${materialsUsed.length} material(s) used including ${materialsUsed.slice(0, 3).map(m => m.name).filter(Boolean).join(', ')}.`
      : 'Materials used as per job requirement.';

    const torqueKeys = Object.keys(stage3.torqueVerifications || {});
    const torqueSummary = torqueKeys.length > 0
      ? `Torque verified for ${torqueKeys.length} point(s) including ${torqueKeys.slice(0, 3).join(', ')}.`
      : 'Torque verifications completed.';

    const assemblySummary =
      `Assembly performed by ${assemblyTechnician}. ` +
      `${materialSummary} ` +
      `${torqueSummary} ` +
      `${assemblyRemarks ? 'Remarks: ' + assemblyRemarks : ''} ` +
      `[AI unavailable — engineer review required for this section.]`.trim();

    // Build testing summary from real stage4 data
    const testingTechnician = stage4.technician || 'Assigned technician';
    const testingRemarks = stage4.overallRemarks || '';
    const qaApprovedBy = stage4.qaApprovedBy || '';
    const qaApprovedDate = stage4.qaApprovedDate || '';

    const finalElectricalKeys = Object.keys(stage4.electricalTests || {});
    const finalElectricalSummary = finalElectricalKeys.length > 0
      ? `${finalElectricalKeys.length} final electrical test(s) performed including ${finalElectricalKeys.slice(0, 3).join(', ')}.`
      : 'Final electrical tests performed.';

    const functionalKeys = Object.keys(stage4.functionalTests || {});
    const functionalSummary = functionalKeys.length > 0
      ? `${functionalKeys.length} functional test(s) completed including ${functionalKeys.slice(0, 3).join(', ')}.`
      : 'Functional tests completed.';

    const testingSummary =
      `Final testing performed by ${testingTechnician}. ` +
      `${finalElectricalSummary} ` +
      `${functionalSummary} ` +
      `${qaApprovedBy ? 'QA approved by ' + qaApprovedBy + (qaApprovedDate ? ' on ' + qaApprovedDate : '') + '.' : 'QA approval pending.'} ` +
      `${testingRemarks ? 'Remarks: ' + testingRemarks : ''} ` +
      `[AI unavailable — engineer review required for this section.]`.trim();

    // Build conclusions from real job data
    const jobNo = job.jobNo || 'Not recorded';
    const equipmentModel = job.equipmentModel || 'Not recorded';
    const serialNumber = job.serialNumber || 'Not recorded';
    const description = job.description || 'Not recorded';

    const conclusions =
      `CONCLUSION: Rebuild job ${jobNo} for ${equipmentModel} ` +
      `(Serial: ${serialNumber}) has been processed through all workshop stages. ` +
      `Work scope: ${description}. ` +
      `All stage data has been recorded in the system. ` +
      `AI-generated conclusion unavailable — engineer must review and complete this section before report finalisation.\n\n` +
      `RECOMMENDATIONS:\n` +
      `- Engineer to review all stage findings and complete AI sections manually\n` +
      `- Verify all electrical test values against OEM specifications before dispatch\n` +
      `- Confirm QA approval is recorded before releasing to customer`;

    return {
      inspectionFindings,
      dismantlingSummary,
      assemblySummary,
      testingSummary,
      conclusions
    };
  }

  /**
   * Generate all required summaries for a job
   * @param {Object} jobData - Complete job data
   * @returns {Promise<Object>} Object with all generated summaries
   */
  async generateAllSummaries(jobData) {
    try {
      const [
        inspectionFindings,
        dismantlingSummary,
        assemblySummary,
        testingSummary,
        conclusions,
      ] = await Promise.all([
        this.generateInspectionFindings(jobData.inspection || {}),
        this.generateDismantlingSummary(jobData.dismantling || {}),
        this.generateAssemblySummary(jobData.assembly || {}),
        this.generateTestingSummary(jobData.testing || {}),
        this.generateConclusions(jobData),
      ]);

      return {
        inspectionFindings,
        dismantlingSummary,
        assemblySummary,
        testingSummary,
        conclusions,
      };
    } catch (error) {
      console.error('AI summary generation failed, using fallback text:', error.message);
      return this._generateFallbackSummaries(jobData);
    }
  }
}

module.exports = new AISummaryService();
