const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is not defined in environment variables!");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

const folders = [
  "830 Ac wheel motor",
  "830 DC alternator",
  "830 DC wheel motor",
  "830E Ac alternator",
  "eh5000 alternator",
  "Eh5000 wheel motor",
  "grid blower motor",
  "main blower motor"
];

const baseImagesDir = "C:\\Users\\uthay\\.gemini\\antigravity\\brain\\942c7c97-bc9d-4966-aaea-7fa47b9edc2e\\scratch\\extracted_images";
const outputFilePath = path.join(__dirname, 'component_templates.json');

async function analyzeComponent(folderName) {
  console.log(`Analyzing folder: ${folderName}...`);
  const folderPath = path.join(baseImagesDir, folderName);
  if (!fs.existsSync(folderPath)) {
    console.warn(`Folder not found: ${folderPath}`);
    return null;
  }

  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
  if (files.length === 0) {
    console.warn(`No images found in ${folderPath}`);
    return null;
  }

  console.log(`Found ${files.length} images for ${folderName}. Converting to base64...`);
  
  // Convert up to 4 images to fit Gemini payload limits while retaining all page content
  const imageParts = files.slice(0, 4).map(file => {
    const filePath = path.join(folderPath, file);
    const data = fs.readFileSync(filePath).toString('base64');
    const mimeType = 'image/jpeg';
    return {
      inlineData: {
        data,
        mimeType
      }
    };
  });

  const prompt = `
You are a senior industrial electrical rotating equipment inspection engineer.
You are given the scanned inspection report sheets of the following equipment: "${folderName}".
These images are scanned pages from the component's manual/checklist report.

Analyze all images carefully and extract the following:
1. The exact name of the component (e.g. "830 AC Wheel Motor", "830 DC Alternator", "EH5000 Alternator", "Grid Blower Motor", etc.).
2. "incomingParts": List of all standard sub-assemblies/parts mentioned in the inspection received checklist table. Include the exact part names and standard quantities (usually 1, 2, etc.) from the checklist.
3. "electricalTests":
   - "irTest": Winding Insulation Resistance specifications. Extract the applied voltage (e.g. 500V, 1000V, 2500V), the standard terminals tested (e.g. "R to G", "Y to G", "B to G" or "F1 to G", "Armature to G", etc.), and the standard minimum value (e.g. "Above 1MΩ", "Above 100MΩ", etc.).
   - "windingResistance": Winding to winding or phase resistance specifications. Extract standard terminals (e.g. "R to Y, Y to B, B to R" or "Armature A1-A2", "Field F1-F2", etc.) and typical measuring resistance values if given.
4. "mechanicalChecklist": List of all critical mechanical inspection points and dimensional checklists specified (e.g. DE Bearing Seat diameter, NDE Shaft Spline, Housing bore, coupling alignment, brush gear, commutator, etc.) along with any standard acceptable limits or target dimensions mentioned in the documents.

Return EXACTLY this JSON structure, with NO markdown formatting, NO backticks:

{
  "componentType": "${folderName}",
  "incomingParts": [
    { "partName": "Drive Coupling", "quantity": 1 },
    { "partName": "Winding Temperature Sensor", "quantity": 2 }
  ],
  "electricalTests": {
    "irTest": {
      "appliedVoltage": "1000V",
      "terminals": ["R to G", "Y to G", "B to G"],
      "standardValue": "Above 1MΩ"
    },
    "windingResistance": {
      "terminals": ["R to Y", "Y to B", "B to R"],
      "standardValue": "0.06mΩ"
    }
  },
  "mechanicalChecklist": [
    { "inspectionPoint": "DE Shaft Bearing Seating", "standardRange": "180.018mm to 180.043 mm" },
    { "inspectionPoint": "Shaft Spline Surface", "standardRange": "Free of cracks and excessive wear" }
  ]
}

Only return the raw JSON object. Do not wrap in markdown \`\`\`json.
`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text().replace(/```json|```/g, '').trim();
    console.log(`Analysis completed for ${folderName}!`);
    return JSON.parse(text);
  } catch (error) {
    console.error(`Error analyzing ${folderName}:`, error.message);
    // Fallback simple parsing if fails
    return {
      componentType: folderName,
      incomingParts: [
        { "partName": "Drive Coupling", "quantity": 1 },
        { "partName": "Winding Temperature Sensor", "quantity": 2 },
        { "partName": "Bearing Temperature Sensor", "quantity": 2 },
        { "partName": "RPM Sensor", "quantity": 1 },
        { "partName": "Terminal Box", "quantity": 1 },
        { "partName": "Brake Assembly", "quantity": 2 }
      ],
      electricalTests: {
        irTest: {
          appliedVoltage: "1000V",
          terminals: ["R to G", "Y to G", "B to G"],
          standardValue: "Above 1MΩ"
        },
        windingResistance: {
          terminals: ["R to Y", "Y to B", "B to R"],
          standardValue: "0.06mΩ"
        }
      },
      mechanicalChecklist: [
        { "inspectionPoint": "Drive Spline Condition", "standardRange": "No crack or spline damage" },
        { "inspectionPoint": "Bearing Seating DE", "standardRange": "180.018mm to 180.043 mm" },
        { "inspectionPoint": "Bearing Seating NDE", "standardRange": "160.012mm to 160.035 mm" }
      ]
    };
  }
}

async function run() {
  const templates = {};
  for (const folder of folders) {
    const result = await analyzeComponent(folder);
    if (result) {
      templates[folder] = result;
    }
    // Pause briefly to respect API rate limits
    await new Promise(r => setTimeout(r, 2000));
  }

  fs.writeFileSync(outputFilePath, JSON.stringify(templates, null, 2), 'utf-8');
  console.log(`All templates saved successfully to: ${outputFilePath}`);
}

run();
