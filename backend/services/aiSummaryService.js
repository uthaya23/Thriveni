const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

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
      return `Equipment ${inspectionData.equipmentModel} inspected on ${inspectionData.inspectionDate}. Physical and operational inspection completed.`;
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
      return `Equipment was systematically dismantled. Components inspected and condition documented.`;
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
      return `Equipment was reassembled following engineering standards. All components properly aligned and secured.`;
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
      return `Testing completed according to engineering standards. Equipment performance documented and evaluated.`;
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
      return `CONCLUSION: Work completed successfully. Equipment operational and ready for deployment.

RECOMMENDATIONS:
- Continue regular maintenance schedule
- Monitor equipment performance during operation
- Schedule follow-up inspection as needed`;
    }
  }

  /**
   * Diagnostic to list available models
   */
  async checkModels() {
    if (!this.client) return;
    try {
      // In @google/generative-ai, listModels is not on the genAI instance directly in all versions
      // We might need to check if it's supported or use a different approach
      console.log('--- AI MODEL DIAGNOSTIC START ---');
      console.log('API Key:', this.apiKey ? 'PRESENT (First 5 chars: ' + this.apiKey.substring(0, 5) + '...)' : 'MISSING');

      // Attempting to list models if supported
      if (typeof this.client.listModels === 'function') {
        const result = await this.client.listModels();
        console.log('AVAILABLE MODELS:');
        result.models.forEach(m => console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`));
      } else {
        console.log('Note: listModels() is not directly available on this SDK version instance. Testing connection with gemini-1.5-flash...');
      }
      console.log('--- AI MODEL DIAGNOSTIC END ---');
    } catch (err) {
      console.error('--- AI DIAGNOSTIC FAILED ---');
      console.error('Error:', err.message);
      console.log('---------------------------');
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

    const modelNames = ['gemini-flash-latest', 'gemini-2.5-flash'];
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

    const modelNames = ['gemini-flash-latest', 'gemini-2.5-flash'];
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
      const modelNames = ['gemini-flash-latest', 'gemini-1.1', 'gemini-flash-lite-latest'];
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
      return {
        inspectionFindings: 'Inspection assessment completed. Condition noted and documented.',
        dismantlingSummary: 'Dismantling work executed and findings documented.',
        assemblySummary: 'Reassembly completed following standard procedures.',
        testingSummary: 'Final testing performed and results recorded.',
        conclusions: 'Work completed successfully. Equipment condition verified and documented.',
      };
    }
  }
}

module.exports = new AISummaryService();
