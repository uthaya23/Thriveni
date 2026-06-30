const express = require('express');
const router = express.Router();
const resolveJobId = require('../middleware/resolveJobId');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
const JobData = require('../models/JobData');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const ApiResponse = require('../utils/apiResponse');

router.post('/analyze-photos/:jobId', resolveJobId('jobId'), async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json(ApiResponse.error('Gemini API is not configured on the server.', 500));
    }

    const { jobId } = req.params;
    const { stage } = req.body; // e.g., 'stage1'

    if (!stage) {
      return res.status(400).json(ApiResponse.badRequest('Stage parameter is required (e.g. stage1)'));
    }

    const jobData = await JobData.findOne({ job: jobId });
    if (!jobData) {
      return res.status(404).json(ApiResponse.notFound('Job data not found'));
    }

    // ── If stage is stage2, perform component condition assessment analysis ──
    if (stage === 'stage2') {
      const assessment = jobData.stage2?.componentConditionAssessment || {};
      let updated = false;
      const results = {};

      for (const [compName, compData] of Object.entries(assessment)) {
        if (!compData || !compData.photos || compData.photos.length === 0) {
          continue;
        }

        // If this component already has AI summary, skip it (unless forced or just load it)
        if (compData.aiSummary) {
          results[compName] = compData.aiSummary;
          continue;
        }

        // Read files (Local or Remote)
        const imageParts = [];
        for (const photoUrl of compData.photos.slice(0, 3)) {
          try {
            if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
              const fetchOptions = photoUrl.includes('vercel-storage.com') 
                ? { headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` } } 
                : {};
              const resp = await fetch(photoUrl, fetchOptions);
              if (resp.ok) {
                const arrayBuffer = await resp.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const mimeType = resp.headers.get('content-type') || 'image/jpeg';
                imageParts.push({ inlineData: { data: buffer.toString('base64'), mimeType } });
              }
            } else {
              const relativePath = photoUrl.startsWith('/') ? photoUrl.substring(1) : photoUrl;
              const filePath = path.join(__dirname, '..', relativePath);
              if (fs.existsSync(filePath)) {
                const fileData = fs.readFileSync(filePath).toString('base64');
                const ext = path.extname(filePath).toLowerCase();
                const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
                imageParts.push({ inlineData: { data: fileData, mimeType } });
              }
            }
          } catch (err) {
            console.warn(`Error reading photo file for ${compName}:`, photoUrl, err.message);
          }
        }

        if (imageParts.length > 0) {
          try {
            const prompt = `
You are an expert heavy machinery inspection engineer.
Review the following photos of the component "${compName}" taken during the dismantling and condition assessment phase.
Analyze and describe:
1. The physical condition of this component (e.g. wear, rust, cracks, burns, contamination, physical damage).
2. Whether it looks rebuildable/repairable or needs replacement.

Keep the summary professional, concise and precise (2 short sentences). Output plain text only. No markdown, no bullet points.
`;
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const result = await model.generateContent([prompt, ...imageParts]);
            const responseText = (await result.response.text()).trim();

            // Save back
            compData.aiSummary = responseText;
            jobData.markModified('stage2.componentConditionAssessment');
            updated = true;
            results[compName] = responseText;
          } catch (apiErr) {
            console.error(`Gemini call failed for ${compName}:`, apiErr.message);
          }
        }
      }

      if (updated) {
        await jobData.save();
      }

      return res.json(ApiResponse.success('AI component analysis retrieved', { analysis: results, cached: !updated }));
    }

    // ── If aiSummary already saved, return it immediately (no re-analysis) ──
    if (jobData[stage]?.aiSummary) {
      return res.json(ApiResponse.success('AI summary retrieved from cache', { analysis: jobData[stage].aiSummary, cached: true }));
    }

    const photos = jobData[stage]?.photos || [];
    if (!photos || photos.length === 0) {
      return res.status(400).json(ApiResponse.badRequest('No overall photos found to analyze in this stage.'));
    }

    // Convert files (Local or Remote) to base64 (max 4 images)
    const imageParts = [];
    for (const photoUrl of photos.slice(0, 4)) {
      try {
        if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
          const fetchOptions = photoUrl.includes('vercel-storage.com') 
            ? { headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` } } 
            : {};
          const resp = await fetch(photoUrl, fetchOptions);
          if (resp.ok) {
            const arrayBuffer = await resp.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const mimeType = resp.headers.get('content-type') || 'image/jpeg';
            imageParts.push({ inlineData: { data: buffer.toString('base64'), mimeType } });
          }
        } else {
          const relativePath = photoUrl.startsWith('/') ? photoUrl.substring(1) : photoUrl;
          const filePath = path.join(__dirname, '..', relativePath);
          if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath).toString('base64');
            const ext = path.extname(filePath).toLowerCase();
            const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
            imageParts.push({ inlineData: { data, mimeType } });
          }
        }
      } catch (err) {
        console.warn('Error reading photo file:', photoUrl, err.message);
      }
    }

    if (imageParts.length === 0) {
      return res.status(400).json(ApiResponse.badRequest('Could not read any valid photo files on the server.'));
    }

    const prompt = `
You are an expert heavy machinery inspection engineer evaluating equipment condition.
Review the following images of an industrial component taken during the incoming inspection phase.
Identify and describe:
1. Overall external condition (rust, dirt, wear, paint condition, general cleanliness).
2. Any visible signs of damage, missing parts, cracks, or abnormalities.
3. Specific notable issues that an engineer should investigate further.

Keep the summary professional, concise and precise (2-3 short sentences). Output plain text only. No markdown, no bullet points.
`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent([prompt, ...imageParts]);
    const responseText = (await result.response.text()).trim();

    // ── Save the result directly to DB so it's only generated once ──
    jobData[stage].aiSummary = responseText;
    await jobData.save();

    res.json(ApiResponse.success('AI analysis completed', { analysis: responseText, cached: false }));
  } catch (error) {
    console.error('AI Analysis Error:', error.message);
    res.status(500).json(ApiResponse.error(error.message || 'Failed to generate AI analysis'));
  }
});

module.exports = router;
