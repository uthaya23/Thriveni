const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function listModels() {
  try {
    // There isn't a direct listModels in the standard SDK easily accessible like this
    // but we can try to initialize one and see if it works, or use the fetch API.
    const key = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
    console.log("Checking API Key:", key ? `Present (${key.substring(0,3)}...${key.substring(key.length-3)})` : "Missing");
    const genAI = new GoogleGenerativeAI(key);
    
    console.log("\nAttempting to list models via REST API...");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await response.json();
    if (data.models) {
      console.log("Available models:");
      data.models.forEach(m => console.log(` - ${m.name}`));
    } else {
      console.log("Could not list models:", JSON.stringify(data));
    }

    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
    for (const m of models) {
      try {
        console.log(`Testing model: ${m}...`);
        const model = genAI.getGenerativeModel({ model: m });
        const result = await model.generateContent("Hello");
        const response = await result.response;
        console.log(`✅ Success with ${m}:`, response.text().substring(0, 50));
      } catch (e) {
        console.log(`❌ Failed with ${m}:`, e.message);
      }
    }
  } catch (err) {
    console.error("Error details:", err);
  }
}

listModels();
